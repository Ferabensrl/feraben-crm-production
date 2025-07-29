import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Scan, 
  FileSpreadsheet, 
  MessageSquare, 
  Plus,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';

interface ProductoInventario {
  id: string;
  codigo_producto: string;
  codigo_barras: string;
  descripcion: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  precio_venta: number;
  estado_stock: 'OK' | 'BAJO' | 'CRÍTICO';
}

interface EstadisticasInventario {
  total_productos: number;
  productos_activos: number;
  stock_critico: number;
  stock_bajo: number;
  valor_total_inventario: number;
}

const DashboardInventario: React.FC = () => {
  const [inventario, setInventario] = useState<ProductoInventario[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasInventario>({
    total_productos: 0,
    productos_activos: 0,
    stock_critico: 0,
    stock_bajo: 0,
    valor_total_inventario: 0
  });
  
  const [moduloActivo, setModuloActivo] = useState<string>('resumen');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    setCargando(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const inventarioSimulado: ProductoInventario[] = [
        {
          id: '1',
          codigo_producto: 'LB010',
          codigo_barras: '2025072100001',
          descripcion: 'CINTO DE DAMA',
          categoria: 'Cintos',
          stock: 50,
          stock_minimo: 10,
          precio_venta: 85,
          estado_stock: 'OK'
        },
        {
          id: '2',
          codigo_producto: 'W254',
          codigo_barras: '2025072100002',
          descripcion: 'BILLETERA DAMA',
          categoria: 'Billeteras',
          stock: 8,
          stock_minimo: 15,
          precio_venta: 120,
          estado_stock: 'BAJO'
        },
        {
          id: '3',
          codigo_producto: 'H005',
          codigo_barras: '2025072100003',
          descripcion: 'BANDOLERA',
          categoria: 'Bolsos',
          stock: 3,
          stock_minimo: 10,
          precio_venta: 95,
          estado_stock: 'CRÍTICO'
        }
      ];
      
      setInventario(inventarioSimulado);
      
      const stats: EstadisticasInventario = {
        total_productos: inventarioSimulado.length,
        productos_activos: inventarioSimulado.length,
        stock_critico: inventarioSimulado.filter(p => p.estado_stock === 'CRÍTICO').length,
        stock_bajo: inventarioSimulado.filter(p => p.estado_stock === 'BAJO').length,
        valor_total_inventario: inventarioSimulado.reduce((sum, p) => sum + (p.stock * p.precio_venta), 0)
      };
      
      setEstadisticas(stats);
      
    } catch (error) {
      console.error('Error al cargar inventario:', error);
    } finally {
      setCargando(false);
    }
  };

  const modulos = [
    {
      id: 'resumen',
      nombre: 'Resumen',
      icono: BarChart3,
      descripcion: 'Vista general del inventario'
    },
    {
      id: 'importar-excel',
      nombre: 'Importar Excel',
      icono: Upload,
      descripcion: 'Cargar productos desde planilla'
    },
    {
      id: 'escaner',
      nombre: 'Escáner',
      icono: Scan,
      descripcion: 'Escanear códigos de barras'
    },
    {
      id: 'whatsapp',
      nombre: 'WhatsApp',
      icono: MessageSquare,
      descripcion: 'Convertir pedidos de WhatsApp'
    },
    {
      id: 'facturacion',
      nombre: 'Facturación',
      icono: FileSpreadsheet,
      descripcion: 'Generar Excel para facturar'
    }
  ];

  const renderModuloActivo = () => {
    switch (moduloActivo) {
      case 'resumen':
        return <ModuloResumen estadisticas={estadisticas} inventario={inventario} />;
      case 'importar-excel':
        return <ModuloImportarExcel onImportacionCompleta={cargarInventario} />;
      case 'escaner':
        return <ModuloEscaner inventario={inventario} />;
      case 'whatsapp':
        return <ModuloWhatsApp inventario={inventario} />;
      case 'facturacion':
        return <ModuloFacturacion inventario={inventario} />;
      default:
        return <ModuloResumen estadisticas={estadisticas} inventario={inventario} />;
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Package className="text-blue-600" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Inventario Feraben
              </h1>
              <p className="text-gray-600">
                Sistema completo de gestión de inventario con códigos de barras
              </p>
            </div>
          </div>
          
          <button
            onClick={cargarInventario}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <Package className="text-blue-600" size={20} />
            <div>
              <p className="text-sm text-gray-600">Total Productos</p>
              <p className="text-xl font-bold">{estadisticas.total_productos}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-green-600" size={20} />
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-xl font-bold">{estadisticas.productos_activos}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="text-red-600" size={20} />
            <div>
              <p className="text-sm text-gray-600">Stock Crítico</p>
              <p className="text-xl font-bold text-red-600">{estadisticas.stock_critico}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="text-yellow-600" size={20} />
            <div>
              <p className="text-sm text-gray-600">Stock Bajo</p>
              <p className="text-xl font-bold text-yellow-600">{estadisticas.stock_bajo}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3">
            <BarChart3 className="text-purple-600" size={20} />
            <div>
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="text-xl font-bold">${estadisticas.valor_total_inventario.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Módulos del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {modulos.map((modulo) => (
            <button
              key={modulo.id}
              onClick={() => setModuloActivo(modulo.id)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                moduloActivo === modulo.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <modulo.icono 
                className={`mb-3 ${moduloActivo === modulo.id ? 'text-blue-600' : 'text-gray-600'}`}
                size={24} 
              />
              <h3 className={`font-semibold ${moduloActivo === modulo.id ? 'text-blue-900' : 'text-gray-900'}`}>
                {modulo.nombre}
              </h3>
              <p className={`text-sm ${moduloActivo === modulo.id ? 'text-blue-700' : 'text-gray-600'}`}>
                {modulo.descripcion}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        {renderModuloActivo()}
      </div>
    </div>
  );
};

// Módulos simplificados
const ModuloResumen: React.FC<any> = ({ estadisticas, inventario }) => (
  <div className="p-6">
    <h2 className="text-xl font-bold mb-4">📊 Resumen del Inventario</h2>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-4">Estado del Stock</h3>
        <div className="space-y-2">
          {inventario.map((producto: ProductoInventario) => (
            <div key={producto.id} className="flex justify-between">
              <span>{producto.codigo_producto}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                producto.estado_stock === 'OK' ? 'bg-green-100 text-green-800' :
                producto.estado_stock === 'BAJO' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {producto.stock} / {producto.stock_minimo}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-4">Productos por Categoría</h3>
        <p className="text-gray-600">Vista de categorías aquí...</p>
      </div>
    </div>
  </div>
);

const ModuloImportarExcel: React.FC<any> = ({ onImportacionCompleta }) => (
  <div className="p-6">
    <h2 className="text-xl font-bold mb-4">📤 Importar desde Excel</h2>
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <Upload className="mx-auto mb-4 text-gray-400" size={48} />
      <p className="text-gray-600">Próximamente: Importador de Excel</p>
    </div>
  </div>
);

const ModuloEscaner: React.FC<any> = ({ inventario }) => (
  <div className="p-6">
    <h2 className="text-xl font-bold mb-4">📱 Escáner de Códigos</h2>
    <div className="text-center">
      <Scan className="mx-auto mb-4 text-gray-400" size={48} />
      <p className="text-gray-600">Próximamente: Escáner móvil</p>
    </div>
  </div>
);

const ModuloWhatsApp: React.FC<any> = ({ inventario }) => (
  <div className="p-6">
    <h2 className="text-xl font-bold mb-4">💬 Convertidor WhatsApp</h2>
    <div className="text-center">
      <MessageSquare className="mx-auto mb-4 text-gray-400" size={48} />
      <p className="text-gray-600">Próximamente: Convertidor de pedidos</p>
    </div>
  </div>
);

const ModuloFacturacion: React.FC<any> = ({ inventario }) => (
  <div className="p-6">
    <h2 className="text-xl font-bold mb-4">💰 Generar Excel Facturación</h2>
    <div className="text-center">
      <FileSpreadsheet className="mx-auto mb-4 text-gray-400" size={48} />
      <p className="text-gray-600">Próximamente: Generador de Excel</p>
    </div>
  </div>
);

export default DashboardInventario;