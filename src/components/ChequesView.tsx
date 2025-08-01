import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, DollarSign, User, FileText, Download } from 'lucide-react'
import { supabase, formatearMoneda, formatearFecha } from '../lib/supabase'
import { CurrentUser } from '../store/session'

interface Cheque {
  id: number
  numero_cheque: string
  banco: string
  cliente_id: number
  vendedor_id: number
  fecha_emision: string
  fecha_vencimiento: string
  importe: number
  estado: 'Pendiente' | 'Cobrado' | 'Rechazado' | 'Anulado'
  comentario?: string
  created_at: string
  clientes?: { razon_social: string }
  usuarios?: { nombre: string }
}

interface FormularioCheque {
  numero_cheque: string
  banco: string
  cliente_id: number
  fecha_emision: string
  fecha_vencimiento: string
  importe: number
  estado: 'Pendiente' | 'Cobrado' | 'Rechazado' | 'Anulado'
  comentario: string
}

interface ChequesViewProps {
  currentUser: CurrentUser
}

export const ChequesView: React.FC<ChequesViewProps> = ({ currentUser }) => {
  if (currentUser.rol.toLowerCase() !== 'admin') {
    return <div className="p-4">Acceso denegado</div>
  }
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFormulario, setShowFormulario] = useState(false)
  const [chequeEditando, setChequeEditando] = useState<Cheque | null>(null)
  const [eliminando, setEliminando] = useState<number | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  
  const [formData, setFormData] = useState<FormularioCheque>({
    numero_cheque: '',
    banco: '',
    cliente_id: 0,
    fecha_emision: '',
    fecha_vencimiento: '',
    importe: 0,
    estado: 'Pendiente',
    comentario: ''
  })

  useEffect(() => {
    loadData()
  }, [currentUser])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar cheques - 🔧 CORRECCIÓN: Sin join a usuarios
      let chequesQuery = supabase
        .from('cheques')
        .select(`
          *,
          clientes (razon_social)
        `)
        .order('fecha_vencimiento', { ascending: false })

      // Filtrar por vendedor si no es admin
      if (currentUser.rol.toLowerCase() !== 'admin') {
        chequesQuery = chequesQuery.eq('vendedor_id', currentUser.id)
      }

      const { data: chequesData, error: chequesError } = await chequesQuery
      
      if (chequesError) {
        console.error('Error cargando cheques:', chequesError)
        throw chequesError
      }

      // Cargar clientes para el formulario
      let clientesQuery = supabase
        .from('clientes')
        .select('id, razon_social, vendedor_id, activo')
        .eq('activo', true)
        .order('razon_social')

      if (currentUser.rol.toLowerCase() !== 'admin') {
        clientesQuery = clientesQuery.eq('vendedor_id', currentUser.id)
      }

      const { data: clientesData, error: clientesError } = await clientesQuery
      
      if (clientesError) {
        console.error('Error cargando clientes:', clientesError)
        throw clientesError
      }

      setCheques(chequesData || [])
      setClientes(clientesData || [])
      
    } catch (error: any) {
      console.error('Error cargando datos:', error)
      alert(`Error cargando datos: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const chequesFiltrados = cheques.filter(cheque => {
    if (!filtroEstado) return true
    return cheque.estado === filtroEstado
  })

  const estadisticas = {
    total: cheques.length,
    pendientes: cheques.filter(c => c.estado === 'Pendiente').length,
    cobrados: cheques.filter(c => c.estado === 'Cobrado').length,
    rechazados: cheques.filter(c => c.estado === 'Rechazado').length,
    importeTotal: cheques.reduce((sum, c) => sum + c.importe, 0),
    importePendiente: cheques.filter(c => c.estado === 'Pendiente').reduce((sum, c) => sum + c.importe, 0)
  }

  const resetForm = () => {
    setFormData({
      numero_cheque: '',
      banco: '',
      cliente_id: 0,
      fecha_emision: '',
      fecha_vencimiento: '',
      importe: 0,
      estado: 'Pendiente',
      comentario: ''
    })
    setChequeEditando(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.numero_cheque || !formData.banco || !formData.cliente_id || !formData.fecha_emision || !formData.fecha_vencimiento || !formData.importe) {
      alert('Por favor complete todos los campos obligatorios')
      return
    }

    try {
      const cliente = clientes.find(c => c.id === formData.cliente_id)
      if (!cliente) {
        alert('Cliente no encontrado')
        return
      }

      const chequeData = {
        ...formData,
        vendedor_id: cliente.vendedor_id || currentUser.id
      }

      if (chequeEditando) {
        const { error } = await supabase
          .from('cheques')
          .update(chequeData)
          .eq('id', chequeEditando.id)
        
        if (error) throw error
        alert('✅ Cheque actualizado correctamente')
      } else {
        const { error } = await supabase
          .from('cheques')
          .insert([chequeData])
        
        if (error) throw error
        alert('✅ Cheque creado correctamente')
      }

      setShowFormulario(false)
      resetForm()
      loadData()
      
    } catch (error: any) {
      console.error('Error guardando cheque:', error)
      alert(`Error: ${error.message}`)
    }
  }

  const handleEditar = (cheque: Cheque) => {
    if (currentUser.rol.toLowerCase() !== 'admin') {
      alert('❌ Solo los administradores pueden editar cheques')
      return
    }
    
    setFormData({
      numero_cheque: cheque.numero_cheque,
      banco: cheque.banco,
      cliente_id: cheque.cliente_id,
      fecha_emision: cheque.fecha_emision,
      fecha_vencimiento: cheque.fecha_vencimiento,
      importe: cheque.importe,
      estado: cheque.estado,
      comentario: cheque.comentario || ''
    })
    setChequeEditando(cheque)
    setShowFormulario(true)
  }

  const handleEliminar = async (cheque: Cheque) => {
    if (currentUser.rol.toLowerCase() !== 'admin') {
      alert('❌ Solo los administradores pueden eliminar cheques')
      return
    }

    if (!window.confirm(`¿Eliminar cheque ${cheque.numero_cheque} por ${formatearMoneda(cheque.importe)}?`)) return

    try {
      setEliminando(cheque.id)
      const { error } = await supabase
        .from('cheques')
        .delete()
        .eq('id', cheque.id)
      
      if (error) throw error
      alert('✅ Cheque eliminado')
      loadData()
    } catch (error: any) {
      alert(`Error eliminando cheque: ${error.message}`)
    } finally {
      setEliminando(null)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'Cobrado': return 'bg-green-100 text-green-800'
      case 'Rechazado': return 'bg-red-100 text-red-800'
      case 'Anulado': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando cheques...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {currentUser.rol === 'admin' ? 'Gestión de Cheques' : 'Mis Cheques'}
          </h2>
          <p className="text-gray-600 mt-1">
            {currentUser.rol === 'admin' 
              ? `${cheques.length} cheques registrados en el sistema`
              : `Tienes ${cheques.length} cheques bajo tu gestión`}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowFormulario(true)
          }}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center font-medium"
        >
          <Plus size={20} className="mr-2" />
          Nuevo Cheque
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cheques</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
            <FileText className="text-primary" size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{estadisticas.pendientes}</p>
            </div>
            <Calendar className="text-yellow-600" size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Importe Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatearMoneda(estadisticas.importeTotal)}</p>
            </div>
            <DollarSign className="text-green-600" size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendiente Cobrar</p>
              <p className="text-2xl font-bold text-red-600">{formatearMoneda(estadisticas.importePendiente)}</p>
            </div>
            <DollarSign className="text-red-600" size={24} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filtrar por estado:</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="">Todos</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Cobrado">Cobrados</option>
            <option value="Rechazado">Rechazados</option>
            <option value="Anulado">Anulados</option>
          </select>
        </div>
      </div>

      {/* Tabla de cheques */}
      {chequesFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay cheques</h3>
          <p className="text-gray-600 mb-6">
            {filtroEstado 
              ? `No se encontraron cheques con estado "${filtroEstado}"`
              : 'Comienza agregando tu primer cheque al sistema.'}
          </p>
          <button
            onClick={() => {
              resetForm()
              setShowFormulario(true)
            }}
            className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark font-medium"
          >
            <Plus size={20} className="inline mr-2" />
            Agregar Primer Cheque
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cheque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importe
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chequesFiltrados.map((cheque) => (
                  <tr key={cheque.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          N° {cheque.numero_cheque}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cheque.banco}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cheque.clientes?.razon_social || 'Cliente no encontrado'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Vendedor: {cheque.usuarios?.nombre || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Emisión: {formatearFecha(cheque.fecha_emision)}</div>
                      <div>Vencimiento: {formatearFecha(cheque.fecha_vencimiento)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatearMoneda(cheque.importe)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(cheque.estado)}`}>
                        {cheque.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleEditar(cheque)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar cheque"
                        >
                          <Edit size={16} />
                        </button>
                        {currentUser.rol.toLowerCase() === 'admin' && (
                          <button
                            onClick={() => handleEliminar(cheque)}
                            disabled={eliminando === cheque.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Eliminar cheque"
                          >
                            {eliminando === cheque.id ? (
                              <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formulario Modal */}
      {showFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                {chequeEditando ? 'Editar' : 'Nuevo'} Cheque
              </h3>
              <button 
                onClick={() => setShowFormulario(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Cheque *
                  </label>
                  <input
                    type="text"
                    value={formData.numero_cheque}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_cheque: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco *
                  </label>
                  <input
                    type="text"
                    value={formData.banco}
                    onChange={(e) => setFormData(prev => ({ ...prev, banco: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    value={formData.cliente_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value={0}>Seleccionar cliente...</option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.razon_social}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importe *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.importe}
                    onChange={(e) => setFormData(prev => ({ ...prev, importe: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Emisión *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_emision}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_emision: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Cobrado">Cobrado</option>
                    <option value="Rechazado">Rechazado</option>
                    <option value="Anulado">Anulado</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentarios
                </label>
                <textarea
                  value={formData.comentario}
                  onChange={(e) => setFormData(prev => ({ ...prev, comentario: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Comentarios adicionales sobre el cheque..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFormulario(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  {chequeEditando ? 'Actualizar' : 'Crear'} Cheque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}