import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Eye,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { supabase, formatearFecha } from '../../lib/supabase';
import {
  LiquidacionComision,
  PeriodoComision,
  formatearMonedaComision,
  formatearPeriodo,
  DetalleCalculoComision,
  formatearPorcentaje,
} from '../../types/comisiones';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LiquidacionesViewProps {
  currentUser: { id: number; nombre: string; rol: string };
}

const LiquidacionesView: React.FC<LiquidacionesViewProps> = ({
  currentUser,
}) => {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionComision[]>([]);
  const [periodosCalculados, setPeriodosCalculados] = useState<
    PeriodoComision[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [verDetalle, setVerDetalle] = useState<{
    liquidacion: LiquidacionComision | null;
    detalles: DetalleCalculoComision[];
  }>({ liquidacion: null, detalles: [] });
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] =
    useState<LiquidacionComision | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: liqData, error: liqError } = await supabase
        .from('liquidaciones_comision')
        .select(
          `*, usuarios:vendedor_id(nombre), generado_por_usuario:generado_por(nombre)`
        )
        .order('fecha_liquidacion', { ascending: false });
      if (liqError) throw liqError;

      const { data: perData, error: perError } = await supabase
        .from('periodos_comision')
        .select(`*, usuarios:vendedor_id(nombre)`)
        .eq('estado', 'calculado')
        .order('periodo_inicio');
      if (perError) throw perError;

      setLiquidaciones((liqData as any) || []);
      setPeriodosCalculados((perData as any) || []);
    } catch (error) {
      console.error('Error cargando datos de liquidaciones:', error);
      alert('Hubo un error al cargar los datos. Revise la consola.');
    } finally {
      setLoading(false);
    }
  };

  const generarLiquidacion = async (periodo: PeriodoComision) => {
    setGenerando(periodo.id);
    try {
      const { data: vendedor } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', periodo.vendedor_id)
        .single();
      if (!vendedor) throw new Error('Vendedor no encontrado');

      const { data: movimientos } = await supabase
        .from('movimientos')
        .select(`*`)
        .eq('vendedor_id', periodo.vendedor_id)
        .gte('fecha', periodo.periodo_inicio)
        .lte('fecha', periodo.periodo_fin);
      if (!movimientos)
        throw new Error('No se encontraron movimientos para este período');

      const numeroRecibo = `LIQ-${Date.now().toString().slice(-6)}`;

      const liquidacionData: Omit<
        LiquidacionComision,
        'id' | 'created_at' | 'usuarios' | 'generado_por_usuario'
      > = {
        periodo_id: periodo.id,
        vendedor_id: periodo.vendedor_id,
        numero_recibo: numeroRecibo,
        fecha_liquidacion: new Date().toISOString().split('T')[0],
        periodo_inicio: periodo.periodo_inicio,
        periodo_fin: periodo.periodo_fin,
        total_ventas: movimientos
          .filter((m) => m.tipo_movimiento === 'Venta')
          .reduce((sum, m) => sum + m.importe, 0),
        total_pagos: movimientos
          .filter((m) => m.tipo_movimiento === 'Pago')
          .reduce((sum, m) => sum + Math.abs(m.importe), 0),
        base_calculo: periodo.total_base,
        porcentaje_aplicado: vendedor.comision_porcentaje,
        comision_bruta: periodo.total_comision,
        total_adelantos: periodo.total_adelantos || 0,
        total_pagos_mano: periodo.total_pagos_mano || 0,
        // 🆕 INCLUIR LOS OTROS DESCUENTOS
        otros_descuentos: (periodo as any).otros_descuentos || 0,
        concepto_descuentos: (periodo as any).concepto_descuentos || null,
        saldo_liquido: periodo.saldo_liquido,
        generado_por: currentUser.id,
      };

      const { data: liquidacion, error: liqError } = await supabase
        .from('liquidaciones_comision')
        .insert([liquidacionData as any])
        .select()
        .single();
      if (liqError) throw liqError;

      const detallesData = movimientos
        .map((mov) => {
          let aplica = false;
          let montoComisionable = 0;
          if (
            (mov.tipo_movimiento === 'Venta' &&
              (vendedor.comision_base === 'ventas' ||
                vendedor.comision_base === 'ambos')) ||
            (mov.tipo_movimiento === 'Pago' &&
              (vendedor.comision_base === 'pagos' ||
                vendedor.comision_base === 'ambos'))
          ) {
            aplica = true;
            montoComisionable =
              mov.tipo_movimiento === 'Venta'
                ? mov.importe
                : Math.abs(mov.importe);
          }
          if (!aplica) return null;

          return {
            liquidacion_id: liquidacion.id,
            cliente_id: mov.cliente_id,
            movimiento_id: mov.id,
            fecha_movimiento: mov.fecha,
            tipo_movimiento: mov.tipo_movimiento,
            documento: mov.documento,
            monto_movimiento: mov.importe,
            aplica_comision: aplica,
            monto_comisionable: montoComisionable,
            porcentaje: vendedor.comision_porcentaje,
            comision_calculada:
              montoComisionable * (vendedor.comision_porcentaje / 100),
          };
        })
        .filter((d): d is Exclude<typeof d, null> => d !== null);

      if (detallesData.length > 0) {
        const { error: detallesError } = await supabase
          .from('detalles_comision')
          .insert(detallesData as any);
        if (detallesError) throw detallesError;
      }

      await supabase
        .from('periodos_comision')
        .update({ estado: 'liquidado', liquidado_en: new Date().toISOString() })
        .eq('id', periodo.id);
      alert(`✅ Liquidación ${numeroRecibo} generada.`);
      loadData();
    } catch (error: any) {
      alert(`❌ Error generando liquidación: ${error.message}`);
    } finally {
      setGenerando(null);
    }
  };

  const handleEliminarLiquidacion = async (
    liquidacion: LiquidacionComision
  ) => {
    if (currentUser.rol.toLowerCase() !== 'admin') {
      alert('❌ Solo los administradores pueden eliminar liquidaciones');
      return;
    }
    setMostrarConfirmacion(liquidacion);
  };

  const confirmarEliminacion = async () => {
    if (!mostrarConfirmacion) return;

    setEliminando(mostrarConfirmacion.id);
    try {
      console.log(
        '🗑️ Eliminando liquidación:',
        mostrarConfirmacion.numero_recibo
      );

      const { error: detallesError } = await supabase
        .from('detalles_comision')
        .delete()
        .eq('liquidacion_id', mostrarConfirmacion.id);

      if (detallesError) {
        console.error('Error eliminando detalles:', detallesError);
        throw new Error(`Error eliminando detalles: ${detallesError.message}`);
      }

      const { error: liquidacionError } = await supabase
        .from('liquidaciones_comision')
        .delete()
        .eq('id', mostrarConfirmacion.id);

      if (liquidacionError) {
        console.error('Error eliminando liquidación:', liquidacionError);
        throw new Error(
          `Error eliminando liquidación: ${liquidacionError.message}`
        );
      }

      const { error: periodoError } = await supabase
        .from('periodos_comision')
        .update({
          estado: 'calculado',
          liquidado_en: null,
        })
        .eq('id', mostrarConfirmacion.periodo_id);

      if (periodoError) {
        console.error('Error actualizando período:', periodoError);
        throw new Error(`Error actualizando período: ${periodoError.message}`);
      }

      console.log('✅ Liquidación eliminada correctamente');
      alert(
        `✅ Liquidación ${mostrarConfirmacion.numero_recibo} eliminada correctamente.\nEl período ha vuelto al estado "calculado".`
      );

      setMostrarConfirmacion(null);
      loadData();
    } catch (error: any) {
      console.error('❌ Error eliminando liquidación:', error);
      alert(`❌ Error al eliminar la liquidación:\n\n${error.message}`);
    } finally {
      setEliminando(null);
    }
  };

  const handleVerDetalle = async (liquidacion: LiquidacionComision) => {
    setLoadingDetalle(true);
    setVerDetalle({ liquidacion, detalles: [] });
    try {
      const { data, error } = await supabase
        .from('detalles_comision')
        .select(
          `
            *,
            clientes:cliente_id (
              id,
              razon_social
            )
          `
        )
        .eq('liquidacion_id', liquidacion.id)
        .order('fecha_movimiento');

      if (error) throw error;
      setVerDetalle({ liquidacion, detalles: data as any[] });
    } catch (error: any) {
      console.error('❌ Error cargando detalles:', error);
      alert('Error al cargar los detalles: ' + error.message);
      setVerDetalle({ liquidacion: null, detalles: [] });
    } finally {
      setLoadingDetalle(false);
    }
  };

  // 🔧 FUNCIÓN generarPDF MEJORADA - CORREGIDA PARA CARGAR DETALLES
  const generarPDF = async (
    liquidacion: LiquidacionComision,
    detallesParam?: DetalleCalculoComision[]
  ) => {
    // 🔧 CARGAR DETALLES CON CLIENTES SI NO SE PASARON
    let detalles = detallesParam;
    if (!detalles || detalles.length === 0) {
      try {
        const { data, error } = await supabase
          .from('detalles_comision')
          .select(`*, clientes:cliente_id(razon_social)`)
          .eq('liquidacion_id', liquidacion.id);

        if (error) throw error;
        detalles = (data as any[]) || [];
      } catch (error) {
        console.error('Error cargando detalles para PDF:', error);
        detalles = [];
      }
    }
    const doc = new jsPDF();

    // Header de la empresa
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FERABEN SRL', 14, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'RUT: 020522780010 | Tel: 097998999 | Email: ferabensrl@gmail.com',
      14,
      30
    );

    // Título del documento
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE COMISIONES', 14, 45);

    // Información básica en formato más compacto como tu Excel
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Vendedor:', 14, 60);
    doc.setFont('helvetica', 'normal');
    doc.text((liquidacion as any).usuarios?.nombre || 'N/A', 50, 60);

    doc.setFont('helvetica', 'bold');
    doc.text('Desde:', 120, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(formatearFecha(liquidacion.periodo_inicio), 145, 60);

    doc.setFont('helvetica', 'bold');
    doc.text('% Comisión:', 14, 68);
    doc.setFont('helvetica', 'normal');
    doc.text(`${liquidacion.porcentaje_aplicado}%`, 50, 68);

    doc.setFont('helvetica', 'bold');
    doc.text('Hasta:', 120, 68);
    doc.setFont('helvetica', 'normal');
    doc.text(formatearFecha(liquidacion.periodo_fin), 145, 68);

    doc.setFont('helvetica', 'bold');
    doc.text(`Recibo: ${liquidacion.numero_recibo}`, 14, 76);
    doc.text(
      `Fecha: ${formatearFecha(liquidacion.fecha_liquidacion)}`,
      120,
      76
    );

    // 🆕 TABLA DETALLADA POR CLIENTE (COMO TU EXCEL)
    if (detalles.length > 0) {
      autoTable(doc, {
        startY: 85,
        head: [
          [
            'Fecha',
            'Cliente',
            'Importe Cobrado',
            'Comisión Generada',
            'Comentario',
          ],
        ],
        body: detalles.map((d) => [
          formatearFecha(d.fecha_movimiento),
          (d as any).clientes?.razon_social || 'Cliente no encontrado',
          formatearMonedaComision(d.monto_comisionable),
          formatearMonedaComision(d.comision_calculada),
          '0', // Comentario, puedes agregar lógica aquí si tienes comentarios
        ]),
        headStyles: {
          fillColor: [70, 130, 180],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 25 }, // Fecha
          1: { cellWidth: 70 }, // Cliente
          2: { cellWidth: 30, halign: 'right' }, // Importe
          3: { cellWidth: 30, halign: 'right' }, // Comisión
          4: { cellWidth: 25, halign: 'center' }, // Comentario
        },
        didParseCell: function (data) {
          // Colorear importes y comisiones
          if (data.column.index === 2 || data.column.index === 3) {
            data.cell.styles.textColor = [0, 100, 0]; // Verde para montos
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    }

    const lastTableY = (doc as any).lastAutoTable
      ? (doc as any).lastAutoTable.finalY
      : 85;

    // 🆕 RESUMEN FINAL CON DESCUENTOS (COMO TU EXCEL)
    const yStart = lastTableY + 15;

    // Línea separadora
    doc.setDrawColor(150, 150, 150);
    doc.line(14, yStart - 5, 196, yStart - 5);

    // 🔧 MOSTRAR LA BASE DE CÁLCULO Y COMISIÓN BRUTA PRIMERO
    let yPos = yStart;

    doc.setFont('helvetica', 'normal');
    doc.text('Base de Cálculo', 14, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(formatearMonedaComision(liquidacion.base_calculo), 140, yPos, {
      align: 'right',
    });
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.text(
      `Comisión Bruta (${formatearPorcentaje(liquidacion.porcentaje_aplicado)})`,
      14,
      yPos
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 150, 0); // Verde
    doc.text(formatearMonedaComision(liquidacion.comision_bruta), 140, yPos, {
      align: 'right',
    });
    doc.setTextColor(0, 0, 0); // Reset color
    yPos += 10;

    // 🔧 DESCUENTOS - VERIFICAR CADA UNO POR SEPARADO
    let hayDescuentos = false;

    // Adelantos de comisión
    if (liquidacion.total_adelantos && liquidacion.total_adelantos > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('(-) Adelantos de Comisión', 14, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0); // Rojo
      doc.text(
        `-${formatearMonedaComision(liquidacion.total_adelantos)}`,
        140,
        yPos,
        { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
      yPos += 8;
      hayDescuentos = true;
    }

    // Pagos en mano
    if (liquidacion.total_pagos_mano && liquidacion.total_pagos_mano > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('(-) Pagos en Mano de Clientes', 14, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text(
        `-${formatearMonedaComision(liquidacion.total_pagos_mano)}`,
        140,
        yPos,
        { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
      yPos += 8;
      hayDescuentos = true;
    }

    // 🔧 OTROS DESCUENTOS - MEJORAR LA VERIFICACIÓN
    const otrosDescuentos = (liquidacion as any).otros_descuentos;
    if (otrosDescuentos && otrosDescuentos > 0) {
      const conceptoTexto =
        (liquidacion as any).concepto_descuentos || 'Otros Descuentos';
      doc.setFont('helvetica', 'normal');
      doc.text(`(-) ${conceptoTexto}`, 14, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text(`-${formatearMonedaComision(otrosDescuentos)}`, 140, yPos, {
        align: 'right',
      });
      doc.setTextColor(0, 0, 0);
      yPos += 8;
      hayDescuentos = true;
    }

    // Espacio extra si hay descuentos
    if (hayDescuentos) {
      yPos += 2;
    }

    // Línea separadora antes del total
    doc.setDrawColor(100, 100, 100);
    doc.line(14, yPos + 2, 196, yPos + 2);
    yPos += 10;

    // TOTAL FINAL
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL', 14, yPos);
    doc.setTextColor(0, 150, 0); // Verde
    doc.text(formatearMonedaComision(liquidacion.saldo_liquido), 140, yPos, {
      align: 'right',
    });
    doc.setTextColor(0, 0, 0);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generado el ${formatearFecha(new Date().toISOString().split('T')[0])} por ${currentUser.nombre}`,
      14,
      yPos + 20
    );

    doc.save(`Liquidacion_${liquidacion.numero_recibo}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin mr-2" /> Cargando liquidaciones...
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Liquidaciones de Comisión
      </h2>

      {periodosCalculados.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Períodos Listos para Liquidar
          </h3>
          <div className="bg-white rounded-lg shadow">
            {periodosCalculados.map((periodo) => (
              <div
                key={periodo.id}
                className="p-4 border-b last:border-b-0 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold">
                    {(periodo as any).usuarios?.nombre}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatearPeriodo(
                      periodo.periodo_inicio,
                      periodo.periodo_fin
                    )}
                  </p>
                  {/* 🆕 MOSTRAR TODOS LOS DESCUENTOS EN LA PREVIEW */}
                  {(periodo.total_adelantos > 0 ||
                    periodo.total_pagos_mano > 0 ||
                    ((periodo as any).otros_descuentos &&
                      (periodo as any).otros_descuentos > 0)) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {periodo.total_adelantos > 0 && (
                        <span className="mr-3">
                          Adelantos:{' '}
                          {formatearMonedaComision(periodo.total_adelantos)}
                        </span>
                      )}
                      {periodo.total_pagos_mano > 0 && (
                        <span className="mr-3">
                          Pagos en mano:{' '}
                          {formatearMonedaComision(periodo.total_pagos_mano)}
                        </span>
                      )}
                      {(periodo as any).otros_descuentos &&
                        (periodo as any).otros_descuentos > 0 && (
                          <span>
                            Otros:{' '}
                            {formatearMonedaComision(
                              (periodo as any).otros_descuentos
                            )}
                          </span>
                        )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-green-600">
                    {formatearMonedaComision(periodo.saldo_liquido)}
                  </span>
                  <button
                    onClick={() => generarLiquidacion(periodo)}
                    disabled={generando === periodo.id}
                    className="bg-green-600 text-white px-3 py-2 rounded-md text-sm flex items-center"
                  >
                    {generando === periodo.id ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <FileText size={16} className="mr-2" />
                    )}{' '}
                    Generar Liquidación
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Recibo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vendedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Período
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Monto Liquidado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {liquidaciones.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                  <p>No hay liquidaciones generadas aún.</p>
                </td>
              </tr>
            ) : (
              liquidaciones.map((liquidacion) => (
                <tr key={liquidacion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {liquidacion.numero_recibo}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatearFecha(liquidacion.fecha_liquidacion)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">
                      {(liquidacion as any).usuarios?.nombre || 'N/A'}
                    </div>
                    {/* 🆕 MOSTRAR TODOS LOS DESCUENTOS EN LA TABLA */}
                    {(liquidacion.total_adelantos > 0 ||
                      liquidacion.total_pagos_mano > 0 ||
                      ((liquidacion as any).otros_descuentos &&
                        (liquidacion as any).otros_descuentos > 0)) && (
                      <div className="text-xs text-gray-500">
                        {liquidacion.total_adelantos > 0 && (
                          <div>
                            Adelantos: -
                            {formatearMonedaComision(
                              liquidacion.total_adelantos
                            )}
                          </div>
                        )}
                        {liquidacion.total_pagos_mano > 0 && (
                          <div>
                            P. en mano: -
                            {formatearMonedaComision(
                              liquidacion.total_pagos_mano
                            )}
                          </div>
                        )}
                        {(liquidacion as any).otros_descuentos &&
                          (liquidacion as any).otros_descuentos > 0 && (
                            <div>
                              Otros: -
                              {formatearMonedaComision(
                                (liquidacion as any).otros_descuentos
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatearPeriodo(
                      liquidacion.periodo_inicio,
                      liquidacion.periodo_fin
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="font-bold text-green-600 text-lg">
                      {formatearMonedaComision(liquidacion.saldo_liquido)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Comisión:{' '}
                      {formatearMonedaComision(liquidacion.comision_bruta)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <button
                        onClick={() => handleVerDetalle(liquidacion)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded"
                        title="Ver detalle"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => generarPDF(liquidacion)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                        title="Descargar PDF"
                      >
                        <Download size={18} />
                      </button>
                      {currentUser.rol.toLowerCase() === 'admin' && (
                        <button
                          onClick={() => handleEliminarLiquidacion(liquidacion)}
                          disabled={eliminando === liquidacion.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 p-1 rounded"
                          title="Eliminar liquidación"
                        >
                          {eliminando === liquidacion.id ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación para eliminar */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-red-600 flex items-center">
                <AlertTriangle className="mr-2" size={20} />
                Confirmar Eliminación
              </h3>
              <button onClick={() => setMostrarConfirmacion(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-900 font-medium mb-2">
                  ¿Estás seguro de eliminar esta liquidación?
                </p>
                <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
                  <div>
                    <strong>Recibo:</strong> {mostrarConfirmacion.numero_recibo}
                  </div>
                  <div>
                    <strong>Vendedor:</strong>{' '}
                    {(mostrarConfirmacion as any).usuarios?.nombre || 'N/A'}
                  </div>
                  <div>
                    <strong>Período:</strong>{' '}
                    {formatearPeriodo(
                      mostrarConfirmacion.periodo_inicio,
                      mostrarConfirmacion.periodo_fin
                    )}
                  </div>
                  <div>
                    <strong>Monto:</strong>{' '}
                    {formatearMonedaComision(mostrarConfirmacion.saldo_liquido)}
                  </div>
                  {mostrarConfirmacion.total_adelantos > 0 && (
                    <div>
                      <strong>Adelantos:</strong>{' '}
                      {formatearMonedaComision(
                        mostrarConfirmacion.total_adelantos
                      )}
                    </div>
                  )}
                  {mostrarConfirmacion.total_pagos_mano > 0 && (
                    <div>
                      <strong>Pagos en mano:</strong>{' '}
                      {formatearMonedaComision(
                        mostrarConfirmacion.total_pagos_mano
                      )}
                    </div>
                  )}
                  {/* 🆕 MOSTRAR OTROS DESCUENTOS EN LA CONFIRMACIÓN */}
                  {(mostrarConfirmacion as any).otros_descuentos &&
                    (mostrarConfirmacion as any).otros_descuentos > 0 && (
                      <div>
                        <strong>Otros descuentos:</strong>{' '}
                        {formatearMonedaComision(
                          (mostrarConfirmacion as any).otros_descuentos
                        )}
                      </div>
                    )}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm">
                  <strong>⚠️ Advertencia:</strong> Esta acción eliminará la
                  liquidación y todos sus detalles. El período volverá al estado
                  "calculado" y podrás generar una nueva liquidación.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setMostrarConfirmacion(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={eliminando !== null}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminacion}
                  disabled={eliminando !== null}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {eliminando === mostrarConfirmacion.id ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2" size={16} />
                      Confirmar Eliminación
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 MODAL DE DETALLE MEJORADO CON TODOS LOS DESCUENTOS */}
      {verDetalle.liquidacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold">
                Detalle Liquidación - {verDetalle.liquidacion.numero_recibo}
              </h3>
              <button
                onClick={() =>
                  setVerDetalle({ liquidacion: null, detalles: [] })
                }
              >
                <X />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {loadingDetalle ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <strong>Vendedor:</strong>{' '}
                      {(verDetalle.liquidacion as any).usuarios?.nombre ||
                        'N/A'}
                    </div>
                    <div>
                      <strong>Período:</strong>{' '}
                      {formatearPeriodo(
                        verDetalle.liquidacion.periodo_inicio,
                        verDetalle.liquidacion.periodo_fin
                      )}
                    </div>
                    <div>
                      <strong>Fecha Liquidación:</strong>{' '}
                      {formatearFecha(verDetalle.liquidacion.fecha_liquidacion)}
                    </div>
                    <div>
                      <strong>Comisión Bruta:</strong>{' '}
                      {formatearMonedaComision(
                        verDetalle.liquidacion.comision_bruta
                      )}
                    </div>

                    {/* 🆕 MOSTRAR TODOS LOS DESCUENTOS DETALLADOS EN EL MODAL */}
                    {verDetalle.liquidacion.total_adelantos > 0 && (
                      <div>
                        <strong>(-) Adelantos:</strong>{' '}
                        <span className="text-red-600">
                          -
                          {formatearMonedaComision(
                            verDetalle.liquidacion.total_adelantos
                          )}
                        </span>
                      </div>
                    )}
                    {verDetalle.liquidacion.total_pagos_mano > 0 && (
                      <div>
                        <strong>(-) Pagos en Mano:</strong>{' '}
                        <span className="text-red-600">
                          -
                          {formatearMonedaComision(
                            verDetalle.liquidacion.total_pagos_mano
                          )}
                        </span>
                      </div>
                    )}

                    {/* 🆕 AGREGAR OTROS DESCUENTOS CON CONCEPTO DETALLADO */}
                    {(verDetalle.liquidacion as any).otros_descuentos &&
                      (verDetalle.liquidacion as any).otros_descuentos > 0 && (
                        <div className="col-span-2">
                          <strong>(-) Otros Descuentos:</strong>{' '}
                          <span className="text-red-600">
                            -
                            {formatearMonedaComision(
                              (verDetalle.liquidacion as any).otros_descuentos
                            )}
                          </span>
                          {(verDetalle.liquidacion as any)
                            .concepto_descuentos && (
                            <div className="text-xs text-gray-600 mt-1 italic">
                              <em>
                                Concepto:{' '}
                                {
                                  (verDetalle.liquidacion as any)
                                    .concepto_descuentos
                                }
                              </em>
                            </div>
                          )}
                        </div>
                      )}

                    <div className="font-bold text-lg col-span-2 border-t pt-2 mt-2">
                      <strong>SALDO LÍQUIDO:</strong>{' '}
                      <span className="text-green-600">
                        {formatearMonedaComision(
                          verDetalle.liquidacion.saldo_liquido
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 🔧 TABLA MEJORADA COMO TU EXCEL */}
                  <h4 className="font-semibold mb-2 text-gray-800 flex items-center">
                    <FileText size={16} className="mr-2" />
                    Detalle por Cliente ({verDetalle.detalles.length}{' '}
                    movimientos)
                  </h4>
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-blue-600 text-white sticky top-0">
                        <tr>
                          <th className="p-3 text-left font-semibold">Fecha</th>
                          <th className="p-3 text-left font-semibold">
                            Cliente
                          </th>
                          <th className="p-3 text-right font-semibold">
                            Importe Cobrado
                          </th>
                          <th className="p-3 text-right font-semibold">
                            Comisión Generada
                          </th>
                          <th className="p-3 text-center font-semibold">
                            Comentario
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {verDetalle.detalles.map((d, index) => (
                          <tr
                            key={d.movimiento_id}
                            className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                          >
                            <td className="p-3 text-gray-900">
                              {formatearFecha(d.fecha_movimiento)}
                            </td>
                            <td className="p-3 font-medium text-gray-900">
                              {(d as any).clientes?.razon_social || 'N/A'}
                            </td>
                            <td className="p-3 text-right font-bold text-blue-600">
                              {formatearMonedaComision(d.monto_comisionable)}
                            </td>
                            <td className="p-3 text-right font-bold text-green-600">
                              {formatearMonedaComision(d.comision_calculada)}
                            </td>
                            <td className="p-3 text-center text-gray-500">0</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 🆕 RESUMEN VISUAL COMO TU EXCEL */}
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
                    <h5 className="font-semibold text-gray-800 mb-3">
                      Resumen de Liquidación
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Base de Cálculo:</span>
                        <span className="font-medium">
                          {formatearMonedaComision(
                            verDetalle.liquidacion.base_calculo
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          Comisión Bruta (
                          {formatearPorcentaje(
                            verDetalle.liquidacion.porcentaje_aplicado
                          )}
                          ):
                        </span>
                        <span className="font-medium text-green-600">
                          {formatearMonedaComision(
                            verDetalle.liquidacion.comision_bruta
                          )}
                        </span>
                      </div>

                      {/* Descuentos detallados */}
                      {verDetalle.liquidacion.total_adelantos > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>(-) Adelantos de Comisión:</span>
                          <span className="font-medium">
                            -
                            {formatearMonedaComision(
                              verDetalle.liquidacion.total_adelantos
                            )}
                          </span>
                        </div>
                      )}
                      {verDetalle.liquidacion.total_pagos_mano > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>(-) Pagos en Mano de Clientes:</span>
                          <span className="font-medium">
                            -
                            {formatearMonedaComision(
                              verDetalle.liquidacion.total_pagos_mano
                            )}
                          </span>
                        </div>
                      )}
                      {(verDetalle.liquidacion as any).otros_descuentos &&
                        (verDetalle.liquidacion as any).otros_descuentos >
                          0 && (
                          <div className="flex justify-between text-red-600">
                            <span>
                              (-){' '}
                              {(verDetalle.liquidacion as any)
                                .concepto_descuentos || 'Otros Descuentos'}
                              :
                            </span>
                            <span className="font-medium">
                              -
                              {formatearMonedaComision(
                                (verDetalle.liquidacion as any).otros_descuentos
                              )}
                            </span>
                          </div>
                        )}

                      <hr className="my-2" />
                      <div className="flex justify-between text-lg font-bold">
                        <span>TOTAL:</span>
                        <span className="text-green-600">
                          {formatearMonedaComision(
                            verDetalle.liquidacion.saldo_liquido
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => generarPDF(verDetalle.liquidacion!)}
                className="bg-red-600 text-white px-4 py-2 rounded-md flex items-center"
              >
                <Printer size={16} className="mr-2" /> Imprimir PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidacionesView;
