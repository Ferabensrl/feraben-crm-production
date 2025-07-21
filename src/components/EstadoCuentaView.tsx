import React, { useState } from 'react';
import {
  Download,
  Filter,
  Edit,
  Trash2,
  ArrowLeft,
  Plus,
  Eye,
  Lock,
  AlertCircle,
} from 'lucide-react';

// Importaciones con rutas relativas
import {
  Cliente,
  Movimiento,
  calcularSaldoCliente,
  formatearMoneda,
  formatearFecha,
  supabase,
} from '../lib/supabase';
import { FormularioMovimiento } from './FormularioMovimiento';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface EstadoCuentaViewProps {
  clienteId: number;
  clientes: Cliente[];
  movimientos: Movimiento[];
  onVolver: () => void;
  currentUser: { id: number; nombre: string; rol: string };
  onMovimientoChange: () => void;
}

// Información de la empresa
const EMPRESA_INFO = {
  razonSocial: 'Feraben SRL',
  rut: '020522780010',
  telefono: '097998999',
  email: 'ferabensrl@gmail.com',
};

const EstadoCuentaView: React.FC<EstadoCuentaViewProps> = ({
  clienteId,
  clientes,
  movimientos,
  onVolver,
  currentUser,
  onMovimientoChange,
}) => {
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [showFormularioMovimiento, setShowFormularioMovimiento] =
    useState(false);
  const [movimientoEditando, setMovimientoEditando] =
    useState<Movimiento | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);

  // 🔒 DETERMINAR PERMISOS SEGÚN ROL
  const esAdmin = currentUser.rol.toLowerCase() === 'admin';
  const puedeCrearMovimientos = esAdmin; // Solo admin puede crear
  const puedeEditarMovimientos = esAdmin; // Solo admin puede editar
  const puedeEliminarMovimientos = esAdmin; // Solo admin puede eliminar
  const puedeExportar = true; // Todos pueden exportar

  const cliente = clientes.find((c) => c.id === clienteId);

  if (!cliente) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <p className="text-gray-500 mb-4">Cliente no encontrado</p>
        <button
          onClick={onVolver}
          className="mt-4 bg-primary text-white px-4 py-2 rounded-md"
        >
          Volver
        </button>
      </div>
    );
  }

  // Filtrar movimientos por fecha si hay filtros activos
  const movimientosFiltrados = movimientos.filter((mov) => {
    if (!filtroFechaDesde && !filtroFechaHasta) return true;
    const fechaMovimiento = new Date(mov.fecha + 'T00:00:00');
    if (filtroFechaDesde && filtroFechaHasta) {
      return (
        fechaMovimiento >= new Date(filtroFechaDesde + 'T00:00:00') &&
        fechaMovimiento <= new Date(filtroFechaHasta + 'T23:59:59')
      );
    }
    if (filtroFechaDesde)
      return fechaMovimiento >= new Date(filtroFechaDesde + 'T00:00:00');
    if (filtroFechaHasta)
      return fechaMovimiento <= new Date(filtroFechaHasta + 'T23:59:59');
    return true;
  });

  // Calcular saldo final
  const saldoFinal = calcularSaldoCliente(movimientosFiltrados);

  // Agregar saldo acumulado a cada movimiento
  let saldoAcumulado = 0;
  const movimientosConSaldo = movimientosFiltrados.map((mov) => {
    saldoAcumulado += mov.importe;
    return {
      ...mov,
      saldo_acumulado: saldoAcumulado,
    };
  });

  const limpiarFiltros = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
  };

  const obtenerTituloReporte = () => {
    if (filtroFechaDesde && filtroFechaHasta)
      return `Estado de Cuenta del ${formatearFecha(filtroFechaDesde)} al ${formatearFecha(filtroFechaHasta)}`;
    if (filtroFechaDesde)
      return `Estado de Cuenta desde ${formatearFecha(filtroFechaDesde)}`;
    if (filtroFechaHasta)
      return `Estado de Cuenta hasta ${formatearFecha(filtroFechaHasta)}`;
    return 'Estado de Cuenta Completo';
  };

  // 🔧 FUNCIÓN CORREGIDA DE EXPORTAR PDF
  const handleExportarPDF = () => {
    if (!puedeExportar) {
      alert('❌ No tienes permisos para exportar');
      return;
    }

    try {
      const doc = new jsPDF();

      // Encabezado de la empresa
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(EMPRESA_INFO.razonSocial, 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`RUT: ${EMPRESA_INFO.rut}`, 14, 28);
      doc.text(
        `Tel: ${EMPRESA_INFO.telefono} | Email: ${EMPRESA_INFO.email}`,
        14,
        35
      );

      // Título del reporte
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(obtenerTituloReporte(), 14, 50);

      // Información del cliente
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${cliente.razon_social}`, 14, 65);
      doc.text(`RUT: ${cliente.rut}`, 14, 72);
      doc.text(`Vendedor: ${cliente.vendedor_nombre || 'N/A'}`, 14, 79);

      // Saldo final destacado
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(saldoFinal > 0 ? 255 : 0, saldoFinal > 0 ? 0 : 150, 0);
      doc.text(`SALDO FINAL: ${formatearMoneda(saldoFinal)}`, 14, 90);
      doc.setTextColor(0, 0, 0); // Reset color

      // Tabla de movimientos
      const tableData = movimientosConSaldo.map((mov) => [
        formatearFecha(mov.fecha),
        mov.tipo_movimiento,
        mov.documento || '-',
        formatearMoneda(mov.importe),
        formatearMoneda(mov.saldo_acumulado || 0),
        mov.comentario || '-',
      ]);

      autoTable(doc, {
        startY: 100,
        head: [
          ['Fecha', 'Tipo', 'Documento', 'Importe', 'Saldo', 'Comentario'],
        ],
        body: tableData,
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 25 }, // Fecha
          1: { cellWidth: 20 }, // Tipo
          2: { cellWidth: 25 }, // Documento
          3: { cellWidth: 30, halign: 'right' }, // Importe
          4: { cellWidth: 30, halign: 'right' }, // Saldo
          5: { cellWidth: 50 }, // Comentario
        },
        didParseCell: function (data) {
          // Colorear importes
          if (data.column.index === 3) {
            const importe = parseFloat(
              data.cell.text[0].replace(/[^0-9,-]/g, '').replace(',', '.')
            );
            if (importe < 0) {
              data.cell.styles.textColor = [0, 150, 0]; // Verde para pagos
            } else {
              data.cell.styles.textColor = [0, 100, 200]; // Azul para ventas
            }
          }
          // Colorear saldos
          if (data.column.index === 4) {
            const saldo = parseFloat(
              data.cell.text[0].replace(/[^0-9,-]/g, '').replace(',', '.')
            );
            if (saldo > 0) {
              data.cell.styles.textColor = [200, 0, 0]; // Rojo para deuda
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [0, 150, 0]; // Verde para favor
            }
          }
        },
      });

      // Pie de página
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Generado el ${formatearFecha(new Date().toISOString().split('T')[0])} por ${currentUser.nombre} - Página ${i} de ${pageCount}`,
          14,
          (doc as any).internal.pageSize.height - 10
        );
      }

      const nombreArchivo = `Estado_Cuenta_${cliente.razon_social.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nombreArchivo);

      console.log('✅ PDF generado correctamente:', nombreArchivo);
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      alert('Error al generar el PDF. Revise la consola para más detalles.');
    }
  };

  // 🔧 FUNCIÓN CORREGIDA DE EXPORTAR EXCEL
  const handleExportarExcel = () => {
    if (!puedeExportar) {
      alert('❌ No tienes permisos para exportar');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Datos del encabezado
      const headerData = [
        [EMPRESA_INFO.razonSocial],
        [`RUT: ${EMPRESA_INFO.rut}`],
        [`Tel: ${EMPRESA_INFO.telefono} | Email: ${EMPRESA_INFO.email}`],
        [''],
        [obtenerTituloReporte()],
        [''],
        ['INFORMACIÓN DEL CLIENTE:'],
        ['Cliente:', cliente.razon_social],
        ['RUT:', cliente.rut],
        ['Vendedor:', cliente.vendedor_nombre || 'N/A'],
        ['SALDO FINAL:', formatearMoneda(saldoFinal)],
        [''],
        ['DETALLE DE MOVIMIENTOS:'],
        [
          'Fecha',
          'Tipo',
          'Documento',
          'Importe',
          'Saldo Acumulado',
          'Comentario',
        ],
      ];

      // Datos de los movimientos
      const movimientosData = movimientosConSaldo.map((mov) => [
        formatearFecha(mov.fecha),
        mov.tipo_movimiento,
        mov.documento || '',
        mov.importe,
        mov.saldo_acumulado,
        mov.comentario || '',
      ]);

      // Combinar todos los datos
      const allData = [...headerData, ...movimientosData];

      // Crear la hoja de cálculo
      const ws = XLSX.utils.aoa_to_sheet(allData);

      // Configurar anchos de columna
      ws['!cols'] = [
        { wch: 12 }, // Fecha
        { wch: 15 }, // Tipo
        { wch: 15 }, // Documento
        { wch: 15 }, // Importe
        { wch: 18 }, // Saldo Acumulado
        { wch: 35 }, // Comentario
      ];

      // Agregar la hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Estado de Cuenta');

      // Generar y descargar el archivo
      const nombreArchivo = `Estado_Cuenta_${cliente.razon_social.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);

      console.log('✅ Excel generado correctamente:', nombreArchivo);
    } catch (error) {
      console.error('❌ Error generando Excel:', error);
      alert('Error al generar el Excel. Revise la consola para más detalles.');
    }
  };

  const handleEditarMovimiento = (movimiento: Movimiento) => {
    if (!puedeEditarMovimientos) {
      alert('❌ No tienes permisos para editar movimientos');
      return;
    }
    setMovimientoEditando(movimiento);
    setShowFormularioMovimiento(true);
  };

  const handleEliminarMovimiento = async (movimiento: Movimiento) => {
    if (!puedeEliminarMovimientos) {
      alert('❌ No tienes permisos para eliminar movimientos');
      return;
    }
    const confirmMessage = `🗑️ ¿ELIMINAR MOVIMIENTO?\n\n• Documento: ${movimiento.documento}\n• Importe: ${formatearMoneda(movimiento.importe)}\n\nEsta acción NO se puede deshacer.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setEliminando(movimiento.id);
      const { error } = await supabase
        .from('movimientos')
        .delete()
        .eq('id', movimiento.id);
      if (error) throw error;
      alert(`✅ Movimiento eliminado. La vista se actualizará.`);
      onMovimientoChange();
    } catch (error: any) {
      alert(`❌ ERROR AL ELIMINAR\n\n${error.message}`);
    } finally {
      setEliminando(null);
    }
  };

  const handleMovimientoGuardado = () => {
    onMovimientoChange();
    cerrarFormularioMovimiento();
  };

  const cerrarFormularioMovimiento = () => {
    setShowFormularioMovimiento(false);
    setMovimientoEditando(null);
  };

  return (
    <div>
      {/* Header con navegación y controles - ADAPTADO POR ROL */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <button
            onClick={onVolver}
            className="flex items-center text-primary hover:text-primary-dark transition-colors font-medium"
          >
            <ArrowLeft size={20} className="mr-2" />
            Volver a Clientes
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="p-2 rounded-md hover:bg-gray-100 border border-gray-300 text-gray-700"
              title="Filtros por fecha"
            >
              <Filter size={18} />
            </button>

            {/* ✅ TODOS PUEDEN EXPORTAR */}
            {puedeExportar && (
              <>
                <button
                  onClick={handleExportarPDF}
                  className="p-2 rounded-md hover:bg-red-50 border border-red-300 text-red-600"
                  title="Exportar PDF"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={handleExportarExcel}
                  className="p-2 rounded-md hover:bg-green-50 border border-green-300 text-green-600"
                  title="Exportar Excel"
                >
                  <Download size={18} />
                </button>
              </>
            )}

            {/* ❌ SOLO ADMIN PUEDE CREAR MOVIMIENTOS */}
            {puedeCrearMovimientos && (
              <button
                onClick={() => setShowFormularioMovimiento(true)}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center"
              >
                <Plus size={18} className="mr-2" />
                Nuevo Movimiento
              </button>
            )}
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Saldo Final Período</div>
            <div
              className={`text-2xl font-bold ${
                saldoFinal > 0.01
                  ? 'text-red-600'
                  : saldoFinal < -0.01
                    ? 'text-green-600'
                    : 'text-gray-900'
              }`}
            >
              {formatearMoneda(saldoFinal)}
            </div>
          </div>
        </div>

        {/* Panel de filtros */}
        {mostrarFiltros && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={limpiarFiltros}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Información del cliente */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Estado de Cuenta
              </h1>
              <h2 className="text-lg font-medium text-primary">
                {cliente.razon_social}
              </h2>
              <p className="text-sm text-gray-600">
                RUT: {cliente.rut} | Vendedor: {cliente.vendedor_nombre}
              </p>
            </div>

            {/* 🔒 INDICADOR DE PERMISOS PARA VENDEDORES */}
            {!esAdmin && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center text-blue-800">
                  <Eye className="mr-2" size={16} />
                  <div>
                    <div className="text-sm font-medium">
                      Vista de Solo Lectura
                    </div>
                    <div className="text-xs text-blue-600">
                      Puedes consultar y exportar
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de movimientos - ADAPTADA POR ROL */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importe
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comentario
                </th>
                {/* ❌ COLUMNA ACCIONES SOLO PARA ADMIN */}
                {esAdmin && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movimientosConSaldo.length === 0 ? (
                <tr>
                  <td
                    colSpan={esAdmin ? 7 : 6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No hay movimientos en el período seleccionado.
                  </td>
                </tr>
              ) : (
                movimientosConSaldo.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatearFecha(mov.fecha)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          mov.tipo_movimiento === 'Venta'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {mov.tipo_movimiento}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {mov.documento || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span
                        className={
                          mov.importe > 0 ? 'text-blue-600' : 'text-green-600'
                        }
                      >
                        {formatearMoneda(mov.importe)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span
                        className={`${(mov.saldo_acumulado || 0) > 0.01 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {formatearMoneda(mov.saldo_acumulado || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {mov.comentario || '-'}
                    </td>

                    {/* ❌ ACCIONES SOLO PARA ADMIN */}
                    {esAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-center space-x-1">
                        <button
                          onClick={() => handleEditarMovimiento(mov)}
                          className="text-green-600 hover:text-green-800"
                          title="Editar movimiento"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleEliminarMovimiento(mov)}
                          disabled={eliminando === mov.id}
                          className="text-red-600 hover:text-red-800 disabled:text-gray-300"
                          title="Eliminar movimiento"
                        >
                          {eliminando === mov.id ? '...' : <Trash2 size={16} />}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 💡 MENSAJE INFORMATIVO PARA VENDEDORES */}
      {!esAdmin && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Lock className="text-blue-600 mr-3" size={20} />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Vista de Vendedor - Solo Consulta
              </h4>
              <p className="text-sm text-blue-700">
                Puedes consultar el estado de cuenta completo de tus clientes y
                exportar reportes. Para crear o modificar movimientos, contacta
                al administrador.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 FORMULARIO DE MOVIMIENTO - SOLO ADMIN PUEDE ACCEDER */}
      {esAdmin && showFormularioMovimiento && (
        <FormularioMovimiento
          isOpen={showFormularioMovimiento}
          onClose={cerrarFormularioMovimiento}
          onSuccess={handleMovimientoGuardado}
          currentUser={currentUser}
          movimientoEditar={movimientoEditando}
          clientePreseleccionado={clienteId}
        />
      )}
    </div>
  );
};

export default EstadoCuentaView;
