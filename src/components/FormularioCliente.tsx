import React, { useState, useEffect } from 'react';
import { X, User, Building, AlertCircle } from 'lucide-react';
import { supabase, Cliente } from '../lib/supabase';

interface FormularioClienteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: { id: number; nombre: string; rol: string };
  clienteEditar?: Cliente | null;
}

interface Vendedor {
  id: number;
  nombre: string;
}

export const FormularioCliente: React.FC<FormularioClienteProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  clienteEditar,
}) => {
  const [formData, setFormData] = useState({
    rut: '',
    razon_social: '',
    nombre_fantasia: '',
    email: '',
    direccion: '',
    ciudad: 'Montevideo',
    departamento: 'Montevideo',
    vendedor_id: currentUser.id,
  });

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Cargar vendedores cuando se abre el formulario
  useEffect(() => {
    if (isOpen) {
      loadVendedores();
      // Si hay cliente para editar, cargar sus datos
      if (clienteEditar) {
        setFormData({
          rut: clienteEditar.rut,
          razon_social: clienteEditar.razon_social,
          nombre_fantasia: clienteEditar.nombre_fantasia || '',
          email: clienteEditar.email || '',
          direccion: clienteEditar.direccion || '',
          ciudad: clienteEditar.ciudad || 'Montevideo',
          departamento: clienteEditar.departamento || 'Montevideo',
          vendedor_id: clienteEditar.vendedor_id,
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, clienteEditar]);

  const loadVendedores = async () => {
    try {
      console.log('Cargando vendedores...');
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .order('nombre');

      if (error) throw error;

      console.log('Vendedores cargados:', data);
      setVendedores(data || []);
    } catch (error) {
      console.error('Error cargando vendedores:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      rut: '',
      razon_social: '',
      nombre_fantasia: '',
      email: '',
      direccion: '',
      ciudad: 'Montevideo',
      departamento: 'Montevideo',
      vendedor_id: currentUser.id,
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.rut.trim()) {
      newErrors.rut = 'El RUT es obligatorio';
    } else if (formData.rut.trim().length < 8) {
      newErrors.rut = 'El RUT debe tener al menos 8 dígitos';
    }

    if (!formData.razon_social.trim()) {
      newErrors.razon_social = 'La razón social es obligatoria';
    } else if (formData.razon_social.trim().length < 3) {
      newErrors.razon_social =
        'La razón social debe tener al menos 3 caracteres';
    }

    if (!formData.ciudad.trim()) {
      newErrors.ciudad = 'La ciudad es obligatoria';
    }

    if (!formData.departamento.trim()) {
      newErrors.departamento = 'El departamento es obligatorio';
    }

    if (!formData.vendedor_id || formData.vendedor_id === 0) {
      newErrors.vendedor_id = 'Debe seleccionar un vendedor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      const esEdicion = !!clienteEditar;
      console.log(
        `🚀 === INICIO ${esEdicion ? 'EDICIÓN' : 'CREACIÓN'} CLIENTE ===`
      );

      if (!esEdicion) {
        // MODO CREACIÓN - Verificar RUT duplicado
        const { data: clientesExistentes, error: checkError } = await supabase
          .from('clientes')
          .select('id, rut, razon_social')
          .eq('rut', formData.rut.trim());

        if (checkError) {
          console.error('❌ Error verificando RUT:', checkError);
          throw new Error(`Error verificando RUT: ${checkError.message}`);
        }

        if (clientesExistentes && clientesExistentes.length > 0) {
          const clienteExistente = clientesExistentes[0];
          console.log('⚠️ RUT ya existe:', clienteExistente);
          alert(
            `❌ RUT DUPLICADO\n\nYa existe un cliente con el RUT ${formData.rut.trim()}:\n"${clienteExistente.razon_social}" (ID: ${clienteExistente.id})\n\n✅ Solución: Use un RUT diferente.`
          );
          setLoading(false);
          return;
        }
      } else {
        // MODO EDICIÓN - Verificar RUT duplicado excluyendo el cliente actual
        const { data: clientesExistentes, error: checkError } = await supabase
          .from('clientes')
          .select('id, rut, razon_social')
          .eq('rut', formData.rut.trim())
          .neq('id', clienteEditar.id);

        if (checkError) {
          console.error('❌ Error verificando RUT:', checkError);
          throw new Error(`Error verificando RUT: ${checkError.message}`);
        }

        if (clientesExistentes && clientesExistentes.length > 0) {
          const clienteExistente = clientesExistentes[0];
          console.log('⚠️ RUT ya existe en otro cliente:', clienteExistente);
          alert(
            `❌ RUT DUPLICADO\n\nYa existe otro cliente con el RUT ${formData.rut.trim()}:\n"${clienteExistente.razon_social}" (ID: ${clienteExistente.id})\n\n✅ Solución: Use un RUT diferente.`
          );
          setLoading(false);
          return;
        }
      }

      console.log('✅ RUT disponible');

      // Preparar datos
      const clienteData = {
        rut: formData.rut.trim(),
        razon_social: formData.razon_social.trim(),
        nombre_fantasia: formData.nombre_fantasia.trim() || null,
        email: formData.email.trim() || null,
        direccion: formData.direccion.trim() || null,
        ciudad: formData.ciudad.trim(),
        departamento: formData.departamento.trim(),
        vendedor_id: formData.vendedor_id,
        activo: true,
      };

      console.log('📤 Datos a procesar:', clienteData);

      if (esEdicion) {
        // ACTUALIZAR cliente existente
        console.log('🔄 Actualizando cliente ID:', clienteEditar.id);
        const { data, error } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', clienteEditar.id)
          .select();

        if (error) {
          console.error('❌ Error en UPDATE:', error);
          throw error;
        }

        console.log('✅ Cliente actualizado:', data);
        alert(
          `✅ CLIENTE ACTUALIZADO\n\n• Nombre: ${formData.razon_social}\n• RUT: ${formData.rut}\n• ID: ${clienteEditar.id}\n\nLos cambios se guardaron correctamente.`
        );
      } else {
        // CREAR nuevo cliente
        console.log('💾 Creando nuevo cliente...');
        const { data, error } = await supabase
          .from('clientes')
          .insert([clienteData])
          .select();

        if (error) {
          console.error('❌ Error en INSERT:', error);
          throw error;
        }

        const clienteCreado = data[0];
        console.log('✅ Cliente creado:', clienteCreado);
        alert(
          `🎉 CLIENTE CREADO\n\n• Nombre: ${formData.razon_social}\n• RUT: ${formData.rut}\n• ID asignado: ${clienteCreado.id}\n• Vendedor: ${vendedores.find((v) => v.id === formData.vendedor_id)?.nombre}`
        );
      }

      // Limpiar formulario y recargar lista
      resetForm();
      onSuccess();
      onClose();
      console.log(
        `🏁 === FIN ${esEdicion ? 'EDICIÓN' : 'CREACIÓN'} - ÉXITO ===`
      );
    } catch (error: any) {
      console.error('💥 === ERROR CRÍTICO ===');
      console.error('❌ Error:', error);

      let errorMessage = `Error al ${clienteEditar ? 'actualizar' : 'crear'} el cliente`;

      if (
        error.message?.includes('RUT duplicado') ||
        error.message?.includes('duplicate')
      ) {
        errorMessage = `❌ RUT DUPLICADO\n\n${error.message}\n\n💡 Solución: Use un RUT diferente`;
      } else if (error.message?.includes('ID duplicado')) {
        errorMessage = `❌ PROBLEMA DE ID\n\n${error.message}\n\n💡 Solución: Contacte soporte técnico`;
      } else if (error.message?.includes('permisos')) {
        errorMessage = `❌ SIN PERMISOS\n\n${error.message}\n\n💡 Solución: Verificar políticas RLS en Supabase`;
      } else if (error.message) {
        errorMessage = `❌ ERROR\n\n${error.message}`;
      }

      alert(
        `${errorMessage}\n\n🔍 Revise la consola del navegador (F12) para más detalles técnicos.`
      );
      console.error('💥 === FIN ERROR CRÍTICO ===');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  const vendedorSeleccionado = vendedores.find(
    (v) => v.id === formData.vendedor_id
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {clienteEditar ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* RUT y Razón Social */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RUT *
              </label>
              <input
                type="text"
                value={formData.rut}
                onChange={(e) => handleInputChange('rut', e.target.value)}
                placeholder="Ej: 211234567890 (RUT real de la empresa)"
                maxLength={15}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.rut ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.rut && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  {errors.rut}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Ingrese el RUT real de la empresa (debe ser único)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social *
              </label>
              <input
                type="text"
                value={formData.razon_social}
                onChange={(e) =>
                  handleInputChange('razon_social', e.target.value)
                }
                placeholder="Empresa SA"
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.razon_social ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.razon_social && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  {errors.razon_social}
                </p>
              )}
            </div>
          </div>

          {/* Nombre Fantasía y Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Fantasía
              </label>
              <input
                type="text"
                value={formData.nombre_fantasia}
                onChange={(e) =>
                  handleInputChange('nombre_fantasia', e.target.value)
                }
                placeholder="Nombre comercial"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="cliente@email.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => handleInputChange('direccion', e.target.value)}
              placeholder="Dirección completa"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>

          {/* Ciudad y Departamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad *
              </label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => handleInputChange('ciudad', e.target.value)}
                placeholder="Montevideo"
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.ciudad ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.ciudad && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  {errors.ciudad}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departamento *
              </label>
              <select
                value={formData.departamento}
                onChange={(e) =>
                  handleInputChange('departamento', e.target.value)
                }
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.departamento ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="Montevideo">Montevideo</option>
                <option value="Canelones">Canelones</option>
                <option value="Maldonado">Maldonado</option>
                <option value="Colonia">Colonia</option>
                <option value="San José">San José</option>
                <option value="Florida">Florida</option>
                <option value="Lavalleja">Lavalleja</option>
                <option value="Rocha">Rocha</option>
                <option value="Treinta y Tres">Treinta y Tres</option>
                <option value="Cerro Largo">Cerro Largo</option>
                <option value="Rivera">Rivera</option>
                <option value="Tacuarembó">Tacuarembó</option>
                <option value="Durazno">Durazno</option>
                <option value="Flores">Flores</option>
                <option value="Soriano">Soriano</option>
                <option value="Río Negro">Río Negro</option>
                <option value="Paysandú">Paysandú</option>
                <option value="Salto">Salto</option>
                <option value="Artigas">Artigas</option>
              </select>
              {errors.departamento && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  {errors.departamento}
                </p>
              )}
            </div>
          </div>

          {/* Vendedor Asignado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendedor Asignado *
            </label>
            <select
              value={formData.vendedor_id}
              onChange={(e) =>
                handleInputChange('vendedor_id', parseInt(e.target.value))
              }
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.vendedor_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading || currentUser.rol !== 'admin'}
            >
              <option value={0}>Seleccionar vendedor...</option>
              {vendedores.map((vendedor) => (
                <option key={vendedor.id} value={vendedor.id}>
                  {vendedor.nombre}
                  {vendedor.id === currentUser.id ? ' (Yo)' : ''}
                </option>
              ))}
            </select>
            {errors.vendedor_id && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {errors.vendedor_id}
              </p>
            )}
          </div>

          {/* Preview del vendedor seleccionado */}
          {vendedorSeleccionado && (
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-center">
                <User size={16} className="text-primary-dark mr-2" />
                <span className="text-sm text-primary-dark">
                  <strong>Vendedor seleccionado:</strong>{' '}
                  {vendedorSeleccionado.nombre}
                  {vendedorSeleccionado.id === currentUser.id ? ' (Tú)' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {clienteEditar ? 'Actualizando...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <Building size={16} className="mr-2" />
                  {clienteEditar ? 'Actualizar Cliente' : 'Crear Cliente'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
