import { createClient } from '@supabase/supabase-js'
import logger from '../utils/logger'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Interfaces de Datos
export interface Cliente {
  id: number
  rut: string
  razon_social: string
  nombre_fantasia: string | null
  email: string | null
  direccion: string | null
  ciudad: string
  departamento: string
  vendedor_id: number
  activo: boolean
  vendedor_nombre?: string 
}

export interface Movimiento {
  id: number
  fecha: string
  cliente_id: number
  vendedor_id: number
  tipo_movimiento: 'Venta' | 'Pago' | 'Nota de Crédito' | 'Ajuste de Saldo' | 'Devolución'
  documento: string
  importe: number
  comentario: string | null
  clientes?: { razon_social: string }
  usuarios?: { nombre: string }      
  saldo_acumulado?: number         
}

export interface Gasto {
  id: number
  fecha: string
  categoria: string
  descripcion: string | null
  monto: number
  tipo: 'Empresa' | 'Personal'
  usuario_id: number
  created_at: string
  updated_at: string
}

// Funciones de Utilidad
export const formatearMoneda = (monto: number | null | undefined): string => {
  if (monto === null || monto === undefined) return '$ 0,00'
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(monto)
}

export const formatearFecha = (fechaString: string | null | undefined): string => {
  if (!fechaString) return ''
  const fecha = new Date(fechaString + 'T00:00:00')
  if (isNaN(fecha.getTime())) return 'Fecha inválida'
  return fecha.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const calcularSaldoCliente = (movimientos: Movimiento[]): number => {
  return movimientos.reduce((saldo, movimiento) => saldo + movimiento.importe, 0)
}

// 🔧 CORRECCIÓN CRÍTICA: Función optimizada para cargar clientes
export const getClientes = async (): Promise<Cliente[]> => {
  try {
    logger.log('📊 Cargando clientes...');
    
    // Aumentamos el límite y optimizamos la consulta
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        *,
        usuarios:vendedor_id (nombre)
      `)
      .order('razon_social')
      .limit(10000); // Aumentado de 2000 a 10000
    
    if (error) {
      logger.error('❌ Error cargando clientes:', error);
      throw error;
    }
    
    if (!data) {
      console.warn('⚠️ No se encontraron clientes');
      return [];
    }
    
    // Mapear y agregar el nombre del vendedor
    const clientesConVendedor = data.map(c => ({
      ...c,
      vendedor_nombre: c.usuarios?.nombre || 'Sin Vendedor'
    })) as Cliente[];
    
    logger.log(`✅ Clientes cargados: ${clientesConVendedor.length}`);
    return clientesConVendedor;
    
  } catch (error) {
    logger.error('❌ Error en getClientes:', error);
    throw new Error(`Error al cargar clientes: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// 🔧 CORRECCIÓN CRÍTICA: Función optimizada para cargar movimientos
export const getMovimientosCompleto = async (): Promise<Movimiento[]> => {
  try {
    logger.log('📊 Cargando movimientos...');
    
    // 🔧 CORRECCIÓN: Cargar en lotes más grandes y asegurar que se carguen TODOS
    const LIMITE_POR_LOTE = 1000;
    let todoLosMovimientos: Movimiento[] = [];
    let ultimoId = 0;
    let hayMasDatos = true;
    let intentos = 0;
    const MAX_INTENTOS = 10; // Máximo 10 lotes = 10,000 movimientos
    
    while (hayMasDatos && intentos < MAX_INTENTOS) {
      logger.log(`📦 Cargando lote ${intentos + 1} desde ID ${ultimoId}...`);
      
      const { data, error, count } = await supabase
        .from('movimientos')
        .select(`
          *,
          clientes (razon_social),
          usuarios (nombre)
        `, { count: 'exact' })
        .gt('id', ultimoId) // Paginación por ID
        .order('id', { ascending: true })
        .limit(LIMITE_POR_LOTE);
      
      if (error) {
        logger.error('❌ Error cargando movimientos:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        logger.log('✅ No hay más datos para cargar');
        hayMasDatos = false;
        break;
      }
      
      todoLosMovimientos = [...todoLosMovimientos, ...data as Movimiento[]];
      
      // Actualizar el último ID para la siguiente consulta
      ultimoId = data[data.length - 1].id;
      
      logger.log(`✅ Lote ${intentos + 1} cargado: ${data.length} movimientos (total acumulado: ${todoLosMovimientos.length})`);
      
      // 🔧 NUEVA VERIFICACIÓN: Si el total en BD es conocido, comparar
      if (count !== null && intentos === 0) {
        logger.log(`📊 Total de movimientos en BD: ${count}`);
      }
      
      // Si el lote es menor al límite, ya no hay más datos
      if (data.length < LIMITE_POR_LOTE) {
        logger.log('✅ Último lote detectado (menor al límite)');
        hayMasDatos = false;
      }
      
      intentos++;
    }
    
    if (intentos >= MAX_INTENTOS) {
      console.warn('⚠️ Se alcanzó el máximo de intentos. Puede haber más datos.');
    }
    
    // Ordenar por fecha descendente para mostrar los más recientes primero
    todoLosMovimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    
    logger.log(`✅ TOTAL de movimientos cargados: ${todoLosMovimientos.length}`);
    logger.log(`📊 Primer movimiento: ${todoLosMovimientos[0]?.fecha} - ${todoLosMovimientos[0]?.documento}`);
    logger.log(`📊 Último movimiento: ${todoLosMovimientos[todoLosMovimientos.length - 1]?.fecha} - ${todoLosMovimientos[todoLosMovimientos.length - 1]?.documento}`);
    
    return todoLosMovimientos;
    
  } catch (error) {
    logger.error('❌ Error en getMovimientosCompleto:', error);
    throw new Error(`Error al cargar movimientos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// 🔧 NUEVA FUNCIÓN: Cargar movimientos por cliente específico (para optimización)
export const getMovimientosPorCliente = async (clienteId: number): Promise<Movimiento[]> => {
  try {
    logger.log(`📊 Cargando movimientos para cliente ${clienteId}...`);
    
    const { data, error } = await supabase
      .from('movimientos')
      .select(`
        *,
        clientes (razon_social),
        usuarios (nombre)
      `)
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: true }) // Orden cronológico para estado de cuenta
      .limit(10000); // Límite alto para clientes con mucha actividad
    
    if (error) {
      logger.error('❌ Error cargando movimientos por cliente:', error);
      throw error;
    }
    
    const movimientos = (data || []) as Movimiento[];
    logger.log(`✅ Movimientos del cliente ${clienteId}: ${movimientos.length}`);
    
    return movimientos;
    
  } catch (error) {
    logger.error('❌ Error en getMovimientosPorCliente:', error);
    throw new Error(`Error al cargar movimientos del cliente: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// 🔧 NUEVA FUNCIÓN: Cargar movimientos por vendedor (para optimización)
export const getMovimientosPorVendedor = async (vendedorId: number, limit?: number): Promise<Movimiento[]> => {
  try {
    logger.log(`📊 Cargando movimientos para vendedor ${vendedorId}...`);
    
    const { data, error } = await supabase
      .from('movimientos')
      .select(`
        *,
        clientes (razon_social),
        usuarios (nombre)
      `)
      .eq('vendedor_id', vendedorId)
      .order('fecha', { ascending: false })
      .limit(limit || 5000);
    
    if (error) {
      logger.error('❌ Error cargando movimientos por vendedor:', error);
      throw error;
    }
    
    const movimientos = (data || []) as Movimiento[];
    logger.log(`✅ Movimientos del vendedor ${vendedorId}: ${movimientos.length}`);
    
    return movimientos;
    
  } catch (error) {
    logger.error('❌ Error en getMovimientosPorVendedor:', error);
    throw new Error(`Error al cargar movimientos del vendedor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// 🔧 NUEVA FUNCIÓN: Verificar conexión con la base de datos
export const verificarConexion = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('count')
      .limit(1);
    
    if (error) {
      logger.error('❌ Error de conexión:', error);
      return false;
    }
    
    logger.log('✅ Conexión a Supabase verificada');
    return true;
    
  } catch (error) {
    logger.error('❌ Error verificando conexión:', error);
    return false;
  }
}

// 🔧 FUNCIÓN DE DEBUG: Obtener estadísticas de la base de datos
export const obtenerEstadisticas = async () => {
  try {
    const [clientesCount, movimientosCount, usuariosCount] = await Promise.all([
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
      supabase.from('movimientos').select('id', { count: 'exact', head: true }),
      supabase.from('usuarios').select('id', { count: 'exact', head: true })
    ]);
    
    const stats = {
      clientes: clientesCount.count || 0,
      movimientos: movimientosCount.count || 0,
      usuarios: usuariosCount.count || 0
    };
    
    logger.log('📊 Estadísticas de la BD:', stats);
    return stats;
    
  } catch (error) {
    logger.error('❌ Error obteniendo estadísticas:', error);
    return null;
  }
}

// ========================
// Inventario
// ========================

export interface InventarioItem {
  id: number;
  sku: string;
  descripcion?: string | null;
  categoria?: string | null;
  stock: number;
  precio: number;
}

export const getInventario = async (): Promise<InventarioItem[]> => {
  try {
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .order('sku');
    if (error) throw error;
    return (data || []) as InventarioItem[];
  } catch (error) {
    logger.error('❌ Error cargando inventario:', error);
    return [];
  }
};

export const ajustarInventario = async (
  sku: string,
  cantidad: number
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('inventario')
      .select('stock')
      .eq('sku', sku)
      .single();

    if (error) throw error;

    const nuevoStock = (data?.stock || 0) + cantidad;

    const { error: updateError } = await supabase
      .from('inventario')
      .update({ stock: nuevoStock })
      .eq('sku', sku);

    if (updateError) throw updateError;

    logger.log(`✅ Inventario actualizado para ${sku}: ${nuevoStock}`);
  } catch (err) {
    logger.error('❌ Error ajustando inventario:', err);
  }
};

// ========================================
// FUNCIONES GASTOS
// ========================================

export const getGastos = async (usuarioId?: number): Promise<Gasto[]> => {
  try {
    let query = supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });
    
    if (usuarioId) {
      query = query.eq('usuario_id', usuarioId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Gasto[];
  } catch (error) {
    logger.error('❌ Error cargando gastos:', error);
    return [];
  }
};

export const getGastosPorMes = async (mes: string, usuarioId?: number): Promise<Gasto[]> => {
  try {
    // Calcular el primer día del mes siguiente para la comparación
    const [año, mesNum] = mes.split('-').map(Number);
    const primerDiaMesSiguiente = new Date(año, mesNum, 1); // mes es 0-indexed en Date
    const fechaLimite = primerDiaMesSiguiente.toISOString().split('T')[0];
    
    let query = supabase
      .from('gastos')
      .select('*')
      .gte('fecha', `${mes}-01`)
      .lt('fecha', fechaLimite)
      .order('fecha', { ascending: false });
    
    if (usuarioId) {
      query = query.eq('usuario_id', usuarioId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    logger.log(`📊 Gastos encontrados para ${mes}:`, data?.length || 0);
    return (data || []) as Gasto[];
  } catch (error) {
    logger.error('❌ Error cargando gastos por mes:', error);
    return [];
  }
};

export const crearGasto = async (gasto: Omit<Gasto, 'id' | 'created_at' | 'updated_at'>): Promise<Gasto | null> => {
  try {
    const { data, error } = await supabase
      .from('gastos')
      .insert([gasto])
      .select()
      .single();
    
    if (error) throw error;
    logger.log('✅ Gasto creado exitosamente');
    return data as Gasto;
  } catch (error) {
    logger.error('❌ Error creando gasto:', error);
    return null;
  }
};

export const actualizarGasto = async (id: number, gasto: Partial<Omit<Gasto, 'id' | 'created_at' | 'updated_at'>>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('gastos')
      .update({ ...gasto, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
    logger.log('✅ Gasto actualizado exitosamente');
    return true;
  } catch (error) {
    logger.error('❌ Error actualizando gasto:', error);
    return false;
  }
};

export const eliminarGasto = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    logger.log('✅ Gasto eliminado exitosamente');
    return true;
  } catch (error) {
    logger.error('❌ Error eliminando gasto:', error);
    return false;
  }
};

export const getEstadisticasGastos = async (mes: string, usuarioId?: number) => {
  try {
    const gastos = await getGastosPorMes(mes, usuarioId);
    
    logger.log(`📊 Calculando estadísticas para ${mes} con ${gastos.length} gastos`);
    
    const gastosEmpresa = gastos.filter(g => g.tipo === 'Empresa');
    const gastosPersonal = gastos.filter(g => g.tipo === 'Personal');
    
    const totalEmpresa = gastosEmpresa.reduce((sum, g) => sum + g.monto, 0);
    const totalPersonal = gastosPersonal.reduce((sum, g) => sum + g.monto, 0);
    const totalGeneral = totalEmpresa + totalPersonal;
    
    logger.log(`💰 Totales: Empresa=${totalEmpresa}, Personal=${totalPersonal}, General=${totalGeneral}`);
    
    const porCategoria = gastos.reduce((acc, gasto) => {
      const key = gasto.categoria;
      if (!acc[key]) {
        acc[key] = { empresa: 0, personal: 0, total: 0 };
      }
      acc[key][gasto.tipo.toLowerCase() as 'empresa' | 'personal'] += gasto.monto;
      acc[key].total += gasto.monto;
      return acc;
    }, {} as Record<string, { empresa: number; personal: number; total: number }>);
    
    const estadisticas = {
      totalEmpresa,
      totalPersonal,
      totalGeneral,
      porcentajeEmpresa: totalGeneral > 0 ? (totalEmpresa / totalGeneral) * 100 : 0,
      porcentajePersonal: totalGeneral > 0 ? (totalPersonal / totalGeneral) * 100 : 0,
      porCategoria,
      cantidadGastos: gastos.length
    };
    
    logger.log('✅ Estadísticas calculadas:', estadisticas);
    return estadisticas;
  } catch (error) {
    logger.error('❌ Error calculando estadísticas:', error);
    return {
      totalEmpresa: 0,
      totalPersonal: 0,
      totalGeneral: 0,
      porcentajeEmpresa: 0,
      porcentajePersonal: 0,
      porCategoria: {},
      cantidadGastos: 0
    };
  }
};

// Categorías predefinidas basadas en el CSV analizado
export const CATEGORIAS_GASTOS = {
  EMPRESA: [
    'Combustible Kangoo',
    'Varios Empresa', 
    'BPS EMPRESA',
    'Sueldos',
    'BSE Empresa',
    'DGI',
    'Honorarios contadora',
    'Patente Kangoo',
    'Viaticos empresa'
  ],
  PERSONAL: [
    'UTE',
    'ANTEL', 
    'OSE',
    'Combustible Celerio',
    'Seguro Celerio',
    'Cuota Celerio',
    'Supermercado',
    'Salir a comer',
    'Celulares',
    'DIRECTV + NETFLIX',
    'Tarjeta OCA',
    'Tarjeta BBVA',
    'Varios Personal',
    'BPS PERSONAL',
    'Colegio Benjamin',
    'Cuota Terreno'
  ]
} as const;