// --- NUEVO ARCHIVO COMPLETO: src/components/DashboardVendedor.tsx ---

import React, { useMemo } from 'react';
import { Users, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { Cliente, Movimiento, formatearMoneda } from '../lib/supabase';

// Props que recibirá el componente
interface DashboardVendedorProps {
  currentUser: { id: number; nombre: string; rol: 'admin' | 'vendedor' };
  clientes: Cliente[];
  movimientos: Movimiento[];
}

// Componente reutilizable para las tarjetas de métricas
const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-primary">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="text-primary">{icon}</div>
    </div>
  </div>
);

// Componente principal del Dashboard del Vendedor
const DashboardVendedor: React.FC<DashboardVendedorProps> = ({ currentUser, clientes, movimientos }) => {

  // 1. CÁLCULO DE MÉTRICAS ESPECÍFICAS PARA EL VENDEDOR
  const estadisticas = useMemo(() => {
    // Para calcular la deuda, necesitamos TODOS los movimientos, no solo los del vendedor.
    // Esta es una simplificación. Un cálculo 100% preciso requeriría todos los movimientos.
    // Asumimos que los `movimientos` pasados como prop ya están filtrados para el vendedor.
    const saldos: { [key: number]: number } = {};
    movimientos.forEach(mov => {
      saldos[mov.cliente_id] = (saldos[mov.cliente_id] || 0) + mov.importe;
    });

    const clientesConDeuda = clientes.filter(c => (saldos[c.id] || 0) > 0.01);
    const totalDeuda = clientesConDeuda.reduce((sum, c) => sum + (saldos[c.id] || 0), 0);
    
    return {
      totalClientes: clientes.length,
      clientesConDeuda: clientesConDeuda.length,
      totalDeuda,
    };
  }, [clientes, movimientos]);

  // 2. CÁLCULO DEL COMPARATIVO DE VENTAS
  const comparativo = useMemo(() => {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const anioAnterior = anioActual - 1;

    const ventasMesActual = movimientos
      .filter(m => {
        const fechaMov = new Date(m.fecha + 'T00:00:00');
        return m.tipo_movimiento === 'Venta' && fechaMov.getMonth() === mesActual && fechaMov.getFullYear() === anioActual;
      })
      .reduce((sum, m) => sum + m.importe, 0);

    const ventasMesAnterior = movimientos
      .filter(m => {
        const fechaMov = new Date(m.fecha + 'T00:00:00');
        return m.tipo_movimiento === 'Venta' && fechaMov.getMonth() === mesActual && fechaMov.getFullYear() === anioAnterior;
      })
      .reduce((sum, m) => sum + m.importe, 0);

    const crecimiento = ventasMesAnterior > 0 ? ((ventasMesActual - ventasMesAnterior) / ventasMesAnterior) * 100 : (ventasMesActual > 0 ? 100 : 0);
      
    return {
      ventasMesActual,
      ventasMesAnterior,
      crecimiento: isFinite(crecimiento) ? crecimiento : 0,
      mesFormateado: ahora.toLocaleString('es-UY', { month: 'long', year: 'numeric' }),
      mesAnteriorFormateado: ahora.toLocaleString('es-UY', { month: 'long', year: 'numeric' }).replace(String(anioActual), String(anioAnterior)),
    };
  }, [movimientos]);

  // 3. CÁLCULO DE PRINCIPALES DEUDORES
  const principalesDeudores = useMemo(() => {
    const saldos: { [key: number]: number } = {};
    movimientos.forEach(mov => {
      saldos[mov.cliente_id] = (saldos[mov.cliente_id] || 0) + mov.importe;
    });

    return clientes
      .map(c => ({ ...c, deuda: saldos[c.id] || 0 }))
      .filter(c => c.deuda > 0.01)
      .sort((a, b) => b.deuda - a.deuda)
      .slice(0, 5); // Tomamos el top 5
  }, [clientes, movimientos]);


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard de {currentUser.nombre}</h2>
        <p className="text-gray-600 mt-1">Este es tu resumen de actividad personal.</p>
      </div>

      {/* Métricas básicas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Mis Clientes" value={estadisticas.totalClientes} icon={<Users size={28} />} />
        <StatCard title="Clientes con Deuda" value={estadisticas.clientesConDeuda} icon={<AlertTriangle size={28} />} />
        <StatCard title="Mi Deuda Total a Cobrar" value={formatearMoneda(estadisticas.totalDeuda)} icon={<DollarSign size={28} />} />
      </div>

      {/* Comparativo de ventas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Mis Ventas del Mes + Comparativo</h3>
        <div className="flex flex-col md:flex-row items-center justify-between text-center md:text-left">
            <div>
                <p className="text-sm text-gray-500 capitalize">{comparativo.mesFormateado}</p>
                <p className="text-3xl font-bold text-primary">{formatearMoneda(comparativo.ventasMesActual)}</p>
            </div>
            <div className="my-4 md:my-0 text-gray-400 text-xl">vs</div>
            <div>
                <p className="text-sm text-gray-500 capitalize">{comparativo.mesAnteriorFormateado}</p>
                <p className="text-xl font-semibold text-gray-600">{formatearMoneda(comparativo.ventasMesAnterior)}</p>
            </div>
            <div className={`ml-0 md:ml-8 mt-4 md:mt-0 p-3 rounded-lg flex items-center ${comparativo.crecimiento >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <TrendingUp size={24} className="mr-2"/>
                <span className="text-2xl font-bold">
                    {comparativo.crecimiento >= 0 ? '+' : ''}{comparativo.crecimiento.toFixed(1)}%
                </span>
            </div>
        </div>
      </div>

      {/* Principales Deudores */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <AlertTriangle className="mr-2 text-red-500" />
            Mis Principales Deudores
        </h3>
        {principalesDeudores.length > 0 ? (
            <ul className="divide-y divide-gray-200">
                {principalesDeudores.map((cliente, index) => (
                    <li key={cliente.id} className="py-3 flex justify-between items-center">
                        <span className="text-gray-700">
                            <span className="font-bold text-gray-500 mr-3">{index + 1}.</span>
                            {cliente.razon_social}
                        </span>
                        <span className="font-bold text-red-600">{formatearMoneda(cliente.deuda)}</span>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500 text-center py-8">¡Felicidades! Ninguno de tus clientes tiene deudas pendientes.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardVendedor;