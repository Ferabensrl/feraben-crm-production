import React, { useState, useMemo } from 'react';
import { Search, Filter, Edit2, Trash2, Building2, User, Calendar, DollarSign, Tag } from 'lucide-react';
import { formatearMoneda, formatearFecha, type Gasto, eliminarGasto } from '../../lib/supabase';

interface ListaGastosProps {
  gastos: Gasto[];
  onGastoActualizado: () => void;
  mesActual: string;
}

const ListaGastos: React.FC<ListaGastosProps> = ({ gastos, onGastoActualizado, mesActual }) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'Empresa' | 'Personal'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [ordenPor, setOrdenPor] = useState<'fecha' | 'monto' | 'categoria'>('fecha');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc');

  // Filtrar gastos del mes actual
  const gastosMes = gastos.filter(gasto => gasto.fecha.startsWith(mesActual));

  // Obtener categorías únicas para el filtro
  const categoriasUnicas = useMemo(() => {
    const categoriasSet = new Set(gastosMes.map(g => g.categoria));
    const categorias = Array.from(categoriasSet);
    return categorias.sort();
  }, [gastosMes]);

  // Aplicar filtros y búsqueda
  const gastosFiltrados = useMemo(() => {
    return gastosMes
      .filter(gasto => {
        // Filtro de búsqueda
        const textoBusqueda = busqueda.toLowerCase();
        const coincideBusqueda = 
          gasto.categoria.toLowerCase().includes(textoBusqueda) ||
          (gasto.descripcion?.toLowerCase().includes(textoBusqueda) || false) ||
          gasto.monto.toString().includes(textoBusqueda);

        // Filtro por tipo
        const coincideTipo = filtroTipo === 'todos' || gasto.tipo === filtroTipo;

        // Filtro por categoría
        const coincideCategoria = !filtroCategoria || gasto.categoria === filtroCategoria;

        return coincideBusqueda && coincideTipo && coincideCategoria;
      })
      .sort((a, b) => {
        const multiplicador = ordenDireccion === 'asc' ? 1 : -1;
        
        switch (ordenPor) {
          case 'fecha':
            return multiplicador * (new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
          case 'monto':
            return multiplicador * (a.monto - b.monto);
          case 'categoria':
            return multiplicador * a.categoria.localeCompare(b.categoria);
          default:
            return 0;
        }
      });
  }, [gastosMes, busqueda, filtroTipo, filtroCategoria, ordenPor, ordenDireccion]);

  const handleEliminar = async (id: number) => {
    if (window.confirm('¿Está seguro de que desea eliminar este gasto?')) {
      const resultado = await eliminarGasto(id);
      if (resultado) {
        onGastoActualizado();
      } else {
        alert('Error al eliminar el gasto');
      }
    }
  };

  const totalFiltrado = gastosFiltrados.reduce((sum, gasto) => sum + gasto.monto, 0);
  const totalEmpresa = gastosFiltrados.filter(g => g.tipo === 'Empresa').reduce((sum, g) => sum + g.monto, 0);
  const totalPersonal = gastosFiltrados.filter(g => g.tipo === 'Personal').reduce((sum, g) => sum + g.monto, 0);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header con controles */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Lista de Gastos</h2>
            <p className="text-sm text-gray-500">
              {gastosFiltrados.length} de {gastosMes.length} gastos • Total: {formatearMoneda(totalFiltrado)}
            </p>
          </div>

          {/* Búsqueda */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar gastos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mt-4">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as 'todos' | 'Empresa' | 'Personal')}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los tipos</option>
            <option value="Empresa">Solo Empresa</option>
            <option value="Personal">Solo Personal</option>
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categoriasUnicas.map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>

          <select
            value={`${ordenPor}-${ordenDireccion}`}
            onChange={(e) => {
              const [campo, direccion] = e.target.value.split('-');
              setOrdenPor(campo as 'fecha' | 'monto' | 'categoria');
              setOrdenDireccion(direccion as 'asc' | 'desc');
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fecha-desc">Fecha (más reciente)</option>
            <option value="fecha-asc">Fecha (más antiguo)</option>
            <option value="monto-desc">Monto (mayor a menor)</option>
            <option value="monto-asc">Monto (menor a mayor)</option>
            <option value="categoria-asc">Categoría (A-Z)</option>
          </select>
        </div>

        {/* Resumen rápido */}
        {gastosFiltrados.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center">
              <Building2 className="w-4 h-4 text-red-600 mr-1" />
              <span className="text-gray-600">Empresa: </span>
              <span className="font-medium text-red-600">{formatearMoneda(totalEmpresa)}</span>
            </div>
            <div className="flex items-center">
              <User className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-gray-600">Personal: </span>
              <span className="font-medium text-blue-600">{formatearMoneda(totalPersonal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Lista de gastos */}
      <div className="overflow-hidden">
        {gastosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron gastos</h3>
            <p className="text-gray-500">
              {gastosMes.length === 0 
                ? 'No hay gastos registrados para este mes.'
                : 'Pruebe ajustando los filtros de búsqueda.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {gastosFiltrados.map((gasto) => (
              <div key={gasto.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Indicador de tipo */}
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        gasto.tipo === 'Empresa' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {gasto.tipo === 'Empresa' ? (
                          <Building2 className="w-3 h-3 mr-1" />
                        ) : (
                          <User className="w-3 h-3 mr-1" />
                        )}
                        {gasto.tipo}
                      </div>

                      {/* Fecha */}
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatearFecha(gasto.fecha)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-1">
                      {/* Categoría */}
                      <div className="flex items-center">
                        <Tag className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{gasto.categoria}</span>
                      </div>

                      {/* Monto */}
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-lg font-bold text-gray-900">
                          {formatearMoneda(gasto.monto)}
                        </span>
                      </div>
                    </div>

                    {/* Descripción */}
                    {gasto.descripcion && (
                      <p className="text-sm text-gray-600 mt-1">{gasto.descripcion}</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {/* TODO: Implementar edición */}}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Editar gasto"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminar(gasto.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaGastos;