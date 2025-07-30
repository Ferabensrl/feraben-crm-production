import React, { useMemo, useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp,
  Award, 
  UserCheck,
  FileText,
  Activity,
  Clock,
  CreditCard,
  Target,
  User,
  MapPin,
  Calendar,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatearMoneda } from '../lib/supabase';
import { Cliente, Movimiento } from '../lib/supabase';

interface DashboardProps {
  clientes: Cliente[];
  movimientos: Movimiento[];
  currentUser: { id: number; nombre: string; rol: 'admin' | 'vendedor' };
  cheques?: any[];
}

// 🎯 COMPONENTE PARA MÉTRICAS COMPACTAS
const MiniMetrica: React.FC<{
  valor: string | number;
  label: string;
  icono: React.ReactNode;
  color?: string;
}> = ({ valor, label, icono, color = "gray" }) => (
  <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center space-x-3 hover:shadow-md transition-shadow">
    <div className={`p-2 rounded-full ${
      color === 'blue' ? 'bg-blue-100' :
      color === 'green' ? 'bg-green-100' :
      color === 'purple' ? 'bg-purple-100' :
      color === 'red' ? 'bg-red-100' :
      'bg-gray-100'
    }`}>
      {React.cloneElement(icono as React.ReactElement, { 
        size: 20, 
        className: `${
          color === 'blue' ? 'text-blue-600' :
          color === 'green' ? 'text-green-600' :
          color === 'purple' ? 'text-purple-600' :
          color === 'red' ? 'text-red-600' :
          'text-gray-600'
        }` 
      })}
    </div>
    <div>
      <div className="text-xl font-bold text-gray-900">{valor}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </div>
  </div>
);

// 🏆 DASHBOARD ESPECÍFICO PARA VENDEDORES
const DashboardVendedor: React.FC<DashboardProps> = ({ clientes, movimientos, currentUser, cheques = [] }) => {
  
  const estadisticasVendedor = useMemo(() => {
    console.log(`📊 Calculando estadísticas para vendedor ${currentUser.nombre}`);
    console.log(`📊 Datos del vendedor - Clientes: ${clientes.length}, Movimientos: ${movimientos.length}`);

    // Calcular saldos de mis clientes
    const saldosClientes: { [key: number]: number } = {};
    movimientos.forEach(mov => {
      saldosClientes[mov.cliente_id] = (saldosClientes[mov.cliente_id] || 0) + mov.importe;
    });

    // Métricas básicas
    const totalClientes = clientes.length;
    const clientesConDeuda = clientes.filter(c => (saldosClientes[c.id] || 0) > 0.01);
    const totalDeuda = clientesConDeuda.reduce((sum, c) => sum + (saldosClientes[c.id] || 0), 0);

    // Comparativo mes actual vs año anterior
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const añoActual = fechaActual.getFullYear();
    const añoAnterior = añoActual - 1;

    // Ventas NETAS del mes actual (Ventas - Devoluciones)
    let ventasMesActual = 0;
    movimientos
      .filter(m => {
        const fecha = new Date(m.fecha + 'T00:00:00');
        return (m.tipo_movimiento === 'Venta' || m.tipo_movimiento === 'Devolución') && 
               fecha.getMonth() + 1 === mesActual && 
               fecha.getFullYear() === añoActual;
      })
      .forEach(m => {
        if (m.tipo_movimiento === 'Venta') {
          ventasMesActual += m.importe;
        } else if (m.tipo_movimiento === 'Devolución') {
          ventasMesActual -= Math.abs(m.importe); // Devoluciones reducen las ventas
        }
      });

    // Ventas NETAS del mismo mes año anterior (Ventas - Devoluciones)
    let ventasMesAnterior = 0;
    movimientos
      .filter(m => {
        const fecha = new Date(m.fecha + 'T00:00:00');
        return (m.tipo_movimiento === 'Venta' || m.tipo_movimiento === 'Devolución') && 
               fecha.getMonth() + 1 === mesActual && 
               fecha.getFullYear() === añoAnterior;
      })
      .forEach(m => {
        if (m.tipo_movimiento === 'Venta') {
          ventasMesAnterior += m.importe;
        } else if (m.tipo_movimiento === 'Devolución') {
          ventasMesAnterior -= Math.abs(m.importe); // Devoluciones reducen las ventas
        }
      });

    // Cobros del mes actual (solo Pagos y Notas de Crédito)
    const cobrosMesActual = movimientos
      .filter(m => {
        const fecha = new Date(m.fecha + 'T00:00:00');
        return ['Pago', 'Nota de Crédito'].includes(m.tipo_movimiento) && 
               fecha.getMonth() + 1 === mesActual && 
               fecha.getFullYear() === añoActual;
      })
      .reduce((sum, m) => sum + Math.abs(m.importe), 0);

    // Calcular crecimiento
    const crecimientoVentas = ventasMesAnterior > 0 ? ((ventasMesActual - ventasMesAnterior) / ventasMesAnterior) * 100 : 0;

    // Mis principales deudores
    const misDeudores = clientesConDeuda
      .map(c => ({ 
        id: c.id, 
        razon_social: c.razon_social, 
        deuda: saldosClientes[c.id] || 0,
        ciudad: c.ciudad
      }))
      .sort((a, b) => b.deuda - a.deuda)
      .slice(0, 3);

    // Comisión estimada (15% sobre ventas)
    const comisionEstimada = ventasMesActual * 0.15;

    // Actividad del mes
    const movimientosMes = movimientos.filter(m => {
      const fecha = new Date(m.fecha + 'T00:00:00');
      return fecha.getMonth() + 1 === mesActual && fecha.getFullYear() === añoActual;
    }).length;

    return {
      totalClientes,
      clientesConDeuda: clientesConDeuda.length,
      totalDeuda,
      ventasMesActual,
      ventasMesAnterior,
      cobrosMesActual,
      crecimientoVentas,
      misDeudores,
      comisionEstimada,
      movimientosMes,
      mesComparativo: `${String(mesActual).padStart(2, '0')}/${añoActual}`,
      mesAnteriorTexto: `${String(mesActual).padStart(2, '0')}/${añoAnterior}`
    };
  }, [clientes, movimientos, currentUser]);

  // Control de cheques del vendedor
  const controlCheques = useMemo(() => {
    if (!cheques || cheques.length === 0) {
      return {
        total: 0,
        pendientes: 0,
        importeTotal: 0,
        mensaje: 'Sin cheques asignados'
      };
    }

    const chequesPendientes = cheques.filter(c => c.estado === 'Pendiente');
    const importeTotal = chequesPendientes.reduce((sum, c) => sum + (c.importe || 0), 0);

    return {
      total: cheques.length,
      pendientes: chequesPendientes.length,
      importeTotal,
      mensaje: chequesPendientes.length > 0 ? `${chequesPendientes.length} pendientes` : 'Todos al día'
    };
  }, [cheques]);

  return (
    <div className="space-y-6">
      {/* 🔝 HEADER PERSONALIZADO PARA VENDEDOR */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center">
          <User className="mr-3 text-primary" size={28} />
          Mi Dashboard - {currentUser.nombre}
        </h2>
        <p className="text-gray-600 mt-1">
          Bienvenido a tu espacio personal. Aquí tienes un resumen de tus clientes y actividad.
        </p>
      </div>
      
      {/* 📊 MÉTRICAS BÁSICAS DEL VENDEDOR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MiniMetrica 
          valor={estadisticasVendedor.totalClientes} 
          label="Mis Clientes" 
          icono={<Users />} 
          color="blue" 
        />
        <MiniMetrica 
          valor={estadisticasVendedor.clientesConDeuda} 
          label="Con Deuda" 
          icono={<AlertTriangle />} 
          color="red" 
        />
        <MiniMetrica 
          valor={estadisticasVendedor.movimientosMes} 
          label="Movimientos/Mes" 
          icono={<FileText />} 
          color="green" 
        />
        <MiniMetrica 
          valor={formatearMoneda(estadisticasVendedor.comisionEstimada)} 
          label="Comisión Est." 
          icono={<Target />} 
          color="purple" 
        />
      </div>

      {/* 📈 MI RENDIMIENTO MENSUAL + COMPARATIVO */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <TrendingUp className="mr-3 text-primary" size={24} />
          Mi Rendimiento del Mes + Comparativo Anual
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ventas del mes */}
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center justify-center">
              <TrendingUp className="mr-1" size={16} />
              Mis Ventas - {estadisticasVendedor.mesComparativo}
            </h4>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {formatearMoneda(estadisticasVendedor.ventasMesActual)}
            </div>
            <div className={`text-sm font-medium mb-1 flex items-center justify-center ${
              estadisticasVendedor.crecimientoVentas >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {estadisticasVendedor.crecimientoVentas >= 0 ? '↗️' : '↘️'} 
              {Math.abs(estadisticasVendedor.crecimientoVentas).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">vs {estadisticasVendedor.mesAnteriorTexto}</div>
          </div>

          {/* Cobros del mes */}
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center justify-center">
              <DollarSign className="mr-1" size={16} />
              Mis Cobros - {estadisticasVendedor.mesComparativo}
            </h4>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatearMoneda(estadisticasVendedor.cobrosMesActual)}
            </div>
            <div className="text-xs text-gray-600">Cobrado este mes</div>
          </div>

          {/* Deuda total */}
          <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
            <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center justify-center">
              <AlertTriangle className="mr-1" size={16} />
              Mi Cartera Total
            </h4>
            <div className="text-2xl font-bold text-red-600 mb-1">
              {formatearMoneda(estadisticasVendedor.totalDeuda)}
            </div>
            <div className="text-xs text-gray-600">{estadisticasVendedor.clientesConDeuda} clientes deben</div>
          </div>
        </div>
      </div>

      {/* 🎯 MIS PRINCIPALES DEUDORES + CONTROL DE CHEQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Mis principales deudores */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="mr-2 text-red-500" size={20} />
            Mis Principales Deudores
          </h3>
          {estadisticasVendedor.misDeudores.length > 0 ? (
            <div className="space-y-3">
              {estadisticasVendedor.misDeudores.map((cliente, index) => (
                <div key={cliente.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {cliente.razon_social}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <MapPin size={10} className="mr-1" />
                        {cliente.ciudad}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600">
                    {formatearMoneda(cliente.deuda)}
                  </div>
                </div>
              ))}
              
              {/* Resumen */}
              <div className="border-t pt-3 mt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total adeudado:</span>
                  <span className="font-bold text-red-600">
                    {formatearMoneda(estadisticasVendedor.totalDeuda)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm text-gray-500">
                ¡Excelente! Ninguno de tus clientes tiene deudas pendientes.
              </p>
            </div>
          )}
        </div>

        {/* Control de mis cheques */}
        {currentUser.rol === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="mr-2 text-orange-500" size={20} />
              Mis Cheques
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-orange-800">Total de Cheques</div>
                    <div className="text-2xl font-bold text-orange-600">{controlCheques.total}</div>
                  </div>
                  <CreditCard className="text-orange-500" size={32} />
                </div>
              </div>

              {controlCheques.pendientes > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-yellow-800">Pendientes</div>
                      <div className="text-xl font-bold text-yellow-600">{controlCheques.pendientes}</div>
                    </div>
                    <Clock className="text-yellow-500" size={24} />
                  </div>
                  <div className="mt-2 text-sm text-yellow-700">
                    Valor: {formatearMoneda(controlCheques.importeTotal)}
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-gray-500">
                {controlCheques.mensaje}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 💡 MENSAJE MOTIVACIONAL PARA VENDEDOR */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/20 border border-primary/30 rounded-lg p-6">
        <div className="flex items-center">
          <Award className="text-primary mr-4" size={32} />
          <div>
            <h4 className="text-lg font-semibold text-primary-dark mb-1">
              ¡Sigue así, {currentUser.nombre}! 🚀
            </h4>
            <p className="text-sm text-primary-dark/80">
              {estadisticasVendedor.crecimientoVentas > 0 
                ? `Tus ventas crecieron ${estadisticasVendedor.crecimientoVentas.toFixed(1)}% respecto al año pasado. ¡Excelente trabajo!`
                : 'Tienes todo bajo control. Sigue trabajando para alcanzar tus objetivos.'}
            </p>
            {estadisticasVendedor.totalClientes > 0 && (
              <p className="text-xs text-primary-dark/60 mt-2">
                Gestionas {estadisticasVendedor.totalClientes} clientes con una cartera de {formatearMoneda(estadisticasVendedor.totalDeuda)} por cobrar.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 📈 ANÁLISIS VENTAS ÚLTIMOS 4 MESES */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="mr-3 text-primary" size={24} />
          Mis Ventas NETAS - Últimos 4 Meses (Análisis Cuatrimestral)
        </h3>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Ventas Netas:</strong> Se incluyen las ventas y se descuentan las devoluciones para mostrar el ingreso real de cada mes.
          </p>
        </div>
        
        <VentasUltimos4Meses movimientos={movimientos} esVendedor={true} />
      </div>

      {/* 📊 FOOTER INFORMATIVO PARA VENDEDOR */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Vista personalizada
            </span>
            <span className="flex items-center">
              <Clock className="mr-1" size={14} />
              Actualizado automáticamente
            </span>
          </div>
          <div>
            Dashboard Vendedor - {currentUser.nombre}
          </div>
        </div>
      </div>
    </div>
  );
};

// 🏆 DASHBOARD PARA ADMINISTRADORES
const DashboardAdmin: React.FC<DashboardProps> = ({ clientes, movimientos, currentUser, cheques = [] }) => {
  
  const estadisticas = useMemo(() => {
    console.log(`📊 Calculando estadísticas para ADMIN ${currentUser.nombre}`);
    console.log(`📊 Datos de toda la empresa - Clientes: ${clientes.length}, Movimientos: ${movimientos.length}`);

    // Calcular saldos usando TODOS los movimientos de la empresa
    const saldosGlobales: { [key: number]: number } = {};
    for (const mov of movimientos) {
      saldosGlobales[mov.cliente_id] = (saldosGlobales[mov.cliente_id] || 0) + mov.importe;
    }

    // Métricas principales
    const totalClientes = clientes.length;
    
    // Clientes con deuda (usando saldos globales)
    const clientesConDeuda = clientes.filter(c => (saldosGlobales[c.id] || 0) > 0.01);
    const totalDeuda = clientesConDeuda.reduce((sum, c) => sum + (saldosGlobales[c.id] || 0), 0);
    
    // Calcular métricas del mes actual
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    
    let ventasMesActual = 0;
    let pagosMesActual = 0;
    
    const movimientosMesActual = movimientos.filter(m => {
      const fecha = new Date(m.fecha + "T00:00:00");
      const enRango = fecha >= inicioMes && fecha <= ahora;
      
      if (enRango) {
        if (m.tipo_movimiento === 'Venta') {
          ventasMesActual += m.importe;
        } else if (m.tipo_movimiento === 'Devolución') {
          // Las devoluciones reducen las ventas NETAS
          ventasMesActual -= Math.abs(m.importe);
        }
        if (['Pago', 'Nota de Crédito'].includes(m.tipo_movimiento)) {
          pagosMesActual += Math.abs(m.importe);
        }
      }
      return enRango;
    });

    // Top 5 Deudores
    const topDeudores = clientesConDeuda
      .map(c => ({ 
        id: c.id, 
        razon_social: c.razon_social, 
        deuda: saldosGlobales[c.id] || 0 
      }))
      .sort((a, b) => b.deuda - a.deuda)
      .slice(0, 5);

    // Rendimiento de vendedores
    const vendedoresMap: { [key: number]: { nombre: string, ventas: number, pagos: number } } = {};
    
    clientes.forEach(c => {
      if (c.vendedor_id && c.vendedor_nombre && !vendedoresMap[c.vendedor_id]) {
        vendedoresMap[c.vendedor_id] = { 
          nombre: c.vendedor_nombre, 
          ventas: 0, 
          pagos: 0 
        };
      }
    });

    movimientosMesActual.forEach(m => {
      if (m.vendedor_id && vendedoresMap[m.vendedor_id]) {
        if (m.tipo_movimiento === 'Venta') {
          vendedoresMap[m.vendedor_id].ventas += m.importe;
        } else if (m.tipo_movimiento === 'Devolución') {
          // Las devoluciones reducen las ventas del vendedor
          vendedoresMap[m.vendedor_id].ventas -= Math.abs(m.importe);
        } else if (['Pago', 'Nota de Crédito'].includes(m.tipo_movimiento)) {
          vendedoresMap[m.vendedor_id].pagos += Math.abs(m.importe);
        }
      }
    });
    
    const rendimientoVendedores = Object.entries(vendedoresMap)
      .map(([id, data]) => ({
        id: parseInt(id),
        ...data,
        total: data.ventas + data.pagos
      }))
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 5);

    return {
      totalClientes,
      clientesConDeuda: clientesConDeuda.length,
      totalDeuda,
      movimientosMes: movimientosMesActual.length,
      ventasMesActual,
      pagosMesActual,
      topDeudores,
      rendimientoVendedores
    };
  }, [clientes, movimientos, currentUser]);

  // Calcular comparativo anual
  const comparativoAnual = useMemo(() => {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const añoActual = fechaActual.getFullYear();
    const añoAnterior = añoActual - 1;

    // Movimientos del mes actual
    const movimientosMesActual = movimientos.filter(m => {
      const fecha = new Date(m.fecha + 'T00:00:00');
      return fecha.getMonth() + 1 === mesActual && fecha.getFullYear() === añoActual;
    });

    // Movimientos del mismo mes año anterior
    const movimientosMesAnterior = movimientos.filter(m => {
      const fecha = new Date(m.fecha + 'T00:00:00');
      return fecha.getMonth() + 1 === mesActual && fecha.getFullYear() === añoAnterior;
    });

    // Calcular ventas NETAS (Ventas - Devoluciones)
    let ventasActual = 0;
    movimientosMesActual.forEach(m => {
      if (m.tipo_movimiento === 'Venta') {
        ventasActual += m.importe;
      } else if (m.tipo_movimiento === 'Devolución') {
        ventasActual -= Math.abs(m.importe);
      }
    });
    
    let ventasAnterior = 0;
    movimientosMesAnterior.forEach(m => {
      if (m.tipo_movimiento === 'Venta') {
        ventasAnterior += m.importe;
      } else if (m.tipo_movimiento === 'Devolución') {
        ventasAnterior -= Math.abs(m.importe);
      }
    });

    // Calcular cobros (solo Pagos y Notas de Crédito)
    const cobrosActual = movimientosMesActual
      .filter(m => ['Pago', 'Nota de Crédito'].includes(m.tipo_movimiento))
      .reduce((sum, m) => sum + Math.abs(m.importe), 0);
    
    const cobrosAnterior = movimientosMesAnterior
      .filter(m => ['Pago', 'Nota de Crédito'].includes(m.tipo_movimiento))
      .reduce((sum, m) => sum + Math.abs(m.importe), 0);

    // Calcular porcentajes de crecimiento
    const crecimientoVentas = ventasAnterior > 0 ? ((ventasActual - ventasAnterior) / ventasAnterior) * 100 : 0;
    const crecimientoCobros = cobrosAnterior > 0 ? ((cobrosActual - cobrosAnterior) / cobrosAnterior) * 100 : 0;

    return {
      mesActual: `${String(mesActual).padStart(2, '0')}/${añoActual}`,
      mesAnterior: `${String(mesActual).padStart(2, '0')}/${añoAnterior}`,
      ventasActual,
      ventasAnterior,
      cobrosActual,
      cobrosAnterior,
      crecimientoVentas,
      crecimientoCobros
    };
  }, [movimientos]);

  // Control avanzado de cheques (solo admins)
  const resumenCheques = useMemo(() => {
    const baseResumen = {
      total: 0,
      paraDepositoHoy: 0,
      importeDepositoHoy: 0
    };

    if (!cheques || cheques.length === 0) {
      return baseResumen;
    }

    const DIAS_PLAZO = 30;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    cheques
      .filter(c => c.estado === 'Pendiente')
      .forEach(c => {
        const importe = c.importe || 0;
        const venc = new Date(c.fecha_vencimiento + 'T00:00:00');
        const diffDias = Math.floor((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        baseResumen.total += 1;

        if (diffDias <= 0 && diffDias >= -DIAS_PLAZO) {
          baseResumen.paraDepositoHoy += 1;
          baseResumen.importeDepositoHoy += importe;
        }
      });

    return baseResumen;
  }, [cheques]);

  // Calcular número total de vendedores únicos
  const totalVendedores = useMemo(() => {
    const vendedoresUnicos = new Set(clientes.map(c => c.vendedor_id));
    return vendedoresUnicos.size;
  }, [clientes]);

  return (
    <div className="space-y-6">
      {/* 🔝 HEADER DEL DASHBOARD ADMIN */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center">
          <Activity className="mr-3 text-primary" size={28} />
          Dashboard Ejecutivo - Feraben
        </h2>
        <p className="text-gray-600 mt-1">
          Información estratégica y análisis en tiempo real de toda la empresa.
        </p>
      </div>
      
      {/* 📊 MÉTRICAS COMPACTAS ADMIN */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniMetrica 
          valor={estadisticas.totalClientes} 
          label="Clientes Totales" 
          icono={<Users />} 
          color="blue" 
        />
        <MiniMetrica 
          valor={estadisticas.movimientosMes} 
          label="Movimientos/Mes" 
          icono={<FileText />} 
          color="green" 
        />
        <MiniMetrica 
          valor={totalVendedores} 
          label="Vendedores Activos" 
          icono={<UserCheck />} 
          color="purple" 
        />
        <MiniMetrica
          valor={resumenCheques.total}
          label="Cheques en Sistema"
          icono={<CreditCard />}
          color="blue"
        />
      </div>

      {/* 📈 RENDIMIENTO EMPRESARIAL + COMPARATIVO */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <TrendingUp className="mr-3 text-primary" size={24} />
          Rendimiento Empresarial + Comparativo Anual
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ventas empresariales */}
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center justify-center">
              <TrendingUp className="mr-1" size={16} />
              Ventas {comparativoAnual.mesActual}
            </h4>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {formatearMoneda(comparativoAnual.ventasActual)}
            </div>
            <div className={`text-sm font-medium mb-1 flex items-center justify-center ${
              comparativoAnual.crecimientoVentas >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {comparativoAnual.crecimientoVentas >= 0 ? '↗️' : '↘️'} 
              {Math.abs(comparativoAnual.crecimientoVentas).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">vs {comparativoAnual.mesAnterior}</div>
          </div>

          {/* Cobros empresariales */}
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center justify-center">
              <DollarSign className="mr-1" size={16} />
              Cobros {comparativoAnual.mesActual}
            </h4>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatearMoneda(comparativoAnual.cobrosActual)}
            </div>
            <div className={`text-sm font-medium mb-1 flex items-center justify-center ${
              comparativoAnual.crecimientoCobros >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {comparativoAnual.crecimientoCobros >= 0 ? '↗️' : '↘️'} 
              {Math.abs(comparativoAnual.crecimientoCobros).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">vs {comparativoAnual.mesAnterior}</div>
          </div>

          {/* Deuda total */}
          <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
            <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center justify-center">
              <AlertTriangle className="mr-1" size={16} />
              Deuda Total Empresa
            </h4>
            <div className="text-2xl font-bold text-red-600 mb-1">
              {formatearMoneda(estadisticas.totalDeuda)}
            </div>
            <div className="text-xs text-gray-600">{estadisticas.clientesConDeuda} clientes con deuda</div>
          </div>
        </div>
      </div>

      {/* 🎯 WIDGETS EJECUTIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Control de cheques empresarial */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="mr-2 text-orange-500" size={20} />
            Control de Cheques
          </h3>
          <div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-sm font-medium text-purple-800">Para depósito hoy</div>
              <div className="text-xl font-bold text-purple-600">{resumenCheques.paraDepositoHoy}</div>
              <div className="mt-1 text-sm text-purple-700">
                {formatearMoneda(resumenCheques.importeDepositoHoy)}
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <a href="/cheques" className="text-sm text-primary hover:underline">Ver todos los cheques</a>
          </div>
        </div>

        {/* Top deudores empresariales */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="mr-2 text-red-500" size={20} />
            Principales Deudores
          </h3>
          {estadisticas.topDeudores.length > 0 ? (
            <div className="space-y-3">
              {estadisticas.topDeudores.map((cliente, index) => (
                <div key={cliente.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {cliente.razon_social}
                      </div>
                      <div className="text-xs text-gray-500">
                        Posición #{index + 1}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600">
                    {formatearMoneda(cliente.deuda)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm text-gray-500">No hay clientes con deudas pendientes</p>
            </div>
          )}
        </div>

        {/* Top vendedores del mes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="mr-2 text-primary" size={20} />
            Top Vendedores del Mes
          </h3>
          {estadisticas.rendimientoVendedores.length > 0 ? (
            <div className="space-y-3">
              {estadisticas.rendimientoVendedores.map((vendedor, index) => (
                <div key={vendedor.id} className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {formatearMoneda(vendedor.ventas)}
                    </span>
                  </div>
                  <div className="font-medium text-gray-900 text-sm">{vendedor.nombre}</div>
                  <div className="text-xs text-gray-500">
                    Cobros: {formatearMoneda(vendedor.pagos)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Award className="mx-auto mb-2 text-gray-300" size={32} />
              <p className="text-sm">Sin actividad este mes</p>
            </div>
          )}
        </div>
      </div>

      {/* 📊 ANÁLISIS VENTAS ANUALES (SOLO ADMIN) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="mr-3 text-orange-500" size={24} />
          Análisis de Ventas Anuales - Vista Ejecutiva
        </h3>
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            👑 <strong>Solo Admin:</strong> Métricas anuales para análisis estratégico y conclusiones de fin de año.
          </p>
        </div>
        
        <VentasAnuales movimientos={movimientos} />
      </div>

      {/* 📈 ANÁLISIS VENTAS EMPRESARIALES ÚLTIMOS 4 MESES */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="mr-3 text-primary" size={24} />
          Ventas NETAS Empresariales - Últimos 4 Meses (Análisis Cuatrimestral)
        </h3>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Ventas Netas:</strong> Se incluyen las ventas y se descuentan las devoluciones para mostrar el ingreso real empresarial de cada mes.
          </p>
        </div>
        
        <VentasUltimos4Meses movimientos={movimientos} esVendedor={false} />
      </div>

      {/* 📊 FOOTER EJECUTIVO */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Sistema operativo - Todos los datos
            </span>
            <span className="flex items-center">
              <Clock className="mr-1" size={14} />
              Actualizado automáticamente
            </span>
          </div>
          <div>
            Dashboard Ejecutivo v2.0 - {currentUser.nombre} (Admin)
          </div>
        </div>
      </div>
    </div>
  );
};

// 🎯 COMPONENTE PRINCIPAL - SELECTOR DE DASHBOARD SEGÚN ROL
const Dashboard: React.FC<DashboardProps> = ({ clientes, movimientos, currentUser, cheques = [] }) => {
  const esAdmin = currentUser.rol.toLowerCase() === 'admin';
  
  console.log(`🎯 Renderizando dashboard para ${esAdmin ? 'ADMIN' : 'VENDEDOR'}: ${currentUser.nombre}`);
  
  if (esAdmin) {
    return <DashboardAdmin clientes={clientes} movimientos={movimientos} currentUser={currentUser} cheques={cheques} />;
  } else {
    return <DashboardVendedor clientes={clientes} movimientos={movimientos} currentUser={currentUser} cheques={cheques} />;
  }
};

// 📈 COMPONENTE VENTAS ÚLTIMOS 4 MESES
const VentasUltimos4Meses: React.FC<{
  movimientos: Movimiento[];
  esVendedor: boolean;
}> = ({ movimientos, esVendedor }) => {
  
  const analisisVentas = useMemo(() => {
    const hoy = new Date();
    const meses = [];
    
    // Generar últimos 4 meses
    for (let i = 1; i <= 4; i++) {
      const fechaMes = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const año = fechaMes.getFullYear();
      const mes = fechaMes.getMonth() + 1;
      
      // Filtrar movimientos de ventas Y devoluciones de este mes
      const movimientosMes = movimientos.filter(m => {
        const fechaMovimiento = new Date(m.fecha + 'T00:00:00');
        const fechaCorrecta = fechaMovimiento.getFullYear() === año && 
                             fechaMovimiento.getMonth() + 1 === mes;
        
        // Incluir Ventas y Devoluciones para cálculo real
        return fechaCorrecta && (m.tipo_movimiento === 'Venta' || m.tipo_movimiento === 'Devolución');
      });
      
      // Calcular ventas netas (Ventas - Devoluciones)
      let totalVentas = 0;
      let cantidadVentas = 0;
      
      movimientosMes.forEach(m => {
        if (m.tipo_movimiento === 'Venta') {
          totalVentas += m.importe;
          cantidadVentas++;
        } else if (m.tipo_movimiento === 'Devolución') {
          // Las devoluciones reducen las ventas (pueden ser negativas o positivas)
          totalVentas -= Math.abs(m.importe);
        }
      });
      
      // Nombres de meses en español
      const nombresMeses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
      meses.push({
        año,
        mes,
        nombreMes: nombresMeses[mes - 1],
        totalVentas,
        cantidadVentas,
        mesTexto: `${nombresMeses[mes - 1]} ${año}`,
        mesCorto: `${String(mes).padStart(2, '0')}/${año}`
      });
    }
    
    // Ordenar del más antiguo al más reciente para mostrar cronológicamente
    meses.reverse();
    
    // Calcular totales y promedios
    const totalGeneral = meses.reduce((sum, m) => sum + m.totalVentas, 0);
    const totalTransacciones = meses.reduce((sum, m) => sum + m.cantidadVentas, 0);
    const promedioMensual = totalGeneral / 4;
    
    // Identificar mejor y peor mes
    const mejorMes = meses.reduce((max, mes) => mes.totalVentas > max.totalVentas ? mes : max, meses[0]);
    const peorMes = meses.reduce((min, mes) => mes.totalVentas < min.totalVentas ? mes : min, meses[0]);
    
    return {
      meses,
      totalGeneral,
      totalTransacciones,
      promedioMensual,
      mejorMes,
      peorMes
    };
  }, [movimientos]);
  
  // Calcular altura relativa para barras
  const maxVenta = Math.max(...analisisVentas.meses.map(m => m.totalVentas));
  
  return (
    <div className="space-y-6">
      {/* 📊 Resumen Ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {formatearMoneda(analisisVentas.totalGeneral)}
          </div>
          <div className="text-sm text-blue-800 font-medium">Total 4 Meses</div>
        </div>
        
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {formatearMoneda(analisisVentas.promedioMensual)}
          </div>
          <div className="text-sm text-green-800 font-medium">Promedio Mensual</div>
        </div>
        
        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {analisisVentas.totalTransacciones}
          </div>
          <div className="text-sm text-purple-800 font-medium">Total Transacciones</div>
        </div>
        
        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
          <div className="text-2xl font-bold text-orange-600 mb-1">
            {(analisisVentas.totalTransacciones / 4).toFixed(1)}
          </div>
          <div className="text-sm text-orange-800 font-medium">Ventas/Mes Promedio</div>
        </div>
      </div>

      {/* 📈 Gráfico de Barras Horizontal */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="mr-2 text-primary" size={20} />
          {esVendedor ? 'Mi Evolución' : 'Evolución Empresarial'} - Últimos 4 Meses
        </h4>
        
        {analisisVentas.meses.map((mes, index) => {
          const altura = maxVenta > 0 ? (mes.totalVentas / maxVenta) * 100 : 0;
          const esMejorMes = mes === analisisVentas.mejorMes;
          const esPeorMes = mes === analisisVentas.peorMes && analisisVentas.peorMes.totalVentas < analisisVentas.mejorMes.totalVentas;
          
          return (
            <div key={`${mes.año}-${mes.mes}`} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-24 text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="mr-1" size={14} />
                {mes.mesCorto}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${
                        esMejorMes ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        esPeorMes ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        'bg-gradient-to-r from-blue-400 to-blue-600'
                      }`}
                      style={{ width: `${Math.max(altura, 10)}%` }}
                    >
                      <span className="text-white text-xs font-bold">
                        {formatearMoneda(mes.totalVentas)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-16 text-sm text-gray-600 text-center">
                    {mes.cantidadVentas} ops
                  </div>
                  
                  {esMejorMes && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">↑</span>
                    </div>
                  )}
                  
                  {esPeorMes && (
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">↓</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-1 text-xs text-gray-500">
                  {mes.mesTexto}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🎯 Insights del Análisis */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
        <h5 className="font-semibold text-gray-900 mb-2 flex items-center">
          <Target className="mr-2 text-primary" size={16} />
          Análisis del Cuatrimestre
        </h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-green-700">💚 Mejor mes: </span>
            <span className="text-gray-800">
              {analisisVentas.mejorMes.mesTexto} con {formatearMoneda(analisisVentas.mejorMes.totalVentas)}
            </span>
          </div>
          
          {analisisVentas.peorMes.totalVentas < analisisVentas.mejorMes.totalVentas && (
            <div>
              <span className="font-medium text-red-700">📉 Mes más bajo: </span>
              <span className="text-gray-800">
                {analisisVentas.peorMes.mesTexto} con {formatearMoneda(analisisVentas.peorMes.totalVentas)}
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-3 text-xs text-gray-600">
          💡 <strong>Contexto de negocio:</strong> Análisis por cuatrimestres para decisiones estratégicas según el modelo de negocio Feraben.
        </div>
      </div>
    </div>
  );
};

// 📊 COMPONENTE VENTAS ANUALES (SOLO ADMIN)
const VentasAnuales: React.FC<{
  movimientos: Movimiento[];
}> = ({ movimientos }) => {
  
  const añoActual = new Date().getFullYear();
  const [añoSeleccionado, setAñoSeleccionado] = useState(añoActual);
  
  const analisisAnual = useMemo(() => {
    // Obtener años disponibles en los datos
    const añosSet = new Set(
      movimientos
        .filter(m => m.tipo_movimiento === 'Venta' || m.tipo_movimiento === 'Devolución')
        .map(m => new Date(m.fecha + 'T00:00:00').getFullYear())
    );
    const añosDisponibles = Array.from(añosSet).sort((a, b) => b - a); // Ordenar descendente
    
    if (añosDisponibles.length === 0) {
      return {
        añosDisponibles: [añoActual],
        ventasAñoActual: 0,
        ventasAñoAnterior: 0,
        ventasAñoSeleccionado: 0,
        transaccionesAñoActual: 0,
        transaccionesAñoSeleccionado: 0,
        crecimientoAnual: 0,
        promedioMensual: 0,
        mejorMes: null,
        peorMes: null,
        mesesDetalle: []
      };
    }
    
    // Calcular ventas netas por año
    const calcularVentasAño = (año: number) => {
      let ventasNetas = 0;
      let transacciones = 0;
      
      movimientos.forEach(m => {
        const fechaMovimiento = new Date(m.fecha + 'T00:00:00');
        if (fechaMovimiento.getFullYear() === año) {
          if (m.tipo_movimiento === 'Venta') {
            ventasNetas += m.importe;
            transacciones++;
          } else if (m.tipo_movimiento === 'Devolución') {
            ventasNetas -= Math.abs(m.importe);
          }
        }
      });
      
      return { ventasNetas, transacciones };
    };
    
    // Calcular ventas por mes del año seleccionado
    const calcularVentasPorMes = (año: number) => {
      const meses = [];
      const nombresMeses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
      for (let mes = 1; mes <= 12; mes++) {
        let ventasMes = 0;
        let transaccionesMes = 0;
        
        movimientos.forEach(m => {
          const fechaMovimiento = new Date(m.fecha + 'T00:00:00');
          if (fechaMovimiento.getFullYear() === año && fechaMovimiento.getMonth() + 1 === mes) {
            if (m.tipo_movimiento === 'Venta') {
              ventasMes += m.importe;
              transaccionesMes++;
            } else if (m.tipo_movimiento === 'Devolución') {
              ventasMes -= Math.abs(m.importe);
            }
          }
        });
        
        meses.push({
          mes,
          nombreMes: nombresMeses[mes - 1],
          ventasNetas: ventasMes,
          transacciones: transaccionesMes
        });
      }
      
      return meses;
    };
    
    const ventasAñoActual = calcularVentasAño(añoActual);
    const ventasAñoAnterior = calcularVentasAño(añoActual - 1);
    const ventasAñoSeleccionado = calcularVentasAño(añoSeleccionado);
    
    const crecimientoAnual = ventasAñoAnterior.ventasNetas > 0 
      ? ((ventasAñoActual.ventasNetas - ventasAñoAnterior.ventasNetas) / ventasAñoAnterior.ventasNetas) * 100 
      : 0;
    
    const mesesDetalle = calcularVentasPorMes(añoSeleccionado);
    const mesesConVentas = mesesDetalle.filter(m => m.ventasNetas > 0);
    const mejorMes = mesesConVentas.length > 0 ? mesesConVentas.reduce((max, mes) => mes.ventasNetas > max.ventasNetas ? mes : max, mesesConVentas[0]) : null;
    const peorMes = mesesConVentas.length > 0 ? mesesConVentas.reduce((min, mes) => mes.ventasNetas < min.ventasNetas ? mes : min, mesesConVentas[0]) : null;
    const promedioMensual = ventasAñoSeleccionado.ventasNetas / 12;
    
    return {
      añosDisponibles,
      ventasAñoActual: ventasAñoActual.ventasNetas,
      ventasAñoAnterior: ventasAñoAnterior.ventasNetas,
      ventasAñoSeleccionado: ventasAñoSeleccionado.ventasNetas,
      transaccionesAñoActual: ventasAñoActual.transacciones,
      transaccionesAñoSeleccionado: ventasAñoSeleccionado.transacciones,
      crecimientoAnual,
      promedioMensual,
      mejorMes,
      peorMes,
      mesesDetalle
    };
  }, [movimientos, añoSeleccionado, añoActual]);
  
  const cambiarAño = (direccion: 'anterior' | 'siguiente') => {
    const indiceActual = analisisAnual.añosDisponibles.indexOf(añoSeleccionado);
    if (direccion === 'anterior' && indiceActual < analisisAnual.añosDisponibles.length - 1) {
      setAñoSeleccionado(analisisAnual.añosDisponibles[indiceActual + 1]);
    } else if (direccion === 'siguiente' && indiceActual > 0) {
      setAñoSeleccionado(analisisAnual.añosDisponibles[indiceActual - 1]);
    }
  };
  
  const maxVentaMes = Math.max(...analisisAnual.mesesDetalle.map(m => m.ventasNetas));
  
  return (
    <div className="space-y-6">
      {/* 📊 Métricas Principales Anuales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Año Actual */}
        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <h4 className="text-lg font-semibold text-green-800 mb-2 flex items-center justify-center">
            <Calendar className="mr-2" size={20} />
            Año {añoActual} (Acumulado)
          </h4>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {formatearMoneda(analisisAnual.ventasAñoActual)}
          </div>
          <div className="text-sm text-green-700 mb-1">
            {analisisAnual.transaccionesAñoActual} transacciones
          </div>
          <div className="text-xs text-green-600">
            Hasta {new Date().toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' })}
          </div>
        </div>
        
        {/* Año Anterior */}
        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <h4 className="text-lg font-semibold text-blue-800 mb-2 flex items-center justify-center">
            <Calendar className="mr-2" size={20} />
            Año {añoActual - 1} (Completo)
          </h4>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {formatearMoneda(analisisAnual.ventasAñoAnterior)}
          </div>
          <div className="text-sm text-blue-700 mb-1">
            Año de referencia
          </div>
          <div className={`text-sm font-bold flex items-center justify-center ${
            analisisAnual.crecimientoAnual >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {analisisAnual.crecimientoAnual >= 0 ? '↗️' : '↘️'} 
            {Math.abs(analisisAnual.crecimientoAnual).toFixed(1)}% vs {añoActual}
          </div>
        </div>
        
        {/* Navegador de Años */}
        <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
          <h4 className="text-lg font-semibold text-orange-800 mb-4">
            Consulta Histórica
          </h4>
          
          {/* Selector de Año */}
          <div className="flex items-center justify-center space-x-3 mb-3">
            <button 
              onClick={() => cambiarAño('anterior')}
              disabled={analisisAnual.añosDisponibles.indexOf(añoSeleccionado) >= analisisAnual.añosDisponibles.length - 1}
              className="p-1 rounded-full bg-orange-200 hover:bg-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="text-2xl font-bold text-orange-600 min-w-[80px]">
              {añoSeleccionado}
            </div>
            
            <button 
              onClick={() => cambiarAño('siguiente')}
              disabled={analisisAnual.añosDisponibles.indexOf(añoSeleccionado) <= 0}
              className="p-1 rounded-full bg-orange-200 hover:bg-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="text-xl font-bold text-orange-600 mb-1">
            {formatearMoneda(analisisAnual.ventasAñoSeleccionado)}
          </div>
          <div className="text-sm text-orange-700">
            {analisisAnual.transaccionesAñoSeleccionado} transacciones
          </div>
        </div>
      </div>
      
      {/* 📈 Desglose Mensual del Año Seleccionado */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="mr-2 text-orange-500" size={20} />
          Desglose Mensual {añoSeleccionado}
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {analisisAnual.mesesDetalle.map((mes) => {
            const porcentaje = maxVentaMes > 0 ? (mes.ventasNetas / maxVentaMes) * 100 : 0;
            const esMejorMes = analisisAnual.mejorMes && mes.mes === analisisAnual.mejorMes.mes;
            const esPeorMes = analisisAnual.peorMes && mes.mes === analisisAnual.peorMes.mes && analisisAnual.peorMes.ventasNetas < (analisisAnual.mejorMes?.ventasNetas || 0);
            
            return (
              <div key={mes.mes} className={`p-3 rounded-lg border text-center ${
                esMejorMes ? 'bg-green-100 border-green-300' :
                esPeorMes ? 'bg-red-100 border-red-300' :
                'bg-white border-gray-200'
              }`}>
                <div className="text-xs font-medium text-gray-600 mb-1">
                  {mes.nombreMes.substring(0, 3)}
                </div>
                <div className={`text-sm font-bold mb-1 ${
                  esMejorMes ? 'text-green-700' :
                  esPeorMes ? 'text-red-700' :
                  'text-gray-900'
                }`}>
                  {mes.ventasNetas > 0 ? formatearMoneda(mes.ventasNetas) : '-'}
                </div>
                
                {mes.ventasNetas > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div 
                      className={`h-2 rounded-full ${
                        esMejorMes ? 'bg-green-500' :
                        esPeorMes ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.max(porcentaje, 5)}%` }}
                    ></div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  {mes.transacciones} ops
                </div>
                
                {esMejorMes && <div className="text-xs text-green-600 font-bold">👑 Mejor</div>}
                {esPeorMes && <div className="text-xs text-red-600 font-bold">📉 Menor</div>}
              </div>
            );
          })}
        </div>
        
        {/* Resumen del año seleccionado */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-300">
          <div className="text-center">
            <div className="text-sm text-gray-600">Promedio Mensual</div>
            <div className="text-lg font-bold text-gray-900">
              {formatearMoneda(analisisAnual.promedioMensual)}
            </div>
          </div>
          
          {analisisAnual.mejorMes && (
            <div className="text-center">
              <div className="text-sm text-green-600">Mejor Mes</div>
              <div className="text-lg font-bold text-green-700">
                {analisisAnual.mejorMes.nombreMes}: {formatearMoneda(analisisAnual.mejorMes.ventasNetas)}
              </div>
            </div>
          )}
          
          {analisisAnual.peorMes && analisisAnual.peorMes.ventasNetas < (analisisAnual.mejorMes?.ventasNetas || 0) && (
            <div className="text-center">
              <div className="text-sm text-red-600">Mes Más Bajo</div>
              <div className="text-lg font-bold text-red-700">
                {analisisAnual.peorMes.nombreMes}: {formatearMoneda(analisisAnual.peorMes.ventasNetas)}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 💡 Insights Anuales */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
        <h5 className="font-semibold text-orange-900 mb-2 flex items-center">
          <Target className="mr-2 text-orange-600" size={16} />
          Insights Ejecutivos - Año {añoSeleccionado}
        </h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-orange-800">📊 Total Anual: </span>
            <span className="text-gray-800">
              {formatearMoneda(analisisAnual.ventasAñoSeleccionado)} en {analisisAnual.transaccionesAñoSeleccionado} operaciones
            </span>
          </div>
          
          {añoSeleccionado === añoActual && (
            <div>
              <span className="font-medium text-orange-800">🎯 Proyección: </span>
              <span className="text-gray-800">
                Al ritmo actual: {formatearMoneda((analisisAnual.ventasAñoActual / new Date().getMonth() + 1) * 12)}
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-3 text-xs text-orange-700">
          🏆 <strong>Solo para Fernando (Admin):</strong> Datos de ventas netas anuales para análisis estratégico y conclusiones de fin de año.
        </div>
      </div>
    </div>
  );
};

export default Dashboard;