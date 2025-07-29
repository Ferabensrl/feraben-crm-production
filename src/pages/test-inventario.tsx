import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Database,
  Trash2,
  RefreshCw
} from 'lucide-react';

// Importar las funciones de test
import { 
  ejecutarTodosLosTests, 
  testConexionSupabase, 
  testImportacionProductos,
  limpiarDatosPrueba 
} from '../test/test-supabase';

/**
 * 🧪 PÁGINA DE TESTING PARA INVENTARIO FERABEN
 * 
 * Esta página te permite:
 * 1. Verificar que Supabase está conectado
 * 2. Probar que las tablas existen
 * 3. Insertar productos de ejemplo
 * 4. Verificar que todo funciona
 * 
 * USAR SOLO PARA TESTING - ELIMINAR EN PRODUCCIÓN
 */

const TestInventarioPage: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [ejecutando, setEjecutando] = useState(false);
  const [testCompletado, setTestCompletado] = useState(false);

  // Interceptar console.log para mostrar en la UI
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  const agregarLog = (mensaje: string, tipo: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logConTiempo = `[${timestamp}] ${mensaje}`;
    setLogs(prev => [...prev, logConTiempo]);
  };

  // Sobrescribir console para capturar logs
  const configurarConsole = () => {
    console.log = (...args) => {
      const mensaje = args.join(' ');
      agregarLog(mensaje);
      originalConsoleLog(...args);
    };

    console.error = (...args) => {
      const mensaje = args.join(' ');
      agregarLog(`❌ ${mensaje}`, 'error');
      originalConsoleError(...args);
    };
  };

  const restaurarConsole = () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  };

  // Ejecutar test completo
  const ejecutarTestCompleto = async () => {
    setEjecutando(true);
    setLogs([]);
    setTestCompletado(false);
    
    configurarConsole();
    
    try {
      agregarLog('🚀 Iniciando tests completos del inventario...');
      const resultado = await ejecutarTodosLosTests();
      
      if (resultado) {
        agregarLog('🎉 ¡TODOS LOS TESTS PASARON!', 'success');
        setTestCompletado(true);
      } else {
        agregarLog('❌ Algunos tests fallaron', 'error');
      }
    } catch (error) {
      agregarLog(`❌ Error durante los tests: ${error}`, 'error');
    } finally {
      restaurarConsole();
      setEjecutando(false);
    }
  };

  // Ejecutar solo test de conexión
  const ejecutarTestConexion = async () => {
    setEjecutando(true);
    setLogs([]);
    
    configurarConsole();
    
    try {
      agregarLog('🔗 Probando conexión a Supabase...');
      const resultado = await testConexionSupabase();
      
      if (resultado) {
        agregarLog('✅ Conexión exitosa', 'success');
      } else {
        agregarLog('❌ Error de conexión', 'error');
      }
    } catch (error) {
      agregarLog(`❌ Error: ${error}`, 'error');
    } finally {
      restaurarConsole();
      setEjecutando(false);
    }
  };

  // Ejecutar test de productos
  const ejecutarTestProductos = async () => {
    setEjecutando(true);
    setLogs([]);
    
    configurarConsole();
    
    try {
      agregarLog('📦 Probando importación de productos...');
      const resultado = await testImportacionProductos();
      
      if (resultado) {
        agregarLog('✅ Productos importados correctamente', 'success');
      } else {
        agregarLog('❌ Error en importación', 'error');
      }
    } catch (error) {
      agregarLog(`❌ Error: ${error}`, 'error');
    } finally {
      restaurarConsole();
      setEjecutando(false);
    }
  };

  // Limpiar datos de prueba
  const limpiarDatos = async () => {
    setEjecutando(true);
    
    configurarConsole();
    
    try {
      agregarLog('🧹 Limpiando datos de prueba...');
      const resultado = await limpiarDatosPrueba();
      
      if (resultado) {
        agregarLog('✅ Datos limpiados', 'success');
      } else {
        agregarLog('❌ Error al limpiar', 'error');
      }
    } catch (error) {
      agregarLog(`❌ Error: ${error}`, 'error');
    } finally {
      restaurarConsole();
      setEjecutando(false);
    }
  };

  const limpiarLogs = () => {
    setLogs([]);
    setTestCompletado(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 🔝 HEADER */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="text-blue-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Testing Inventario Feraben
            </h1>
            <p className="text-gray-600">
              Verifica que Supabase está configurado correctamente
            </p>
          </div>
        </div>

        {/* 🚨 ADVERTENCIA */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="text-yellow-600 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-900">⚠️ Página de Testing</h3>
              <p className="text-yellow-800 text-sm">
                Esta página es solo para verificar la configuración inicial. 
                <strong> Eliminar antes de producción.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🎮 CONTROLES DE TEST */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Controles de Testing</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Test Completo */}
          <button
            onClick={ejecutarTestCompleto}
            disabled={ejecutando}
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex flex-col items-center space-y-2"
          >
            {ejecutando ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <Play size={24} />
            )}
            <span className="font-medium">Test Completo</span>
            <span className="text-xs opacity-90">Ejecutar todos los tests</span>
          </button>

          {/* Test Conexión */}
          <button
            onClick={ejecutarTestConexion}
            disabled={ejecutando}
            className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex flex-col items-center space-y-2"
          >
            <Database size={24} />
            <span className="font-medium">Solo Conexión</span>
            <span className="text-xs opacity-90">Verificar Supabase</span>
          </button>

          {/* Test Productos */}
          <button
            onClick={ejecutarTestProductos}
            disabled={ejecutando}
            className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex flex-col items-center space-y-2"
          >
            <CheckCircle size={24} />
            <span className="font-medium">Test Productos</span>
            <span className="text-xs opacity-90">Crear productos ejemplo</span>
          </button>

          {/* Limpiar */}
          <button
            onClick={limpiarDatos}
            disabled={ejecutando}
            className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors flex flex-col items-center space-y-2"
          >
            <Trash2 size={24} />
            <span className="font-medium">Limpiar Datos</span>
            <span className="text-xs opacity-90">Eliminar tests</span>
          </button>
        </div>
      </div>

      {/* 📊 ÁREA DE LOGS */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Logs de Ejecución</h2>
            <div className="flex space-x-2">
              {testCompletado && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle size={16} />
                  <span className="text-sm font-medium">Tests Completados</span>
                </div>
              )}
              <button
                onClick={limpiarLogs}
                className="text-gray-600 hover:text-gray-900 p-1 rounded"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Database className="mx-auto mb-4 text-gray-300" size={48} />
              <p>Haz clic en un botón para ejecutar los tests</p>
              <p className="text-sm">Los logs aparecerán aquí</p>
            </div>
          ) : (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
              {ejecutando && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Ejecutando...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 📋 INSTRUCCIONES */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 Qué hace cada test:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-900">🔗 Test Conexión:</h4>
            <ul className="text-blue-800 mt-1 space-y-1">
              <li>• Verifica conexión a Supabase</li>
              <li>• Comprueba que las tablas existen</li>
              <li>• Prueba permisos básicos</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-900">📦 Test Productos:</h4>
            <ul className="text-blue-800 mt-1 space-y-1">
              <li>• Crea 3 productos de ejemplo</li>
              <li>• Genera códigos de barras</li>
              <li>• Prueba búsquedas y updates</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-blue-900 text-sm">
            <strong>⭐ Recomendación:</strong> Ejecuta primero "Test Completo". 
            Si todo sale verde, ¡tu configuración está perfecta!
          </p>
        </div>
      </div>

      {/* ✅ RESULTADO EXITOSO */}
      {testCompletado && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="text-green-600" size={24} />
            <div>
              <h3 className="font-semibold text-green-900">🎉 ¡Tests Exitosos!</h3>
              <p className="text-green-800 text-sm mt-1">
                Tu configuración de Supabase está funcionando perfectamente. 
                Puedes continuar con la implementación de los componentes.
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-100 rounded">
            <h4 className="font-medium text-green-900 mb-2">🚀 Próximos pasos:</h4>
            <ul className="text-green-800 text-sm space-y-1">
              <li>1. Implementar el Dashboard de Inventario</li>
              <li>2. Crear el convertidor de Excel</li>
              <li>3. Configurar el escáner móvil</li>
              <li>4. Probar con códigos de barras reales</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestInventarioPage;