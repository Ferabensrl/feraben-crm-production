import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase, formatearMoneda, ajustarInventario } from '../lib/supabase'

interface Cliente {
  id: number
  razon_social: string
  vendedor_id: number
}

interface NuevoMovimiento {
  fecha: string
  cliente_id: number
  vendedor_id: number
  tipo_movimiento: 'Venta' | 'Pago' | 'Nota de Crédito' | 'Ajuste de Saldo' | 'Devolución'
  documento: string
  importe: number
  comentario: string
}

interface FormularioMovimientoProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentUser: { id: number; nombre: string; rol: string }
  movimientoEditar?: any
  clientePreseleccionado?: number
}

export const FormularioMovimiento: React.FC<FormularioMovimientoProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  movimientoEditar,
  clientePreseleccionado
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [saldoActual, setSaldoActual] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<NuevoMovimiento>({
    fecha: new Date().toISOString().split('T')[0],
    cliente_id: clientePreseleccionado || 0,
    vendedor_id: 0,
    tipo_movimiento: 'Venta',
    documento: '',
    importe: 0,
    comentario: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadClientes()
      if (movimientoEditar) {
        setFormData({
          fecha: movimientoEditar.fecha,
          cliente_id: movimientoEditar.cliente_id,
          vendedor_id: movimientoEditar.vendedor_id,
          tipo_movimiento: movimientoEditar.tipo_movimiento,
          documento: movimientoEditar.documento,
          importe: movimientoEditar.importe,
          comentario: movimientoEditar.comentario || ''
        })
      }
    }
  }, [isOpen, movimientoEditar])

  const loadClientes = async () => {
    try {
      console.log('🔍 Cargando clientes para formulario...')
      
      // 🔧 CORRECCIÓN: Cargar clientes según rol
      let query = supabase
        .from('clientes')
        .select('id, razon_social, vendedor_id, activo')
        .eq('activo', true)
        .order('razon_social')

      // Si no es admin, solo sus clientes
      if (currentUser.rol.toLowerCase() !== 'admin') {
        query = query.eq('vendedor_id', currentUser.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error cargando clientes:', error)
        throw error
      }

      console.log(`✅ Clientes cargados: ${data?.length || 0}`)
      
      if (data && data.length > 0) {
        setClientes(data)
        console.log('📋 Primeros 3 clientes:', data.slice(0, 3))
      } else {
        console.warn('⚠️ No se encontraron clientes activos')
        setClientes([])
      }

    } catch (error: any) {
      console.error('❌ Error cargando clientes:', error)
      alert(`Error cargando clientes: ${error.message}`)
      setClientes([])
    }
  }

  const obtenerSaldoCliente = async (clienteId: number) => {
    try {
      const { data: movimientos, error } = await supabase
        .from('movimientos')
        .select('importe')
        .eq('cliente_id', clienteId)

      if (error) throw error

      const saldo = movimientos?.reduce((sum, mov) => sum + mov.importe, 0) || 0
      setSaldoActual(saldo)
      console.log(`💰 Saldo del cliente ${clienteId}: ${formatearMoneda(saldo)}`)
    } catch (error) {
      console.error('Error obteniendo saldo:', error)
      setSaldoActual(null)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.fecha) newErrors.fecha = 'Fecha requerida'
    if (!formData.cliente_id) newErrors.cliente_id = 'Cliente requerido'
    if (!formData.tipo_movimiento) newErrors.tipo_movimiento = 'Tipo de movimiento requerido'
    if (!formData.documento.trim()) newErrors.documento = 'Documento requerido'
    if (!formData.importe || formData.importe === 0) newErrors.importe = 'Importe debe ser mayor a 0'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)

      // Buscar datos del cliente
      const cliente = clientes.find(c => c.id === formData.cliente_id)
      if (!cliente) {
        alert('❌ Cliente no encontrado')
        return
      }

      // Preparar datos del movimiento
      const movimientoData = {
        ...formData,
        vendedor_id: cliente.vendedor_id, // Usar vendedor del cliente
        // Convertir importe a negativo si es pago/devolución
        importe: ['Pago', 'Nota de Crédito', 'Devolución'].includes(formData.tipo_movimiento) 
          ? -Math.abs(formData.importe) 
          : Math.abs(formData.importe)
      }

      console.log('💾 Guardando movimiento:', movimientoData)

      const { data, error } = movimientoEditar
        ? await supabase.from('movimientos').update(movimientoData).eq('id', movimientoEditar.id).select()
        : await supabase.from('movimientos').insert([movimientoData]).select()

      if (error) {
        console.error('❌ Error guardando movimiento:', error)
        throw error
      }

      console.log('✅ Movimiento guardado:', data)
      alert(`✅ Movimiento ${movimientoEditar ? 'actualizado' : 'creado'} correctamente`)

      if (!movimientoEditar && formData.tipo_movimiento === 'Venta') {
        // Ajustar inventario restando 1 unidad al SKU indicado en el documento
        await ajustarInventario(formData.documento, -1)
      }

      onSuccess()
      onClose()
      
    } catch (err: any) {
      console.error('❌ Error en handleSubmit:', err)
      alert(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof NuevoMovimiento, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleClienteChange = (clienteId: number) => {
    const cliente = clientes.find(c => c.id === clienteId)
    setFormData(prev => ({ 
      ...prev, 
      cliente_id: clienteId, 
      vendedor_id: cliente?.vendedor_id || currentUser.id 
    }))
    
    if (clienteId > 0) {
      obtenerSaldoCliente(clienteId)
    } else {
      setSaldoActual(null)
    }
  }

  if (!isOpen) return null

  const clienteSeleccionado = clientes.find(c => c.id === formData.cliente_id)
  const saldoProyectado = saldoActual !== null ? saldoActual + formData.importe : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            {movimientoEditar ? 'Editar' : 'Nuevo'} Movimiento
          </h3>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
              <select 
                value={formData.cliente_id} 
                onChange={(e) => handleClienteChange(parseInt(e.target.value))} 
                className={`w-full border rounded-md p-2 ${errors.cliente_id ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading || !!clientePreseleccionado}
              >
                <option value={0}>Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social}
                  </option>
                ))}
              </select>
              {errors.cliente_id && <p className="text-red-500 text-xs mt-1">{errors.cliente_id}</p>}
              {clientes.length === 0 && (
                <p className="text-amber-600 text-xs mt-1">⚠️ No hay clientes disponibles</p>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
              <input 
                type="date" 
                value={formData.fecha} 
                onChange={e => handleInputChange('fecha', e.target.value)} 
                className={`w-full border rounded-md p-2 ${errors.fecha ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha}</p>}
            </div>

            {/* Tipo de Movimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento *</label>
              <select 
                value={formData.tipo_movimiento} 
                onChange={e => handleInputChange('tipo_movimiento', e.target.value)}
                className={`w-full border rounded-md p-2 ${errors.tipo_movimiento ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              >
                <option value="Venta">Venta</option>
                <option value="Pago">Pago</option>
                <option value="Nota de Crédito">Nota de Crédito</option>
                <option value="Ajuste de Saldo">Ajuste de Saldo</option>
                <option value="Devolución">Devolución</option>
              </select>
              {errors.tipo_movimiento && <p className="text-red-500 text-xs mt-1">{errors.tipo_movimiento}</p>}
            </div>

            {/* Importe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Importe (Siempre positivo) *
              </label>
              <input 
                type="number" 
                step="0.01" 
                value={formData.importe || ''} 
                onChange={e => handleInputChange('importe', parseFloat(e.target.value) || 0)}
                className={`w-full border rounded-md p-2 ${errors.importe ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="0.00"
                disabled={loading}
              />
              {errors.importe && <p className="text-red-500 text-xs mt-1">{errors.importe}</p>}
            </div>

            {/* Documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Documento / Referencia *</label>
              <input 
                type="text" 
                value={formData.documento} 
                onChange={e => handleInputChange('documento', e.target.value)}
                className={`w-full border rounded-md p-2 ${errors.documento ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="A-1234, REC001, etc."
                disabled={loading}
              />
              {errors.documento && <p className="text-red-500 text-xs mt-1">{errors.documento}</p>}
            </div>

            {/* Vendedor (solo información) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendedor</label>
              <input 
                type="text" 
                value={clienteSeleccionado ? `ID: ${clienteSeleccionado.vendedor_id}` : currentUser.nombre}
                className="w-full border rounded-md p-2 bg-gray-100"
                disabled
              />
            </div>
          </div>

          {/* Vista previa del saldo */}
          {saldoActual !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">📊 Vista Previa del Saldo</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Saldo Actual:</span>
                  <span className="font-medium ml-2">{formatearMoneda(saldoActual)}</span>
                </div>
                <div>
                  <span className="text-blue-700">Saldo Proyectado:</span>
                  <span className={`font-medium ml-2 ${saldoProyectado && saldoProyectado > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {saldoProyectado !== null ? formatearMoneda(saldoProyectado) : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Comentario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comentario</label>
            <textarea 
              value={formData.comentario} 
              onChange={e => handleInputChange('comentario', e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              rows={3}
              placeholder="Comentarios adicionales..."
              disabled={loading}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
            >
              {loading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />}
              {movimientoEditar ? 'Actualizar' : 'Crear'} Movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}