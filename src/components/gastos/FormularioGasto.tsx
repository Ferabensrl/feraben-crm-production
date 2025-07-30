import React, { useState } from 'react';
import { Plus, Save, Building2, User, Calendar, Tag, DollarSign, FileText } from 'lucide-react';
import { crearGasto, CATEGORIAS_GASTOS } from '../../lib/supabase';

interface FormularioGastoProps {
  onGastoCreado: () => void;
  usuarioId: number;
}

const FormularioGasto: React.FC<FormularioGastoProps> = ({ onGastoCreado, usuarioId }) => {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
    categoria: '',
    descripcion: '',
    monto: '',
    tipo: 'Personal' as 'Empresa' | 'Personal'
  });
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categoriasPorTipo = formData.tipo === 'Empresa' 
    ? CATEGORIAS_GASTOS.EMPRESA 
    : CATEGORIAS_GASTOS.PERSONAL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fecha || !formData.categoria || !formData.monto) {
      setError('Por favor, complete todos los campos obligatorios');
      return;
    }

    if (isNaN(Number(formData.monto)) || Number(formData.monto) <= 0) {
      setError('El monto debe ser un número válido mayor a 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const categoriaFinal = formData.categoria === 'personalizada' 
        ? categoriaPersonalizada 
        : formData.categoria;

      const nuevoGasto = {
        fecha: formData.fecha,
        categoria: categoriaFinal,
        descripcion: formData.descripcion || null,
        monto: Number(formData.monto),
        tipo: formData.tipo,
        usuario_id: usuarioId
      };

      const resultado = await crearGasto(nuevoGasto);
      
      if (resultado) {
        // Resetear formulario
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          categoria: '',
          descripcion: '',
          monto: '',
          tipo: 'Personal'
        });
        setCategoriaPersonalizada('');
        onGastoCreado();
      } else {
        setError('Error al crear el gasto. Intente nuevamente.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al crear el gasto. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTipoChange = (nuevoTipo: 'Empresa' | 'Personal') => {
    setFormData(prev => ({ 
      ...prev, 
      tipo: nuevoTipo,
      categoria: '' // Reset categoría al cambiar tipo
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <Plus className="w-5 h-5 text-green-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Agregar Nuevo Gasto</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Tipo de Gasto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Tag className="w-4 h-4 inline mr-1" />
            Tipo de Gasto *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleTipoChange('Empresa')}
              className={`flex items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                formData.tipo === 'Empresa'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="w-5 h-5 mr-2" />
              Empresa
            </button>
            <button
              type="button"
              onClick={() => handleTipoChange('Personal')}
              className={`flex items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                formData.tipo === 'Personal'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="w-5 h-5 mr-2" />
              Personal
            </button>
          </div>
        </div>

        {/* Fecha */}
        <div>
          <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Fecha *
          </label>
          <input
            type="date"
            id="fecha"
            value={formData.fecha}
            onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            Categoría *
          </label>
          <select
            id="categoria"
            value={formData.categoria}
            onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Seleccionar categoría...</option>
            {categoriasPorTipo.map(categoria => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
            <option value="personalizada">+ Otra categoría (personalizada)</option>
          </select>
        </div>

        {/* Categoría personalizada */}
        {formData.categoria === 'personalizada' && (
          <div>
            <label htmlFor="categoriaPersonalizada" className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Categoría *
            </label>
            <input
              type="text"
              id="categoriaPersonalizada"
              value={categoriaPersonalizada}
              onChange={(e) => setCategoriaPersonalizada(e.target.value)}
              placeholder="Escriba el nombre de la nueva categoría"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        )}

        {/* Monto */}
        <div>
          <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Monto (UYU) *
          </label>
          <input
            type="number"
            id="monto"
            value={formData.monto}
            onChange={(e) => setFormData(prev => ({ ...prev, monto: e.target.value }))}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-1" />
            Descripción (Opcional)
          </label>
          <textarea
            id="descripcion"
            value={formData.descripcion}
            onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Detalles adicionales del gasto..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Botones */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Gasto'}
          </button>
        </div>

        {/* Información adicional */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="mb-2"><strong>Consejos:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Los gastos de <strong className="text-red-600">Empresa</strong> incluyen: Combustible Kangoo, Sueldos, BPS, etc.</li>
            <li>Los gastos <strong className="text-blue-600">Personales</strong> incluyen: UTE, Supermercado, Colegio, etc.</li>
            <li>Puede agregar categorías personalizadas si no encuentra la adecuada.</li>
            <li>La descripción es opcional pero útil para recordar detalles específicos.</li>
          </ul>
        </div>
      </form>
    </div>
  );
};

export default FormularioGasto;