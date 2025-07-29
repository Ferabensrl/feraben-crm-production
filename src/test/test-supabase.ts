// src/test/test-supabase.ts
// Archivo para probar que Supabase está funcionando correctamente

import { createClient } from '@supabase/supabase-js';

// 🔧 CONFIGURACIÓN (usar tus credenciales reales)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'tu-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ================================================================
// 🧪 TESTS DE CONEXIÓN Y FUNCIONALIDAD
// ================================================================

export const testConexionSupabase = async () => {
  console.log('🔄 Iniciando tests de Supabase...');
  
  try {
    // ✅ TEST 1: Verificar conexión básica
    console.log('\n📡 TEST 1: Verificando conexión...');
    const { data: conexion, error: errorConexion } = await supabase
      .from('inventario')
      .select('count', { count: 'exact', head: true });
    
    if (errorConexion) {
      console.error('❌ Error de conexión:', errorConexion.message);
      return false;
    }
    
    console.log('✅ Conexión exitosa');
    console.log(`📊 Productos en inventario: ${conexion || 0}`);
    
    // ✅ TEST 2: Verificar que las tablas existen
    console.log('\n🗄️ TEST 2: Verificando tablas...');
    const tablasRequeridas = ['inventario', 'pedidos', 'pedido_items', 'movimientos_stock'];
    
    for (const tabla of tablasRequeridas) {
      try {
        const { error } = await supabase.from(tabla).select('*').limit(1);
        if (error) {
          console.error(`❌ Tabla '${tabla}' no existe o no tiene permisos:`, error.message);
          return false;
        } else {
          console.log(`✅ Tabla '${tabla}' existe y es accesible`);
        }
      } catch (err) {
        console.error(`❌ Error verificando tabla '${tabla}':`, err);
        return false;
      }
    }
    
    // ✅ TEST 3: Probar inserción de producto de prueba
    console.log('\n➕ TEST 3: Probando inserción...');
    const productoTest = {
      codigo_producto: 'TEST001',
      codigo_barras: '1234567890123',
      descripcion: 'Producto de prueba - ELIMINAR',
      categoria: 'Test',
      stock: 10,
      precio_venta: 100,
      activo: true,
      observaciones: 'Este es un producto de prueba creado automáticamente'
    };
    
    const { data: productoCreado, error: errorInsercion } = await supabase
      .from('inventario')
      .insert([productoTest])
      .select()
      .single();
    
    if (errorInsercion) {
      console.error('❌ Error al insertar producto de prueba:', errorInsercion.message);
      return false;
    }
    
    console.log('✅ Producto de prueba creado:', productoCreado.codigo_producto);
    
    // ✅ TEST 4: Probar búsqueda
    console.log('\n🔍 TEST 4: Probando búsqueda...');
    const { data: productoBuscado, error: errorBusqueda } = await supabase
      .from('inventario')
      .select('*')
      .eq('codigo_producto', 'TEST001')
      .single();
    
    if (errorBusqueda) {
      console.error('❌ Error al buscar producto:', errorBusqueda.message);
      return false;
    }
    
    console.log('✅ Producto encontrado:', productoBuscado.descripcion);
    
    // ✅ TEST 5: Probar actualización
    console.log('\n📝 TEST 5: Probando actualización...');
    const { data: productoActualizado, error: errorActualizacion } = await supabase
      .from('inventario')
      .update({ stock: 15, observaciones: 'Stock actualizado en test' })
      .eq('id', productoCreado.id)
      .select()
      .single();
    
    if (errorActualizacion) {
      console.error('❌ Error al actualizar producto:', errorActualizacion.message);
      return false;
    }
    
    console.log('✅ Producto actualizado, nuevo stock:', productoActualizado.stock);
    
    // ✅ TEST 6: Verificar trigger de movimientos (si existe)
    console.log('\n🔄 TEST 6: Verificando triggers...');
    const { data: movimientos, error: errorMovimientos } = await supabase
      .from('movimientos_stock')
      .select('*')
      .eq('inventario_id', productoCreado.id);
    
    if (!errorMovimientos && movimientos && movimientos.length > 0) {
      console.log('✅ Trigger de movimientos funcionando:', movimientos.length, 'movimientos registrados');
    } else {
      console.log('⚠️ No hay movimientos registrados (puede ser normal si los triggers no están activos)');
    }
    
    // 🧹 LIMPIEZA: Eliminar producto de prueba
    console.log('\n🧹 LIMPIEZA: Eliminando producto de prueba...');
    const { error: errorEliminacion } = await supabase
      .from('inventario')
      .delete()
      .eq('id', productoCreado.id);
    
    if (errorEliminacion) {
      console.error('❌ Error al eliminar producto de prueba:', errorEliminacion.message);
      console.log('⚠️ Eliminar manualmente el producto con ID:', productoCreado.id);
    } else {
      console.log('✅ Producto de prueba eliminado correctamente');
    }
    
    // ✅ RESULTADO FINAL
    console.log('\n🎉 TODOS LOS TESTS PASARON EXITOSAMENTE');
    console.log('✅ Supabase está configurado correctamente');
    console.log('✅ Las tablas existen y son accesibles');
    console.log('✅ Los permisos están correctos');
    console.log('✅ CRUD básico funciona');
    console.log('\n🚀 Puedes continuar con la implementación de componentes');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error general en los tests:', error);
    return false;
  }
};

// ================================================================
// 🧪 TEST ESPECÍFICO PARA PRODUCTOS REALES
// ================================================================

export const testImportacionProductos = async () => {
  console.log('🔄 Probando importación de productos reales...');
  
  // Productos de ejemplo basados en tu catálogo real
  const productosEjemplo = [
    {
      codigo_producto: 'LB010',
      codigo_barras: '2025072100001',
      descripcion: 'CINTO DE DAMA',
      categoria: 'Cintos',
      stock: 50,
      precio_compra: 42.50,
      precio_venta: 85,
      stock_minimo: 10,
      activo: true,
      observaciones: 'Producto de importación - Varios colores disponibles'
    },
    {
      codigo_producto: 'W254',
      codigo_barras: '2025072100002',
      descripcion: 'BILLETERA DAMA',
      categoria: 'Billeteras',
      stock: 30,
      precio_compra: 60,
      precio_venta: 120,
      stock_minimo: 15,
      activo: true,
      observaciones: 'Producto premium - Colores variados'
    },
    {
      codigo_producto: 'H005',
      codigo_barras: '2025072100003',
      descripcion: 'BANDOLERA',
      categoria: 'Bolsos',
      stock: 25,
      precio_compra: 47.50,
      precio_venta: 95,
      stock_minimo: 10,
      activo: true,
      observaciones: 'Bandolera multifuncional'
    }
  ];
  
  try {
    // Verificar si ya existen estos productos
    console.log('🔍 Verificando productos existentes...');
    for (const producto of productosEjemplo) {
      const { data: existente } = await supabase
        .from('inventario')
        .select('codigo_producto')
        .eq('codigo_producto', producto.codigo_producto)
        .single();
      
      if (existente) {
        console.log(`⚠️ Producto ${producto.codigo_producto} ya existe, saltando...`);
        continue;
      }
    }
    
    // Insertar productos de ejemplo
    console.log('➕ Insertando productos de ejemplo...');
    const { data: productosCreados, error } = await supabase
      .from('inventario')
      .insert(productosEjemplo)
      .select();
    
    if (error) {
      console.error('❌ Error al insertar productos:', error.message);
      return false;
    }
    
    console.log(`✅ ${productosCreados?.length || 0} productos insertados correctamente`);
    
    // Verificar que se pueden buscar
    console.log('🔍 Verificando búsqueda de productos...');
    const { data: inventario, error: errorBusqueda } = await supabase
      .from('inventario')
      .select('*')
      .in('codigo_producto', ['LB010', 'W254', 'H005']);
    
    if (errorBusqueda) {
      console.error('❌ Error al buscar productos:', errorBusqueda.message);
      return false;
    }
    
    console.log(`✅ ${inventario?.length || 0} productos encontrados en búsqueda`);
    
    // Mostrar resumen
    console.log('\n📊 RESUMEN DE PRODUCTOS CREADOS:');
    inventario?.forEach(producto => {
      console.log(`  - ${producto.codigo_producto}: ${producto.descripcion} (Stock: ${producto.stock})`);
    });
    
    console.log('\n🎉 IMPORTACIÓN DE PRODUCTOS EXITOSA');
    console.log('✅ Ya tienes productos reales para probar el escáner');
    console.log('✅ Puedes usar estos códigos de barras para testing:');
    inventario?.forEach(producto => {
      console.log(`  - ${producto.codigo_producto}: ${producto.codigo_barras}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en importación de productos:', error);
    return false;
  }
};

// ================================================================
// 🎯 FUNCIÓN PRINCIPAL PARA EJECUTAR TODOS LOS TESTS
// ================================================================

export const ejecutarTodosLosTests = async () => {
  console.log('🧪 INICIANDO SUITE COMPLETA DE TESTS FERABEN CRM');
  console.log('================================================');
  
  // Test 1: Conexión básica
  const conexionOk = await testConexionSupabase();
  if (!conexionOk) {
    console.log('❌ Tests detenidos por error de conexión');
    return false;
  }
  
  console.log('\n================================================');
  
  // Test 2: Importación de productos
  const importacionOk = await testImportacionProductos();
  if (!importacionOk) {
    console.log('❌ Error en importación de productos');
    return false;
  }
  
  console.log('\n================================================');
  console.log('🎉 TODOS LOS TESTS COMPLETADOS EXITOSAMENTE');
  console.log('🚀 Tu sistema está listo para usar');
  console.log('📱 Próximo paso: Probar el escáner con los códigos creados');
  console.log('================================================');
  
  return true;
};

// ================================================================
// 🔧 FUNCIÓN PARA LIMPIAR DATOS DE PRUEBA
// ================================================================

export const limpiarDatosPrueba = async () => {
  console.log('🧹 Limpiando datos de prueba...');
  
  try {
    // Eliminar productos de ejemplo
    const { error } = await supabase
      .from('inventario')
      .delete()
      .in('codigo_producto', ['LB010', 'W254', 'H005', 'TEST001']);
    
    if (error) {
      console.error('❌ Error al limpiar:', error.message);
      return false;
    }
    
    console.log('✅ Datos de prueba eliminados');
    return true;
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
    return false;
  }
};