import React, { useState, useEffect } from 'react';
import { X, UserCheck, Calculator, AlertCircle, Phone, Mail, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Vendedor {
  id: number
  nombre: string
  rol: 'admin' | 'vendedor'
  comision_porcentaje: number
  comision_base: 'pagos' | 'ventas' | 'ambos'
  telefono?: string
  email?: string
  fecha_ingreso: string
  activo: boolean
}

interface FormularioVendedorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: { id: number; nombre: string; rol: string };
  vendedorEditar?: Vendedor | null;
}

export const FormularioVendedor: React.FC<FormularioVendedorProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  vendedorEditar
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    rol: 'vendedor' as 'admin' | 'vendedor',
    comision_porcentaje: 0,
    comision_base: 'pagos' as 'pagos' | 'ventas' | 'ambos',
    telefono: '',
    email: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    activo: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Cargar datos del vendedor cuando se abre para edición
  useEffect(() => {
    if (isOpen) {
      if (vendedorEditar) {
        setFormData({
          nombre: vendedorEditar.nombre,
          rol: vendedorEditar.rol,
          comision_porcentaje: vendedorEditar.comision_porcentaje,
          comision_base: vendedorEditar.comision_base,
          telefono: vendedorEditar.telefono || '',
          email: vendedorEditar.email || '',
          fecha_ingreso: vendedorEditar.fecha_ingreso.split('T')[0], // Asegurar formato YYYY-MM-DD
          activo: vendedorEditar.activo
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, vendedorEditar]);

  const resetForm = () => {
    setFormData({
      nombre: '',
      rol: 'vendedor',
      comision_porcentaje: 0,
      comision_base: 'pagos',
      telefono: '',
      email: '',
      fecha_ingreso: new Date().toISOString().split('T')[0],
      activo: true
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (formData.comision_porcentaje < 0 || formData.comision_porcentaje > 100) {
      newErrors.comision_porcentaje = 'El porcentaje debe estar entre 0 y 100';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.fecha_ingreso) {
      newErrors.fecha_ingreso = 'La fecha de ingreso es obligatoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const esEdicion = !!vendedorEditar;
      const vendedorData = {
        nombre: formData.nombre.trim(),
        rol: formData.rol,
        comision_porcentaje: formData.comision_porcentaje,
        comision_base: formData.comision_base,
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        fecha_ingreso: formData.fecha_ingreso,
        activo: formData.activo
      };

      let error;
      if (esEdicion) {
        ({ error } = await supabase.from('usuarios').update(vendedorData).eq('id', vendedorEditar.id));
      } else {
        ({ error } = await supabase.from('usuarios').insert([vendedorData]));
      }

      if (error) throw error;
      
      alert(`✅ Vendedor ${esEdicion ? 'actualizado' : 'creado'} exitosamente.`);
      onSuccess();
      onClose();

    } catch (err: any) {
      console.error('Error guardando vendedor:', err);
      alert(`❌ Error al guardar el vendedor: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">{vendedorEditar ? 'Editar Vendedor' : 'Nuevo Vendedor'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo *</label>
              <input type="text" value={formData.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} placeholder="Ej: Juan Pérez" className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.nombre ? 'border-red-500' : 'border-gray-300'}`} disabled={loading} />
              {errors.nombre && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rol *</label>
              <select value={formData.rol} onChange={(e) => handleInputChange('rol', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading}><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></select>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center"><Calculator className="mr-2 text-primary" size={20} />Configuración de Comisión</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Porcentaje de Comisión *</label>
                <div className="relative">
                  <input type="number" value={formData.comision_porcentaje} onChange={(e) => handleInputChange('comision_porcentaje', parseFloat(e.target.value) || 0)} placeholder="15" min="0" max="100" step="0.01" className={`w-full border rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary ${errors.comision_porcentaje ? 'border-red-500' : 'border-gray-300'}`} disabled={loading} />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
                {errors.comision_porcentaje && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.comision_porcentaje}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base de Cálculo *</label>
                <select value={formData.comision_base} onChange={(e) => handleInputChange('comision_base', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading}><option value="pagos">Solo sobre pagos recibidos</option><option value="ventas">Solo sobre ventas realizadas</option><option value="ambos">Sobre ventas y pagos</option></select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input type="tel" value={formData.telefono} onChange={(e) => handleInputChange('telefono', e.target.value)} placeholder="099123456" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="vendedor@empresa.com" className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.email ? 'border-red-500' : 'border-gray-300'}`} disabled={loading} />
              {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Ingreso *</label>
              <input type="date" value={formData.fecha_ingreso} onChange={(e) => handleInputChange('fecha_ingreso', e.target.value)} className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.fecha_ingreso ? 'border-red-500' : 'border-gray-300'}`} disabled={loading} />
              {errors.fecha_ingreso && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.fecha_ingreso}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center"><input type="radio" name="activo" checked={formData.activo} onChange={() => handleInputChange('activo', true)} className="mr-2" disabled={loading} /><span className="text-sm text-green-600">Activo</span></label>
                <label className="flex items-center"><input type="radio" name="activo" checked={!formData.activo} onChange={() => handleInputChange('activo', false)} className="mr-2" disabled={loading} /><span className="text-sm text-red-600">Inactivo</span></label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800" disabled={loading}>Cancelar</button>
            <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center">
              {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{vendedorEditar ? 'Actualizando...' : 'Creando...'}</> : <><UserCheck size={16} className="mr-2" />{vendedorEditar ? 'Actualizar Vendedor' : 'Crear Vendedor'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};