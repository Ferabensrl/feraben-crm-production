import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  UserCheck,
  Calculator,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FormularioVendedor } from './FormularioVendedor'; // RUTA CORREGIDA
import { formatearMoneda } from '../../lib/supabase';

interface Vendedor {
  id: number;
  nombre: string;
  rol: 'admin' | 'vendedor';
  comision_porcentaje: number;
  comision_base: 'pagos' | 'ventas' | 'ambos';
  telefono?: string;
  email?: string;
  fecha_ingreso: string;
  activo: boolean;
  created_at: string;
  // Datos calculados
  clientes_asignados?: number;
  comision_mes_actual?: number;
}

interface VendedoresViewProps {
  currentUser: { id: number; nombre: string; rol: string };
}

const VendedoresView: React.FC<VendedoresViewProps> = ({ currentUser }) => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormulario, setShowFormulario] = useState(false);
  const [vendedorEditando, setVendedorEditando] = useState<Vendedor | null>(
    null
  );
  const [eliminando, setEliminando] = useState<number | null>(null);

  useEffect(() => {
    loadVendedores();
  }, []);

  const loadVendedores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nombre');
      if (error) throw error;

      const vendedoresEnriquecidos = await Promise.all(
        data.map(async (vendedor) => {
          const { count } = await supabase
            .from('clientes')
            .select('id', { count: 'exact' })
            .eq('vendedor_id', vendedor.id);
          return { ...vendedor, clientes_asignados: count || 0 };
        })
      );
      setVendedores(vendedoresEnriquecidos);
    } catch (error) {
      console.error('Error cargando vendedores:', error);
      alert('Error al cargar los vendedores');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarVendedor = async (vendedor: Vendedor) => {
    if (vendedor.id === currentUser.id) {
      alert('❌ No puedes eliminarte a ti mismo');
      return;
    }
    if (vendedor.clientes_asignados && vendedor.clientes_asignados > 0) {
      alert(
        `❌ No se puede eliminar. Reasigna sus ${vendedor.clientes_asignados} clientes.`
      );
      return;
    }
    if (
      !window.confirm(
        `🗑️ ¿ELIMINAR VENDEDOR ${vendedor.nombre}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setEliminando(vendedor.id);
    try {
      await supabase.from('usuarios').delete().eq('id', vendedor.id);
      alert('✅ Vendedor eliminado');
      loadVendedores();
    } catch (error: any) {
      alert(`❌ Error al eliminar: ${error.message}`);
    } finally {
      setEliminando(null);
    }
  };

  const handleVendedorGuardado = () => {
    loadVendedores();
    setShowFormulario(false);
    setVendedorEditando(null);
  };

  const formatearComisionBase = (base: string) => {
    const opciones: Record<string, string> = {
      pagos: 'Solo Pagos',
      ventas: 'Solo Ventas',
      ambos: 'Ventas y Pagos',
    };
    return opciones[base] || base;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Cargando vendedores...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Gestión de Vendedores
        </h2>
        <button
          onClick={() => {
            setVendedorEditando(null);
            setShowFormulario(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center"
        >
          <Plus size={20} className="mr-2" /> Nuevo Vendedor
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Comisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Clientes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vendedores.map((vendedor) => (
                <tr key={vendedor.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {vendedor.nombre}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {vendedor.rol}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">
                      {vendedor.comision_porcentaje}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatearComisionBase(vendedor.comision_base)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {vendedor.clientes_asignados || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vendedor.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {vendedor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setVendedorEditando(vendedor);
                        setShowFormulario(true);
                      }}
                      className="text-primary hover:text-primary-dark"
                    >
                      <Edit size={16} />
                    </button>
                    {vendedor.id !== currentUser.id && (
                      <button
                        onClick={() => handleEliminarVendedor(vendedor)}
                        disabled={eliminando === vendedor.id}
                        className="text-red-600 hover:text-red-800"
                      >
                        {eliminando === vendedor.id ? (
                          '...'
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormularioVendedor
        isOpen={showFormulario}
        onClose={() => setShowFormulario(false)}
        onSuccess={handleVendedorGuardado}
        currentUser={currentUser}
        vendedorEditar={vendedorEditando}
      />
    </div>
  );
};

export default VendedoresView;
