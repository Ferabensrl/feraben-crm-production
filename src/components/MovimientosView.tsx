// src/components/MovimientosView.tsx - CON PERMISOS POR ROL
import React, { useState, useMemo } from 'react';
import {
  Plus,
  User,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter as FilterIcon,
  Eye,
  Lock,
} from 'lucide-react';
import { formatearFecha, formatearMoneda, Movimiento } from '../lib/supabase';
import { FormularioMovimiento } from './FormularioMovimiento';
import {
  useBuscadorMovimientos,
  filtrarPorRangoFechas,
  filtrarPorRangoMontos,
} from '../hooks/useBuscador';
import { BuscadorMovimientos } from './Buscador';

interface MovimientosViewProps {
  currentUser: { id: number; nombre: string; rol: 'admin' | 'vendedor' };
  movimientos: Movimiento[];
  onMovimientoChange: () => void;
}

export const MovimientosView: React.FC<MovimientosViewProps> = ({
  currentUser,
  movimientos,
  onMovimientoChange,
}) => {
  // Estados del componente
  const [showFormulario, setShowFormulario] = useState(false);

  // Estados para filtros avanzados
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroMontoDesde, setFiltroMontoDesde] = useState('');
  const [filtroMontoHasta, setFiltroMontoHasta] = useState('');
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  const [historialBusquedas, setHistorialBusquedas] = useState<string[]>([]);

  // 🔒 DETERMINAR PERMISOS SEGÚN ROL
  const esAdmin = currentUser.rol === 'admin';
  const puedeCrearMovimientos = esAdmin; // Solo admin puede crear
  const puedeEditarMovimientos = esAdmin; // Solo admin puede editar
  const puedeEliminarMovimientos = esAdmin; // Solo admin puede eliminar

  // Los movimientos ya vienen filtrados desde App.tsx según el rol
  const movimientosFiltradosPorRol = useMemo(() => {
    console.log(
      `👤 ${esAdmin ? 'Admin' : 'Vendedor'} ${currentUser.nombre} - Movimientos disponibles: ${movimientos.length}`
    );
    return movimientos;
  }, [movimientos, currentUser, esAdmin]);

  // 🔍 INTEGRACIÓN DEL BUSCADOR INTELIGENTE
  const {
    termino,
    setTermino,
    resultados: movimientosBuscados,
    limpiarBusqueda,
    cantidadResultados,
    esBusquedaActiva,
  } = useBuscadorMovimientos(movimientosFiltradosPorRol);

  // 🎯 APLICAR FILTROS AVANZADOS SOBRE LOS RESULTADOS DE BÚSQUEDA
  const movimientosFinales = useMemo(() => {
    let resultado = movimientosBuscados;

    // Filtro por tipo de movimiento
    if (filtroTipo) {
      resultado = resultado.filter((m) => m.tipo_movimiento === filtroTipo);
    }

    // Filtro por vendedor (solo para admin)
    if (filtroVendedor && esAdmin) {
      resultado = resultado.filter(
        (m) => m.vendedor_id.toString() === filtroVendedor
      );
    }

    // Filtro por rango de fechas
    if (filtroFechaDesde || filtroFechaHasta) {
      resultado = filtrarPorRangoFechas(
        resultado,
        filtroFechaDesde,
        filtroFechaHasta
      );
    }

    // Filtro por rango de montos
    if (filtroMontoDesde || filtroMontoHasta) {
      const montoDesde = filtroMontoDesde
        ? parseFloat(filtroMontoDesde)
        : undefined;
      const montoHasta = filtroMontoHasta
        ? parseFloat(filtroMontoHasta)
        : undefined;
      resultado = filtrarPorRangoMontos(resultado, montoDesde, montoHasta);
    }

    // Ordenar por fecha descendente (más recientes primero)
    return resultado.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [
    movimientosBuscados,
    filtroTipo,
    filtroVendedor,
    filtroFechaDesde,
    filtroFechaHasta,
    filtroMontoDesde,
    filtroMontoHasta,
    esAdmin,
  ]);

  // 📊 ESTADÍSTICAS DINÁMICAS
  const estadisticas = useMemo(() => {
    const totalMovimientos = movimientosFinales.length;
    const ventas = movimientosFinales.filter(
      (m) => m.tipo_movimiento === 'Venta'
    );
    const pagos = movimientosFinales.filter((m) =>
      ['Pago', 'Nota de Crédito', 'Devolución'].includes(m.tipo_movimiento)
    );

    const totalVentas = ventas.reduce((sum, m) => sum + m.importe, 0);
    const totalPagos = pagos.reduce((sum, m) => sum + Math.abs(m.importe), 0);

    // Movimientos del mes actual
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const movimientosMesActual = movimientosFinales.filter(
      (m) => new Date(m.fecha) >= inicioMes
    );

    return {
      totalMovimientos,
      cantidadVentas: ventas.length,
      cantidadPagos: pagos.length,
      totalVentas,
      totalPagos,
      movimientosMesActual: movimientosMesActual.length,
      ventasMesActual: movimientosMesActual
        .filter((m) => m.tipo_movimiento === 'Venta')
        .reduce((sum, m) => sum + m.importe, 0),
    };
  }, [movimientosFinales]);

  // 🎯 OBTENER LISTAS ÚNICAS PARA FILTROS
  const tiposMovimiento = [
    'Venta',
    'Pago',
    'Nota de Crédito',
    'Ajuste de Saldo',
    'Devolución',
  ];

  const vendedoresUnicos = useMemo(() => {
    if (!esAdmin) return []; // Los vendedores no necesitan filtrar por vendedor
    const vendedoresMap = new Map();
    movimientos.forEach((m) => {
      if (
        m.vendedor_id &&
        m.usuarios?.nombre &&
        !vendedoresMap.has(m.vendedor_id)
      ) {
        vendedoresMap.set(m.vendedor_id, {
          id: m.vendedor_id,
          nombre: m.usuarios.nombre,
        });
      }
    });
    return Array.from(vendedoresMap.values());
  }, [movimientos, esAdmin]);

  // 🔍 MANEJO DE BÚSQUEDA CON HISTORIAL
  const manejarBusqueda = (nuevoTermino: string) => {
    setTermino(nuevoTermino);

    if (
      nuevoTermino.trim() &&
      !historialBusquedas.includes(nuevoTermino.trim())
    ) {
      setHistorialBusquedas((prev) => [
        nuevoTermino.trim(),
        ...prev.slice(0, 4),
      ]);
    }
  };

  // 🎯 MANEJO DE FILTROS RÁPIDOS
  const manejarFiltroRapido = (filtroId: string) => {
    switch (filtroId) {
      case 'ventas':
        setFiltroTipo(filtroTipo === 'Venta' ? '' : 'Venta');
        break;
      case 'pagos':
        setFiltroTipo(filtroTipo === 'Pago' ? '' : 'Pago');
        break;
      case 'mes-actual':
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const fechaInicioMes = inicioMes.toISOString().split('T')[0];
        const fechaHoy = hoy.toISOString().split('T')[0];

        if (
          filtroFechaDesde === fechaInicioMes &&
          filtroFechaHasta === fechaHoy
        ) {
          // Si ya está filtrado por mes actual, limpiar
          setFiltroFechaDesde('');
          setFiltroFechaHasta('');
        } else {
          // Aplicar filtro de mes actual
          setFiltroFechaDesde(fechaInicioMes);
          setFiltroFechaHasta(fechaHoy);
        }
        break;
    }
  };

  // 🎯 FUNCIÓN PARA RESALTAR TEXTO DE BÚSQUEDA
  const resaltarTexto = (texto: string, busqueda: string) => {
    if (!busqueda.trim() || !texto) return texto;

    const regex = new RegExp(`(${busqueda})`, 'gi');
    const partes = texto.split(regex);

    return partes.map((parte, index) =>
      regex.test(parte) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {parte}
        </mark>
      ) : (
        parte
      )
    );
  };

  // 🧹 LIMPIAR TODOS LOS FILTROS
  const limpiarTodosFiltros = () => {
    limpiarBusqueda();
    setFiltroTipo('');
    setFiltroVendedor('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroMontoDesde('');
    setFiltroMontoHasta('');
  };

  const handleSuccess = () => {
    setShowFormulario(false);
    onMovimientoChange();
  };

  const getTipoMovimientoColor = (tipo: string) => {
    switch (tipo) {
      case 'Venta':
        return 'bg-blue-100 text-blue-800';
      case 'Pago':
        return 'bg-green-100 text-green-800';
      case 'Nota de Crédito':
        return 'bg-orange-100 text-orange-800';
      case 'Ajuste de Saldo':
        return 'bg-purple-100 text-purple-800';
      case 'Devolución':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* 🔝 HEADER CON INFORMACIÓN INTELIGENTE - ADAPTADO POR ROL */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="mr-3 text-primary" size={28} />
            {esAdmin ? 'Gestión de Movimientos' : 'Mis Movimientos'}
            {!esAdmin && <Lock className="ml-2 text-gray-400" size={20} />}
          </h2>
          <p className="text-gray-600 mt-1">
            {esBusquedaActiva ? (
              <span>
                {cantidadResultados} de {movimientosFiltradosPorRol.length}{' '}
                movimientos encontrados
                {termino && (
                  <span className="text-primary"> • Buscando: "{termino}"</span>
                )}
              </span>
            ) : (
              `${movimientosFiltradosPorRol.length} movimientos ${esAdmin ? 'en el sistema' : 'bajo tu gestión'}`
            )}
          </p>
          {/* 🔒 INDICADOR DE PERMISOS PARA VENDEDORES */}
          {!esAdmin && (
            <p className="text-sm text-blue-600 mt-1 flex items-center">
              <Eye className="mr-1" size={14} />
              Solo lectura - Puedes consultar y exportar información
            </p>
          )}
        </div>

        {/* ❌ BOTÓN "NUEVO MOVIMIENTO" SOLO PARA ADMIN */}
        {puedeCrearMovimientos && (
          <button
            onClick={() => setShowFormulario(true)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center font-medium whitespace-nowrap"
          >
            <Plus size={20} className="mr-2" />
            Nuevo Movimiento
          </button>
        )}
      </div>

      {/* 📊 ESTADÍSTICAS DINÁMICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {esAdmin ? 'Total Movimientos' : 'Mis Movimientos'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {estadisticas.totalMovimientos}
              </p>
            </div>
            <FileText className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Ventas ({estadisticas.cantidadVentas})
              </p>
              <p className="text-lg font-bold text-green-600">
                {formatearMoneda(estadisticas.totalVentas)}
              </p>
            </div>
            <TrendingUp className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pagos ({estadisticas.cantidadPagos})
              </p>
              <p className="text-lg font-bold text-purple-600">
                {formatearMoneda(estadisticas.totalPagos)}
              </p>
            </div>
            <TrendingDown className="text-purple-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Este Mes</p>
              <p className="text-lg font-bold text-orange-600">
                {formatearMoneda(estadisticas.ventasMesActual)}
              </p>
              <p className="text-xs text-gray-500">
                {estadisticas.movimientosMesActual} movimientos
              </p>
            </div>
            <Calendar className="text-orange-500" size={24} />
          </div>
        </div>
      </div>

      {/* 🔍 BUSCADOR INTELIGENTE */}
      <div className="bg-white rounded-lg shadow p-6">
        <BuscadorMovimientos
          onBuscar={manejarBusqueda}
          resultadosCount={cantidadResultados}
          onFiltroRapido={manejarFiltroRapido}
          historialBusquedas={historialBusquedas}
          onSeleccionarHistorial={setTermino}
          size="lg"
        />
      </div>

      {/* 🎯 FILTROS AVANZADOS - ADAPTADOS POR ROL */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FilterIcon className="mr-2 text-primary" size={20} />
            Filtros Avanzados
          </h3>
          <button
            onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            className="text-primary hover:text-primary-dark font-medium text-sm"
          >
            {mostrarFiltrosAvanzados ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {mostrarFiltrosAvanzados && (
          <div className="p-4 space-y-4">
            {/* Primera fila de filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Movimiento
                </label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todos los tipos</option>
                  {tiposMovimiento.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por vendedor - SOLO ADMIN */}
              {esAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendedor
                  </label>
                  <select
                    value={filtroVendedor}
                    onChange={(e) => setFiltroVendedor(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Todos los vendedores</option>
                    {vendedoresUnicos.map((v) => (
                      <option key={v.id} value={v.id.toString()}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botón limpiar filtros */}
              <div className="flex items-end">
                <button
                  onClick={limpiarTodosFiltros}
                  className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>

            {/* Segunda fila: filtros de fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Tercera fila: filtros de montos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Desde
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={filtroMontoDesde}
                  onChange={(e) => setFiltroMontoDesde(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Hasta
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={filtroMontoHasta}
                  onChange={(e) => setFiltroMontoHasta(e.target.value)}
                  placeholder="999999.99"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📋 TABLA DE RESULTADOS - ADAPTADA POR ROL */}
      {movimientosFinales.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron movimientos
          </h3>
          <p className="text-gray-500 mb-4">
            {esBusquedaActiva ||
            filtroTipo ||
            filtroVendedor ||
            filtroFechaDesde ||
            filtroFechaHasta ||
            filtroMontoDesde ||
            filtroMontoHasta
              ? 'Intenta ajustar los filtros de búsqueda.'
              : 'No hay movimientos registrados.'}
          </p>
          <button
            onClick={limpiarTodosFiltros}
            className="text-primary hover:text-primary-dark font-medium"
          >
            Limpiar todos los filtros
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importe
                  </th>
                  {/* Columna vendedor solo para admin */}
                  {esAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendedor
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movimientosFinales.map((mov) => (
                  <tr
                    key={mov.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatearFecha(mov.fecha)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {esBusquedaActiva
                        ? resaltarTexto(
                            mov.clientes?.razon_social ||
                              '(Cliente no encontrado)',
                            termino
                          )
                        : mov.clientes?.razon_social ||
                          '(Cliente no encontrado)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {esBusquedaActiva
                        ? resaltarTexto(mov.documento || '-', termino)
                        : mov.documento || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoMovimientoColor(mov.tipo_movimiento)}`}
                      >
                        {mov.tipo_movimiento}
                      </span>
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
                    {/* Columna vendedor solo para admin */}
                    {esAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <User size={14} className="mr-1" />
                          {esBusquedaActiva
                            ? resaltarTexto(
                                mov.usuarios?.nombre ||
                                  '(Vendedor no encontrado)',
                                termino
                              )
                            : mov.usuarios?.nombre ||
                              '(Vendedor no encontrado)'}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 💡 MENSAJE INFORMATIVO PARA VENDEDORES */}
      {!esAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Eye className="text-blue-600 mr-3" size={20} />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Vista de Vendedor - Solo Lectura
              </h4>
              <p className="text-sm text-blue-700">
                Estás viendo únicamente tus movimientos. Para crear o modificar
                movimientos, contacta al administrador.
                {estadisticas.totalMovimientos > 0 &&
                  ` Tienes ${estadisticas.totalMovimientos} movimientos registrados.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 FORMULARIO DE MOVIMIENTO - SOLO ADMIN PUEDE ACCEDER */}
      {puedeCrearMovimientos && (
        <FormularioMovimiento
          isOpen={showFormulario}
          onClose={() => setShowFormulario(false)}
          onSuccess={handleSuccess}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
