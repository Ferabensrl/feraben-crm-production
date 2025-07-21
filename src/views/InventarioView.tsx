import React, { useEffect, useState } from 'react';
import { InventarioItem, getInventario, formatearMoneda } from '../lib/supabase';

interface InventarioViewProps {
  currentUser: { id: number; nombre: string; rol: string };
}

const InventarioView: React.FC<InventarioViewProps> = ({ currentUser }) => {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getInventario();
      setItems(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6">Cargando inventario...</div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Inventario</h2>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map(item => (
              <tr key={item.sku}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.categoria || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{item.stock}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatearMoneda(item.precio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventarioView;
