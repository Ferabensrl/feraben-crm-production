import React from 'react';
import { PieChart, BarChart, TrendingUp, TrendingDown } from 'lucide-react';
import { formatearMoneda } from '../../lib/supabase';

interface DashboardGastosProps {
  estadisticas: {
    totalEmpresa: number;
    totalPersonal: number;
    totalGeneral: number;
    porcentajeEmpresa: number;
    porcentajePersonal: number;
    porCategoria: Record<string, { empresa: number; personal: number; total: number }>;
    cantidadGastos: number;
  };
  mes: string;
}

const DashboardGastos: React.FC<DashboardGastosProps> = ({ estadisticas, mes }) => {
  // Obtener top 5 categorías por gasto total
  const topCategorias = Object.entries(estadisticas.porCategoria)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);

  // Datos para el gráfico circular simple (usando barras de progreso)
  const porcentajeEmpresa = estadisticas.porcentajeEmpresa;
  const porcentajePersonal = estadisticas.porcentajePersonal;

  return (
    <div className="space-y-6">
      {/* Gráfico de distribución Empresa vs Personal */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <PieChart className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Distribución Empresa vs Personal</h3>
        </div>
        
        <div className="space-y-4">
          {/* Empresa */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Gastos Empresa</span>
              <span className="text-sm text-gray-500">{porcentajeEmpresa.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-red-600 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${porcentajeEmpresa}%` }}
              ></div>
            </div>
            <div className="text-right mt-1">
              <span className="text-lg font-bold text-gray-900">{formatearMoneda(estadisticas.totalEmpresa)}</span>
            </div>
          </div>

          {/* Personal */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Gastos Personales</span>
              <span className="text-sm text-gray-500">{porcentajePersonal.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${porcentajePersonal}%` }}
              ></div>
            </div>
            <div className="text-right mt-1">
              <span className="text-lg font-bold text-gray-900">{formatearMoneda(estadisticas.totalPersonal)}</span>
            </div>
          </div>
        </div>

        {/* Análisis */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Análisis</h4>
          <div className="text-sm text-gray-600">
            {estadisticas.totalEmpresa > estadisticas.totalPersonal ? (
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-red-600 mr-2" />
                <span>Los gastos de empresa superan a los personales por {formatearMoneda(estadisticas.totalEmpresa - estadisticas.totalPersonal)}</span>
              </div>
            ) : (
              <div className="flex items-center">
                <TrendingDown className="w-4 h-4 text-blue-600 mr-2" />
                <span>Los gastos personales superan a los de empresa por {formatearMoneda(estadisticas.totalPersonal - estadisticas.totalEmpresa)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 Categorías */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <BarChart className="w-5 h-5 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Top 5 Categorías con Mayor Gasto</h3>
        </div>
        
        <div className="space-y-4">
          {topCategorias.map(([categoria, datos], index) => {
            const porcentaje = (datos.total / estadisticas.totalGeneral) * 100;
            return (
              <div key={categoria} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 text-xs font-medium rounded-full mr-3">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{categoria}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">{formatearMoneda(datos.total)}</span>
                    <span className="text-xs text-gray-500 ml-2">({porcentaje.toFixed(1)}%)</span>
                  </div>
                </div>
                
                {/* Desglose Empresa vs Personal */}
                <div className="ml-9 space-y-1">
                  {datos.empresa > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-red-600">Empresa:</span>
                      <span className="text-red-600 font-medium">{formatearMoneda(datos.empresa)}</span>
                    </div>
                  )}
                  {datos.personal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600">Personal:</span>
                      <span className="text-blue-600 font-medium">{formatearMoneda(datos.personal)}</span>
                    </div>
                  )}
                </div>

                {/* Barra de progreso */}
                <div className="ml-9 mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${porcentaje}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {topCategorias.length === 0 && (
          <div className="text-center py-8">
            <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay datos de gastos para mostrar en este mes.</p>
          </div>
        )}
      </div>

      {/* Resumen estadístico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Mes</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total de gastos registrados:</span>
              <span className="font-medium">{estadisticas.cantidadGastos}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Promedio por gasto:</span>
              <span className="font-medium">
                {estadisticas.cantidadGastos > 0 
                  ? formatearMoneda(estadisticas.totalGeneral / estadisticas.cantidadGastos)
                  : formatearMoneda(0)
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Categorías diferentes:</span>
              <span className="font-medium">{Object.keys(estadisticas.porCategoria).length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparación Mensual</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Diferencia absoluta:</span>
              <span className="font-medium">
                {formatearMoneda(Math.abs(estadisticas.totalEmpresa - estadisticas.totalPersonal))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ratio Empresa/Personal:</span>
              <span className="font-medium">
                {estadisticas.totalPersonal > 0 
                  ? (estadisticas.totalEmpresa / estadisticas.totalPersonal).toFixed(2)
                  : '∞'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mayor componente:</span>
              <span className="font-medium">
                {estadisticas.totalEmpresa > estadisticas.totalPersonal ? 'Empresa' : 'Personal'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardGastos;