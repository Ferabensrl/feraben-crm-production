import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Eye,
  Plus,
  Loader2,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  PeriodoComision,
  CalculoComision,
  formatearMonedaComision,
  formatearPorcentaje,
  formatearPeriodo,
  DetalleCalculoComision,
} from '../../types/comisiones';
import { FormularioPeriodo } from './FormularioPeriodo';

interface ComisionesViewProps {
  currentUser: { id: number; nombre: string; rol: string };
}

const ComisionesView: React.FC<ComisionesViewProps> = ({ currentUser }) => {
  const [periodos, setPeriodos] = useState<PeriodoComision[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState<number | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [showFormulario, setShowFormulario] = useState(false);
  const [calculosDetallados, setCalculosDetallados] = useState<
    Record<number, CalculoComision>
  >({});

  useEffect(() => {
    loadPeriodos();
  }, [currentUser]);

  const loadPeriodos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('periodos_comision')
        .select(
          `*, usuarios:vendedor_id (nombre, comision_porcentaje, comision_base)`
        )
        .order('periodo_inicio', { ascending: false });
      if (currentUser.rol === 'vendedor') {
        query = query.eq('vendedor_id', currentUser.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setPeriodos(data || []);
    } finally {
      setLoading(false);
    }
  };

  const calcularComision = async (
    periodo: PeriodoComision,
    paraVista: boolean = false
  ) => {
    setCalculando(periodo.id);
    try {
      const { data: vendedor } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', periodo.vendedor_id)
        .single();
      if (!vendedor) throw new Error('Vendedor no encontrado');

      const { data: movimientos } = await supabase
        .from('movimientos')
        .select(`*, clientes:cliente_id (razon_social)`)
        .eq('vendedor_id', periodo.vendedor_id)
        .gte('fecha', periodo.periodo_inicio)
        .lte('fecha', periodo.periodo_fin);
      if (!movimientos) return;

      let baseCalculo = 0;
      let totalVentas = 0;
      let totalPagos = 0;

      const detallesComision: DetalleCalculoComision[] = movimientos.map(
        (mov: any) => {
          let aplica = false;
          let montoComisionable = 0;

          if (mov.tipo_movimiento === 'Venta') {
            totalVentas += mov.importe;
            if (
              vendedor.comision_base === 'ventas' ||
              vendedor.comision_base === 'ambos'
            ) {
              aplica = true;
              montoComisionable = mov.importe;
            }
          } else if (mov.tipo_movimiento === 'Pago') {
            totalPagos += Math.abs(mov.importe);
            if (
              vendedor.comision_base === 'pagos' ||
              vendedor.comision_base === 'ambos'
            ) {
              aplica = true;
              montoComisionable = Math.abs(mov.importe);
            }
          }

          if (aplica) {
            baseCalculo += montoComisionable;
          }

          return {
            cliente_id: mov.cliente_id,
            cliente_nombre: mov.clientes?.razon_social || 'N/A',
            movimiento_id: mov.id,
            fecha_movimiento: mov.fecha,
            tipo_movimiento: mov.tipo_movimiento,
            documento: mov.documento,
            monto_movimiento: mov.importe,
            monto_comisionable: aplica ? montoComisionable : 0,
            porcentaje: vendedor.comision_porcentaje,
            comision_calculada: aplica
              ? montoComisionable * (vendedor.comision_porcentaje / 100)
              : 0,
            aplica_comision: aplica,
          };
        }
      );

      const comisionBruta = baseCalculo * (vendedor.comision_porcentaje / 100);

      // 🆕 CALCULAR SALDO LÍQUIDO CON DESCUENTOS
      const totalAdelantos = periodo.total_adelantos || 0;
      const totalPagosMano = periodo.total_pagos_mano || 0;
      const otrosDescuentos = periodo.otros_descuentos || 0;
      const saldoLiquido =
        comisionBruta - totalAdelantos - totalPagosMano - otrosDescuentos;

      const calculoCompleto: CalculoComision = {
        vendedor_id: periodo.vendedor_id,
        vendedor_nombre: vendedor.nombre,
        periodo_inicio: periodo.periodo_inicio,
        periodo_fin: periodo.periodo_fin,
        comision_porcentaje: vendedor.comision_porcentaje,
        comision_base: vendedor.comision_base,
        total_ventas: totalVentas,
        total_pagos: totalPagos,
        base_calculo: baseCalculo,
        comision_bruta: comisionBruta,
        // 🆕 INCLUIR DESCUENTOS EN EL CÁLCULO
        total_adelantos: totalAdelantos,
        total_pagos_mano: totalPagosMano,
        otros_descuentos: otrosDescuentos,
        saldo_liquido: saldoLiquido,
        detalles: detallesComision.filter((d) => d.aplica_comision),
      };

      if (paraVista) {
        setCalculosDetallados((prev) => ({
          ...prev,
          [periodo.id]: calculoCompleto,
        }));
        setExpandido(periodo.id);
        return;
      }

      // Actualizar el período con los valores calculados
      await supabase
        .from('periodos_comision')
        .update({
          total_base: baseCalculo,
          total_comision: comisionBruta,
          saldo_liquido: saldoLiquido,
          estado: 'calculado',
          calculado_en: new Date().toISOString(),
        })
        .eq('id', periodo.id);

      alert(
        `✅ Comisión calculada para ${vendedor.nombre}.\n💰 Comisión bruta: ${formatearMonedaComision(comisionBruta)}\n💵 Saldo líquido: ${formatearMonedaComision(saldoLiquido)}`
      );
      loadPeriodos();
    } catch (error: any) {
      alert(`❌ ERROR EN CÁLCULO: ${error.message}`);
    } finally {
      setCalculando(null);
    }
  };

  const toggleDetalle = async (periodo: PeriodoComision) => {
    if (expandido === periodo.id) {
      setExpandido(null);
    } else {
      if (!calculosDetallados[periodo.id]) {
        await calcularComision(periodo, true);
      } else {
        setExpandido(periodo.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin mr-2" /> Cargando períodos...
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {currentUser.rol === 'admin'
            ? 'Gestión de Comisiones'
            : 'Mis Comisiones'}
        </h2>
        {currentUser.rol === 'admin' && (
          <button
            onClick={() => setShowFormulario(true)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center"
          >
            <Plus size={20} className="mr-2" /> Nuevo Período
          </button>
        )}
      </div>

      {periodos.length === 0 ? (
        <div className="text-center bg-white p-12 rounded-lg shadow">
          <Calculator size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            No hay períodos de comisión
          </h3>
          <p className="text-gray-500 mt-1">
            {currentUser.rol === 'admin'
              ? 'Crea un nuevo período para empezar a calcular comisiones.'
              : 'El administrador aún no ha creado períodos de comisión.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {periodos.map((periodo) => (
            <div
              key={periodo.id}
              className="bg-white rounded-lg shadow transition-all duration-300"
            >
              <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="mb-4 md:mb-0">
                    <h3 className="font-bold text-lg text-gray-800">
                      {periodo.usuarios?.nombre || 'Vendedor no encontrado'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatearPeriodo(
                        periodo.periodo_inicio,
                        periodo.periodo_fin
                      )}
                    </p>

                    {/* 🆕 MOSTRAR DESCUENTOS EN LA TARJETA */}
                    {(periodo.total_adelantos > 0 ||
                      periodo.total_pagos_mano > 0 ||
                      (periodo.otros_descuentos &&
                        periodo.otros_descuentos > 0)) && (
                      <div className="mt-2 space-x-3 text-xs text-gray-500">
                        {periodo.total_adelantos > 0 && (
                          <span className="inline-flex items-center bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            <DollarSign size={12} className="mr-1" />
                            Adelantos:{' '}
                            {formatearMonedaComision(periodo.total_adelantos)}
                          </span>
                        )}
                        {periodo.total_pagos_mano > 0 && (
                          <span className="inline-flex items-center bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            <CreditCard size={12} className="mr-1" />
                            P. en mano:{' '}
                            {formatearMonedaComision(periodo.total_pagos_mano)}
                          </span>
                        )}
                        {periodo.otros_descuentos &&
                          periodo.otros_descuentos > 0 && (
                            <span className="inline-flex items-center bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              Otros:{' '}
                              {formatearMonedaComision(
                                periodo.otros_descuentos
                              )}
                            </span>
                          )}
                      </div>
                    )}

                    <span
                      className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        periodo.estado === 'pendiente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : periodo.estado === 'calculado'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {periodo.estado.charAt(0).toUpperCase() +
                        periodo.estado.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto">
                    {periodo.estado === 'calculado' && (
                      <div className="text-right">
                        <div className="text-green-600 text-lg font-bold">
                          {formatearMonedaComision(periodo.saldo_liquido)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Saldo líquido
                        </div>
                      </div>
                    )}
                    {periodo.estado === 'pendiente' &&
                      currentUser.rol === 'admin' && (
                        <button
                          onClick={() => calcularComision(periodo)}
                          disabled={calculando === periodo.id}
                          className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm w-full md:w-auto flex items-center justify-center"
                        >
                          {calculando === periodo.id ? (
                            <Loader2 className="animate-spin mr-2" />
                          ) : (
                            <Calculator size={16} className="mr-2" />
                          )}{' '}
                          Calcular
                        </button>
                      )}
                    <button
                      onClick={() => toggleDetalle(periodo)}
                      className="p-2 rounded-md hover:bg-gray-100"
                      title="Ver detalle"
                    >
                      {calculando === periodo.id && expandido !== periodo.id ? (
                        <Loader2 className="animate-spin text-gray-600" />
                      ) : (
                        <Eye size={20} className="text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {expandido === periodo.id && calculosDetallados[periodo.id] && (
                <div className="border-t p-4 md:p-6 bg-gray-50">
                  <h4 className="font-semibold mb-4 text-gray-800">
                    Detalle del Cálculo
                  </h4>

                  {/* 🆕 DESGLOSE DETALLADO CON DESCUENTOS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Columna 1: Cálculo base */}
                    <div className="bg-white p-4 rounded-lg border">
                      <h5 className="font-medium text-gray-700 mb-3">
                        💼 Comisión Base
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base de cálculo:</span>
                          <span className="font-medium">
                            {formatearMonedaComision(
                              calculosDetallados[periodo.id].base_calculo
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>
                            Porcentaje (
                            {formatearPorcentaje(
                              periodo.usuarios?.comision_porcentaje || 0
                            )}
                            ):
                          </span>
                          <span className="font-medium text-green-600">
                            {formatearMonedaComision(
                              calculosDetallados[periodo.id].comision_bruta
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Descuentos */}
                    <div className="bg-white p-4 rounded-lg border">
                      <h5 className="font-medium text-gray-700 mb-3">
                        ➖ Descuentos
                      </h5>
                      <div className="space-y-2 text-sm">
                        {calculosDetallados[periodo.id].total_adelantos > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Adelantos:</span>
                            <span>
                              -
                              {formatearMonedaComision(
                                calculosDetallados[periodo.id].total_adelantos
                              )}
                            </span>
                          </div>
                        )}
                        {calculosDetallados[periodo.id].total_pagos_mano >
                          0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Pagos en mano:</span>
                            <span>
                              -
                              {formatearMonedaComision(
                                calculosDetallados[periodo.id].total_pagos_mano
                              )}
                            </span>
                          </div>
                        )}
                        {calculosDetallados[periodo.id].otros_descuentos &&
                          calculosDetallados[periodo.id].otros_descuentos! >
                            0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Otros descuentos:</span>
                              <span>
                                -
                                {formatearMonedaComision(
                                  calculosDetallados[periodo.id]
                                    .otros_descuentos!
                                )}
                              </span>
                            </div>
                          )}
                        {calculosDetallados[periodo.id].total_adelantos === 0 &&
                          calculosDetallados[periodo.id].total_pagos_mano ===
                            0 &&
                          (!calculosDetallados[periodo.id].otros_descuentos ||
                            calculosDetallados[periodo.id].otros_descuentos ===
                              0) && (
                            <div className="text-gray-500 italic">
                              Sin descuentos
                            </div>
                          )}
                        <div className="border-t pt-2 mt-3">
                          <div className="flex justify-between font-bold text-lg">
                            <span>SALDO LÍQUIDO:</span>
                            <span className="text-green-600">
                              {formatearMonedaComision(
                                calculosDetallados[periodo.id].saldo_liquido
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Concepto de otros descuentos */}
                  {periodo.concepto_descuentos && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <h6 className="text-sm font-medium text-blue-900 mb-1">
                        📝 Concepto de descuentos:
                      </h6>
                      <p className="text-sm text-blue-800">
                        {periodo.concepto_descuentos}
                      </p>
                    </div>
                  )}

                  <h5 className="font-semibold mb-2 text-gray-800">
                    Movimientos Comisionables (
                    {calculosDetallados[periodo.id].detalles.length})
                  </h5>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-200 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium">Cliente</th>
                          <th className="text-left p-2 font-medium">Tipo</th>
                          <th className="text-right p-2 font-medium">Monto</th>
                          <th className="text-right p-2 font-medium">
                            Comisión
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {calculosDetallados[periodo.id].detalles.map((d) => (
                          <tr
                            key={d.movimiento_id}
                            className="border-b last:border-b-0"
                          >
                            <td className="p-2">{d.cliente_nombre}</td>
                            <td className="p-2">{d.tipo_movimiento}</td>
                            <td className="text-right p-2">
                              {formatearMonedaComision(d.monto_comisionable)}
                            </td>
                            <td className="text-right p-2 text-green-700 font-medium">
                              {formatearMonedaComision(d.comision_calculada)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <FormularioPeriodo
        isOpen={showFormulario}
        onClose={() => setShowFormulario(false)}
        onSuccess={loadPeriodos}
        currentUser={currentUser}
      />
    </div>
  );
};
export default ComisionesView;
