// src/lib/supabase-inventario.ts
// Cliente especializado para las funciones de inventario

import { createClient } from '@supabase/supabase-js';

// Configuración (usar tus credenciales reales)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cedspllucwvpoehlyccs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZHNwbGx1Y3d2cG9laGx5Y2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MjkyMTQsImV4cCI6MjA2ODIwNTIxNH0.80z7k6ti2pxBKb8x6NILe--YNaLhJemtC32oqKW-Kz4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ================================================================
// 🏷️ TIPOS DE DATOS
// ================================================================

export interface ProductoInventario {
  id: number;
  codigo_producto: string;
  codigo_barras: string;
  descripcion: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  precio_compra: number;
  precio_venta: number;
  proveedor?: string;
  fecha_creacion: string;
  fecha_ultima_actualizacion: string;
  activo: boolean;
  observaciones?: string;
  numero_orden?: string;
  estado_producto: string;
}

export interface Pedido {
  id: number;
  numero_pedido: string;
  cliente_id?: number;
  cliente_nombre: string;
  estado: 'borrador' | 'confirmado' | 'exportado' | 'facturado';
  tipo_pedido: 'deposito' | 'ruta' | 'whatsapp';
  fecha_creacion: string;
  fecha_confirmacion?: string;
  fecha_exportacion?: string;
  fecha_facturacion?: string;
  creado_por: string;
  total_productos: number;
  total_cantidad: number;
  total_importe: number;
  descuento_global: number;
  observaciones?: string;
  origen_pedido?: string;
  detalle_colores?: string;
}

export interface PedidoItem {
  id: number;
  pedido_id: number;
  inventario_id: number;
  codigo_producto: string;
  codigo_barras: string;
  descripcion: string;
  cantidad_solicitada: number;
  cantidad_disponible: number;
  cantidad_confirmada: number;
  precio_unitario: number;
  descuento_item: number;
  subtotal: number;
  fecha_agregado: string;
  observaciones?: string;
  detalle_colores?: string;
}

export interface MovimientoStock {
  id: number;
  inventario_id: number;
  codigo_producto: string;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste' | 'inicial';
  cantidad_anterior: number;
  cantidad_movimiento: number;
  cantidad_posterior: number;
  pedido_id?: number;
  referencia: string;
  fecha_movimiento: string;
  usuario: string;
  observaciones?: string;
}

export interface ConversionWhatsApp {
  id: number;
  texto_original: string;
  cliente_detectado: string;
  fecha_pedido: string;
  pedido_id?: number;
  productos_detectados: number;
  productos_encontrados: number;
  productos_sin_stock: number;
  fecha_conversion: string;
  usuario_conversion: string;
  estado_conversion: 'exitoso' | 'con_errores' | 'fallido';
}

// ================================================================
// 📦 FUNCIONES DE INVENTARIO
// ================================================================

export class InventarioService {
  
  // 📋 Obtener todos los productos del inventario
  static async obtenerInventario(filtros?: {
    activo?: boolean;
    categoria?: string;
    stock_minimo?: boolean;
  }) {
    let query = supabase
      .from('inventario')
      .select('*')
      .order('fecha_ultima_actualizacion', { ascending: false });

    if (filtros?.activo !== undefined) {
      query = query.eq('activo', filtros.activo);
    }

    if (filtros?.categoria) {
      query = query.eq('categoria', filtros.categoria);
    }

    if (filtros?.stock_minimo) {
      query = query.lt('stock', supabase.rpc('stock_minimo'));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener inventario:', error);
      throw error;
    }

    return data as ProductoInventario[];
  }

  // 🔍 Buscar producto por código o código de barras
  static async buscarProducto(termino: string) {
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .or(`codigo_producto.ilike.%${termino}%,codigo_barras.eq.${termino}`)
      .eq('activo', true)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error al buscar producto:', error);
      throw error;
    }

    return data as ProductoInventario | null;
  }

  // ➕ Crear nuevo producto
  static async crearProducto(producto: Omit<ProductoInventario, 'id' | 'fecha_creacion' | 'fecha_ultima_actualizacion'>) {
    const { data, error } = await supabase
      .from('inventario')
      .insert([producto])
      .select()
      .single();

    if (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }

    return data as ProductoInventario;
  }

  // 📝 Actualizar producto
  static async actualizarProducto(id: number, cambios: Partial<ProductoInventario>) {
    const { data, error } = await supabase
      .from('inventario')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }

    return data as ProductoInventario;
  }

  // 📊 Actualizar stock
  static async actualizarStock(id: number, nuevoStock: number, referencia: string) {
    const { data, error } = await supabase
      .from('inventario')
      .update({ stock: nuevoStock })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar stock:', error);
      throw error;
    }

    return data as ProductoInventario;
  }

  // 📤 Importar productos desde Excel
  static async importarProductos(productos: Omit<ProductoInventario, 'id' | 'fecha_creacion' | 'fecha_ultima_actualizacion'>[]) {
    const { data, error } = await supabase
      .from('inventario')
      .insert(productos)
      .select();

    if (error) {
      console.error('Error al importar productos:', error);
      throw error;
    }

    return data as ProductoInventario[];
  }

  // 📊 Obtener estadísticas del inventario
  static async obtenerEstadisticas() {
    const { data: inventario, error } = await supabase
      .from('vista_inventario_alertas')
      .select('*');

    if (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }

    const estadisticas = {
      total_productos: inventario.length,
      productos_activos: inventario.filter(p => p.activo).length,
      stock_critico: inventario.filter(p => p.estado_stock === 'CRÍTICO').length,
      stock_bajo: inventario.filter(p => p.estado_stock === 'BAJO').length,
      valor_total_inventario: inventario.reduce((sum, p) => sum + (p.stock * p.precio_venta), 0)
    };

    return estadisticas;
  }
}

// ================================================================
// 📋 FUNCIONES DE PEDIDOS
// ================================================================

export class PedidosService {

  // 📋 Crear nuevo pedido
  static async crearPedido(pedido: Omit<Pedido, 'id' | 'numero_pedido' | 'fecha_creacion' | 'total_productos' | 'total_cantidad' | 'total_importe'>) {
    // Generar número de pedido automático
    const { data: numeroPedido } = await supabase.rpc('generar_numero_pedido');

    const { data, error } = await supabase
      .from('pedidos')
      .insert([{
        ...pedido,
        numero_pedido: numeroPedido
      }])
      .select()
      .single();

    if (error) {
      console.error('Error al crear pedido:', error);
      throw error;
    }

    return data as Pedido;
  }

  // 📝 Obtener pedidos
  static async obtenerPedidos(filtros?: {
    estado?: string;
    tipo_pedido?: string;
    cliente_id?: number;
    limite?: number;
  }) {
    let query = supabase
      .from('vista_pedidos_resumen')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }

    if (filtros?.tipo_pedido) {
      query = query.eq('tipo_pedido', filtros.tipo_pedido);
    }

    if (filtros?.cliente_id) {
      query = query.eq('cliente_id', filtros.cliente_id);
    }

    if (filtros?.limite) {
      query = query.limit(filtros.limite);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener pedidos:', error);
      throw error;
    }

    return data;
  }

  // ➕ Agregar item a pedido
  static async agregarItemPedido(item: Omit<PedidoItem, 'id' | 'fecha_agregado' | 'subtotal'>) {
    const subtotal = item.cantidad_confirmada * item.precio_unitario * (1 - item.descuento_item / 100);

    const { data, error } = await supabase
      .from('pedido_items')
      .insert([{
        ...item,
        subtotal
      }])
      .select()
      .single();

    if (error) {
      console.error('Error al agregar item:', error);
      throw error;
    }

    return data as PedidoItem;
  }

  // 📋 Obtener items de un pedido
  static async obtenerItemsPedido(pedidoId: number) {
    const { data, error } = await supabase
      .from('pedido_items')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('fecha_agregado');

    if (error) {
      console.error('Error al obtener items del pedido:', error);
      throw error;
    }

    return data as PedidoItem[];
  }

  // 📊 Cambiar estado del pedido
  static async cambiarEstadoPedido(id: number, nuevoEstado: string) {
    const camposActualizacion: any = { estado: nuevoEstado };

    // Agregar fecha según el estado
    if (nuevoEstado === 'confirmado') {
      camposActualizacion.fecha_confirmacion = new Date().toISOString();
    } else if (nuevoEstado === 'exportado') {
      camposActualizacion.fecha_exportacion = new Date().toISOString();
    } else if (nuevoEstado === 'facturado') {
      camposActualizacion.fecha_facturacion = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('pedidos')
      .update(camposActualizacion)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al cambiar estado del pedido:', error);
      throw error;
    }

    return data as Pedido;
  }
}

// ================================================================
// 🔄 FUNCIONES DE CONVERSIÓN WHATSAPP
// ================================================================

export class WhatsAppService {

  // 🔄 Procesar texto de WhatsApp
  static async procesarTextoWhatsApp(textoOriginal: string, usuario: string) {
    try {
      // Procesar el texto (aquí iría la lógica de conversión)
      const resultado = this.analizarTextoWhatsApp(textoOriginal);
      
      // Guardar log de conversión
      const { data: conversion, error } = await supabase
        .from('conversiones_whatsapp')
        .insert([{
          texto_original: textoOriginal,
          cliente_detectado: resultado.cliente,
          fecha_pedido: resultado.fecha,
          productos_detectados: resultado.productos.length,
          productos_encontrados: resultado.productos.filter(p => p.encontrado).length,
          productos_sin_stock: resultado.productos.filter(p => !p.encontrado || p.cantidadConfirmada === 0).length,
          usuario_conversion: usuario,
          estado_conversion: resultado.productos.length > 0 ? 'exitoso' : 'fallido'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error al guardar conversión:', error);
      }

      return {
        ...resultado,
        conversionId: conversion?.id
      };

    } catch (error) {
      console.error('Error al procesar WhatsApp:', error);
      throw error;
    }
  }

  // 🔍 Analizar texto de WhatsApp (lógica interna)
  static analizarTextoWhatsApp(texto: string) {
    const lineas = texto.split('\n').map(l => l.trim()).filter(l => l);
    
    let fecha = '';
    let cliente = '';
    const productosDetallados: { [codigo: string]: { descripcion: string; colores: { [color: string]: number }; comentario: string } } = {};
    
    let codigoActual = '';
    let leyendoColores = false;
    
    for (const linea of lineas) {
      // Buscar fecha
      const fechaMatch = linea.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (fechaMatch && !fecha) {
        fecha = fechaMatch[1];
      }
      
      // Buscar cliente
      const clienteMatch = linea.match(/👤\s*cliente:\s*(.+)/i);
      if (clienteMatch) {
        cliente = clienteMatch[1].trim();
      }
      
      // Buscar productos
      const productoMatch = linea.match(/🔹\s*([A-Z0-9-]+)\s*[–-]\s*(.+)/i);
      if (productoMatch) {
        const [, codigo, descripcion] = productoMatch;
        codigoActual = codigo.toUpperCase().trim();
        leyendoColores = true;
        
        if (!productosDetallados[codigoActual]) {
          productosDetallados[codigoActual] = {
            descripcion: descripcion.trim(),
            colores: {},
            comentario: ''
          };
        }
        continue;
      }
      
      // Leer colores
      if (leyendoColores && codigoActual) {
        const comentarioMatch = linea.match(/📝\s*comentario:\s*(.*)/i);
        if (comentarioMatch) {
          productosDetallados[codigoActual].comentario = comentarioMatch[1].trim();
          continue;
        }
        
        const colorMatch = linea.match(/^-\s*([^:]+):\s*(\d+)/);
        if (colorMatch) {
          const [, color, cantidad] = colorMatch;
          productosDetallados[codigoActual].colores[color.trim()] = parseInt(cantidad);
          continue;
        }
        
        if (linea.startsWith('🔹') || linea.startsWith('✍')) {
          leyendoColores = false;
          codigoActual = '';
        }
      }
    }
    
    // Convertir a productos simples
    const productos = Object.entries(productosDetallados).map(([codigo, detalles]) => {
      const cantidadTotal = Object.values(detalles.colores).reduce((sum, cant) => sum + cant, 0);
      const resumenColores = Object.entries(detalles.colores)
        .map(([color, cant]) => `${color}: ${cant}`)
        .join(', ');
      
      return {
        codigo,
        descripcion: detalles.descripcion,
        cantidadSolicitada: cantidadTotal,
        encontrado: true, // Se verificaría contra inventario real
        cantidadConfirmada: cantidadTotal,
        detalleColores: resumenColores,
        comentario: detalles.comentario
      };
    });
    
    return {
      fecha: fecha || 'Fecha no detectada',
      cliente: cliente || 'Cliente no detectado',
      productos
    };
  }

  // 📊 Obtener historial de conversiones
  static async obtenerHistorialConversiones(limite: number = 50) {
    const { data, error } = await supabase
      .from('conversiones_whatsapp')
      .select('*')
      .order('fecha_conversion', { ascending: false })
      .limit(limite);

    if (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }

    return data as ConversionWhatsApp[];
  }
}

// ================================================================
// 📊 FUNCIONES DE MOVIMIENTOS DE STOCK
// ================================================================

export class MovimientosService {

  // 📊 Obtener movimientos de stock
  static async obtenerMovimientos(filtros?: {
    inventario_id?: number;
    tipo_movimiento?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    limite?: number;
  }) {
    let query = supabase
      .from('vista_movimientos_recientes')
      .select('*');

    if (filtros?.inventario_id) {
      query = query.eq('inventario_id', filtros.inventario_id);
    }

    if (filtros?.tipo_movimiento) {
      query = query.eq('tipo_movimiento', filtros.tipo_movimiento);
    }

    if (filtros?.fecha_desde) {
      query = query.gte('fecha_movimiento', filtros.fecha_desde);
    }

    if (filtros?.fecha_hasta) {
      query = query.lte('fecha_movimiento', filtros.fecha_hasta);
    }

    if (filtros?.limite) {
      query = query.limit(filtros.limite);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener movimientos:', error);
      throw error;
    }

    return data;
  }

  // ➕ Registrar movimiento manual
  static async registrarMovimiento(movimiento: Omit<MovimientoStock, 'id' | 'fecha_movimiento'>) {
    const { data, error } = await supabase
      .from('movimientos_stock')
      .insert([movimiento])
      .select()
      .single();

    if (error) {
      console.error('Error al registrar movimiento:', error);
      throw error;
    }

    return data as MovimientoStock;
  }
}

// ================================================================
// 🔧 FUNCIONES AUXILIARES
// ================================================================

export class UtilsService {

  // ✅ Validar código EAN-13
  static validarEAN13(codigo: string): boolean {
    return /^[0-9]{13}$/.test(codigo);
  }

  // 🔢 Generar código de barras secuencial
  static async generarCodigoBarras(): Promise<string> {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    
    // Obtener último código del día
    const prefijo = `${año}${mes}${dia}`;
    
    const { data, error } = await supabase
      .from('inventario')
      .select('codigo_barras')
      .like('codigo_barras', `${prefijo}%`)
      .order('codigo_barras', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error al generar código de barras:', error);
      return `${prefijo}00001`;
    }

    let numero = 1;
    if (data && data.length > 0) {
      const ultimoCodigo = data[0].codigo_barras;
      const ultimoNumero = parseInt(ultimoCodigo.slice(-5));
      numero = ultimoNumero + 1;
    }

    return `${prefijo}${String(numero).padStart(5, '0')}`;
  }

  // 📄 Exportar a Excel (formato facturación)
  static generarDatosExcel(items: PedidoItem[], cliente: string) {
    const headers = [
      'Codigo',
      'Nombre', 
      'Cantidad',
      'Precio Unitario',
      '% Descuento',
      'IndFact',
      'Descripcion (Opcional)'
    ];

    const datos = items.map(item => [
      item.codigo_producto,
      item.descripcion,
      item.cantidad_confirmada,
      item.precio_unitario,
      item.descuento_item,
      '3', // Siempre Tasa básica IVA
      item.codigo_barras
    ]);

    return {
      headers,
      datos,
      metadatos: {
        cliente,
        fecha: new Date().toLocaleDateString(),
        total_items: items.length,
        total_cantidad: items.reduce((sum, item) => sum + item.cantidad_confirmada, 0),
        total_importe: items.reduce((sum, item) => sum + item.subtotal, 0)
      }
    };
  }
}

// Exportar servicios como default
export default {
  InventarioService,
  PedidosService,
  WhatsAppService,
  MovimientosService,
  UtilsService
};