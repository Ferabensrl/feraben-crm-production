import React, { useState, useEffect } from 'react';
import { Calculator, Plus, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { 
  getGastos, 
  getEstadisticasGastos, 
  formatearMoneda, 
  formatearFecha,
  type Gasto,
  CATEGORIAS_GASTOS 
} from '../../lib/supabase';
import { useSessionStore } from '../../store/session';
import DashboardGastos from './DashboardGastos';
import FormularioGasto from './FormularioGasto';
import ListaGastos from './ListaGastos';

const GastosView: React.FC = () => {
  const { user: currentUser } = useSessionStore();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [vistaActual, setVistaActual] = useState<'dashboard' | 'lista' | 'agregar'>('dashboard');
  const [añoSeleccionado, setAñoSeleccionado] = useState(() => new Date().getFullYear());
  const [mesSeleccionado, setMesSeleccionado] = useState(() => new Date().getMonth() + 1);
  
  const mesActual = `${añoSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}`;
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const [gastosData, estadisticasData] = await Promise.all([
        getGastos(currentUser.id),
        getEstadisticasGastos(mesActual, currentUser.id)
      ]);
      
      setGastos(gastosData);
      setEstadisticas(estadisticasData);
    } catch (error) {
      console.error('Error cargando datos de gastos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [añoSeleccionado, mesSeleccionado, currentUser]);

  // Verificar permisos de admin
  if (!currentUser || currentUser.rol.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Acceso Restringido</h2>
          <p className="text-gray-500">Esta sección está disponible solo para administradores.</p>
        </div>
      </div>
    );
  }

  const handleGastoCreado = () => {
    cargarDatos();
    setVistaActual('dashboard');
  };

  const handleGastoActualizado = () => {
    cargarDatos();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calculator className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando control de gastos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Calculator className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Control de Gastos</h1>
                <p className="text-sm text-gray-500">Empresa vs Personal - {new Date(añoSeleccionado, mesSeleccionado - 1).toLocaleDateString('es-UY', { year: 'numeric', month: 'long' })}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Selector de Año */}
              <select
                value={añoSeleccionado}
                onChange={(e) => setAñoSeleccionado(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const año = new Date().getFullYear() - 2 + i; // 2 años atrás hasta 7 años adelante
                  return (
                    <option key={año} value={año}>
                      {año}
                    </option>
                  );
                })}
              </select>

              {/* Selector de Mes */}
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const mesNum = i + 1;
                  const nombreMes = new Date(2025, i).toLocaleDateString('es-UY', { month: 'long' });
                  return (
                    <option key={mesNum} value={mesNum}>
                      {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Navegación de pestañas */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setVistaActual('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  vistaActual === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <PieChart className="w-4 h-4 inline mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => setVistaActual('lista')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  vistaActual === 'lista'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Lista de Gastos
              </button>
              <button
                onClick={() => setVistaActual('agregar')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  vistaActual === 'agregar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Agregar Gasto
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Métricas rápidas */}
      {estadisticas && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Empresa</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatearMoneda(estadisticas.totalEmpresa)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {estadisticas.porcentajeEmpresa.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingDown className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Personal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatearMoneda(estadisticas.totalPersonal)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {estadisticas.porcentajePersonal.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatearMoneda(estadisticas.totalGeneral)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {estadisticas.cantidadGastos} gastos
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calculator className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Diferencia</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatearMoneda(estadisticas.totalEmpresa - estadisticas.totalPersonal)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {estadisticas.totalEmpresa > estadisticas.totalPersonal ? 'Empresa mayor' : 'Personal mayor'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {vistaActual === 'dashboard' && estadisticas && (
          <DashboardGastos 
            estadisticas={estadisticas} 
            mes={mesActual}
          />
        )}
        
        {vistaActual === 'lista' && (
          <ListaGastos 
            gastos={gastos}
            onGastoActualizado={handleGastoActualizado}
            mesActual={mesActual}
          />
        )}
        
        {vistaActual === 'agregar' && (
          <FormularioGasto 
            onGastoCreado={handleGastoCreado}
            usuarioId={currentUser.id}
          />
        )}
      </div>
    </div>
  );
};

export default GastosView;