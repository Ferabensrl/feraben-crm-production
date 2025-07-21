// src/components/ClientesView.tsx - VERSIÓN CORREGIDA SIN ERRORES
import React, { useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Users, TrendingUp, AlertTriangle, MapPin, User } from 'lucide-react'
import { Cliente, Movimiento, formatearMoneda, supabase } from '../lib/supabase'
import { FormularioCliente } from './FormularioCliente'
import { useBuscadorClientes } from '../hooks/useBuscador'
import { BuscadorClientes } from './Buscador'

interface ClientesViewProps {
  clientes: Cliente[]
  movimientos: Movimiento[]
  currentUser: { id: number; nombre: string; rol: string }
  onVerEstadoCuenta: (clienteId: number) => void
  onClienteCreado?: () => void
}

const ClientesView: React.FC<ClientesViewProps> = ({ 
  clientes, 
  movimientos, 
  currentUser, 
  onVerEstadoCuenta,
  onClienteCreado 
}) => {
  // Estados del componente
  const [showFormulario, setShowFormulario] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [eliminando, setEliminando] = useState<number | null>(null)
  
  // 🆕 ESTADOS PARA FILTROS AVANZADOS
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [filtroDepartamento, setFiltroDepartamento] = useState('')
  const [filtroSaldo, setFiltroSaldo] = useState<'todos' | 'con-deuda' | 'a-favor' | 'sin-movimientos'>('todos')
  const [historialBusquedas, setHistorialBusquedas] = useState<string[]>([])

  // 🔒 DETERMINAR PERMISOS SEGÚN ROL
  const esAdmin = currentUser.rol.toLowerCase() === 'admin'
  const puedeCrearClientes = esAdmin // Solo admin puede crear
  const puedeEditarClientes = esAdmin // Solo admin puede editar
  const puedeEliminarClientes = esAdmin // Solo admin puede eliminar

  // 🔧 CORRECCIÓN: Pre-calcular saldos usando TODOS los movimientos
  const saldosPorCliente = useMemo(() => {
    console.log('💰 Calculando saldos para', movimientos.length, 'movimientos...');
    
    const saldos: { [key: number]: number } = {}
    let movimientosProcesados = 0;
    
    for (const mov of movimientos) {
      if (mov.cliente_id && typeof mov.importe === 'number' && !isNaN(mov.importe)) {
        saldos[mov.cliente_id] = (saldos[mov.cliente_id] || 0) + mov.importe
        movimientosProcesados++;
      }
    }
    
    console.log(`✅ Saldos calculados para ${Object.keys(saldos).length} clientes`);
    return saldos
  }, [movimientos])

  // 🔧 CORRECCIÓN: Aplicar filtros según el rol del usuario
  const clientesFiltradosPorRol = useMemo(() => {
    if (esAdmin) {
      console.log('👑 Admin - Mostrando todos los clientes:', clientes.length);
      return clientes;
    } else {
      const clientesDelVendedor = clientes.filter(c => c.vendedor_id === currentUser.id);
      console.log(`👤 Vendedor ${currentUser.nombre} - Clientes asignados: ${clientesDelVendedor.length}`);
      return clientesDelVendedor;
    }
  }, [clientes, currentUser, esAdmin]);

  // 🔍 INTEGRACIÓN DEL BUSCADOR INTELIGENTE
  const { 
    termino, 
    setTermino, 
    resultados: clientesBuscados,
    limpiarBusqueda,
    cantidadResultados,
    esBusquedaActiva 
  } = useBuscadorClientes(clientesFiltradosPorRol);

  // 🎯 APLICAR FILTROS AVANZADOS SOBRE LOS RESULTADOS DE BÚSQUEDA
  const clientesFinales = useMemo(() => {
    let resultado = clientesBuscados;

    // Filtro por vendedor
    if (filtroVendedor) {
      resultado = resultado.filter(c => c.vendedor_id.toString() === filtroVendedor);
    }

    // Filtro por departamento
    if (filtroDepartamento) {
      resultado = resultado.filter(c => c.departamento === filtroDepartamento);
    }

    // Filtro por saldo
    if (filtroSaldo !== 'todos') {
      resultado = resultado.filter(c => {
        const saldo = saldosPorCliente[c.id] || 0;
        const tieneMovimientos = movimientos.some(m => m.cliente_id === c.id);
        
        switch (filtroSaldo) {
          case 'con-deuda':
            return saldo > 0.01;
          case 'a-favor':
            return saldo < -0.01;
          case 'sin-movimientos':
            return !tieneMovimientos;
          default:
            return true;
        }
      });
    }

    return resultado;
  }, [clientesBuscados, filtroVendedor, filtroDepartamento, filtroSaldo, saldosPorCliente, movimientos]);

  // 📊 ESTADÍSTICAS DINÁMICAS
  const estadisticas = useMemo(() => {
    const totalClientes = clientesFinales.length;
    const clientesConDeuda = clientesFinales.filter(c => (saldosPorCliente[c.id] || 0) > 0.01).length;
    const totalDeuda = clientesFinales.reduce((sum, c) => sum + Math.max(0, saldosPorCliente[c.id] || 0), 0);
    const clientesSinMovimientos = clientesFinales.filter(c => !movimientos.some(m => m.cliente_id === c.id)).length;

    return {
      totalClientes,
      clientesConDeuda,
      totalDeuda,
      clientesSinMovimientos
    };
  }, [clientesFinales, saldosPorCliente, movimientos]);

  // 🎯 OBTENER LISTAS ÚNICAS PARA FILTROS - CORREGIDO SIN SPREAD
  const vendedoresUnicos = useMemo(() => {
    const vendedoresMap = new Map();
    clientes.forEach(c => {
      if (c.vendedor_id && c.vendedor_nombre && !vendedoresMap.has(c.vendedor_id)) {
        vendedoresMap.set(c.vendedor_id, { id: c.vendedor_id, nombre: c.vendedor_nombre });
      }
    });
    return Array.from(vendedoresMap.values());
  }, [clientes]);

  const departamentosUnicos = useMemo(() => {
    const deptSet = new Set<string>();
    clientes.forEach(c => {
      if (c.departamento) {
        deptSet.add(c.departamento);
      }
    });
    return Array.from(deptSet).sort();
  }, [clientes]);

  // 🔍 MANEJO DE BÚSQUEDA CON HISTORIAL
  const manejarBusqueda = (nuevoTermino: string) => {
    setTermino(nuevoTermino);
    
    // Agregar al historial si es una búsqueda nueva
    if (nuevoTermino.trim() && !historialBusquedas.includes(nuevoTermino.trim())) {
      setHistorialBusquedas(prev => [nuevoTermino.trim(), ...prev.slice(0, 4)]);
    }
  };

  // 🎯 MANEJO DE FILTROS RÁPIDOS
  const manejarFiltroRapido = (filtroId: string) => {
    switch (filtroId) {
      case 'con-deuda':
        setFiltroSaldo(filtroSaldo === 'con-deuda' ? 'todos' : 'con-deuda');
        break;
      case 'activos':
        // Aquí podrías agregar un filtro por clientes activos si tienes ese campo
        break;
      case 'montevideo':
        setFiltroDepartamento(filtroDepartamento === 'Montevideo' ? '' : 'Montevideo');
        break;
    }
  };

  // 🔧 FUNCIÓN PARA OBTENER INFORMACIÓN DEL SALDO CON VALIDACIÓN
  const obtenerInfoSaldo = (clienteId: number) => {
    const saldo = saldosPorCliente[clienteId] || 0;
    const movimientosCliente = movimientos.filter(m => m.cliente_id === clienteId);
    
    return {
      saldo,
      cantidadMovimientos: movimientosCliente.length,
      tieneMovimientos: movimientosCliente.length > 0
    };
  };

  // 🎯 FUNCIÓN PARA RESALTAR TEXTO DE BÚSQUEDA
  const resaltarTexto = (texto: string, busqueda: string) => {
    if (!busqueda.trim()) return texto;
    
    const regex = new RegExp(`(${busqueda})`, 'gi');
    const partes = texto.split(regex);
    
    return partes.map((parte, index) => 
      regex.test(parte) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {parte}
        </mark>
      ) : parte
    );
  };

  const handleClienteGuardado = () => {
    if (onClienteCreado) {
      onClienteCreado()
    }
    cerrarFormulario()
  }

  const cerrarFormulario = () => {
    setShowFormulario(false)
    setClienteEditando(null)
  }

  const handleEditarCliente = (cliente: Cliente) => {
    if (!puedeEditarClientes) {
      alert('❌ No tienes permisos para editar clientes')
      return
    }
    setClienteEditando(cliente)
    setShowFormulario(true)
  }

  const handleEliminarCliente = async (cliente: Cliente) => {
    if (!puedeEliminarClientes) {
      alert('❌ No tienes permisos para eliminar clientes')
      return
    }

    const infoSaldo = obtenerInfoSaldo(cliente.id);
    
    let confirmMessage = `🗑️ ¿ELIMINAR CLIENTE?\n\nCliente: ${cliente.razon_social}\nRUT: ${cliente.rut}\n`

    if (infoSaldo.tieneMovimientos) {
      confirmMessage += `\n⚠️ ATENCIÓN: Este cliente tiene ${infoSaldo.cantidadMovimientos} movimientos y un saldo de ${formatearMoneda(infoSaldo.saldo)}.\nSi lo eliminas, se borrarán TODOS sus movimientos y cheques asociados.\n`
    }

    confirmMessage += `\nEsta acción NO se puede deshacer.\n\n¿Continuar?`

    if (!window.confirm(confirmMessage)) return

    try {
      setEliminando(cliente.id)
      
      console.log(`🗑️ Eliminando cliente ${cliente.razon_social}...`);
      
      // 1. Eliminar cheques asociados
      const { error: chequesError } = await supabase
        .from('cheques')
        .delete()
        .eq('cliente_id', cliente.id)
      
      if (chequesError) {
        console.error('Error eliminando cheques:', chequesError);
        throw new Error(`Error eliminando cheques: ${chequesError.message}`);
      }

      // 2. Eliminar movimientos asociados
      const { error: movimientosError } = await supabase
        .from('movimientos')
        .delete()
        .eq('cliente_id', cliente.id)
      
      if (movimientosError) {
        console.error('Error eliminando movimientos:', movimientosError);
        throw new Error(`Error eliminando movimientos: ${movimientosError.message}`);
      }

      // 3. Finalmente eliminar el cliente
      const { error: clienteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', cliente.id)
      
      if (clienteError) {
        console.error('Error eliminando cliente:', clienteError);
        throw new Error(`Error eliminando cliente: ${clienteError.message}`);
      }

      console.log('✅ Cliente eliminado correctamente');
      alert(`✅ Cliente "${cliente.razon_social}" eliminado correctamente.`)
      
      if (onClienteCreado) {
        onClienteCreado()
      }
    } catch (error: any) {
      console.error('❌ Error eliminando cliente:', error);
      alert(`❌ Error eliminando cliente: ${error.message}`)
    } finally {
      setEliminando(null)
    }
  }

  // 🎨 COMPONENTE VACÍO MEJORADO
  if (clientesFiltradosPorRol.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {esAdmin ? 'No hay clientes registrados' : 'No tienes clientes asignados'}
        </h3>
        <p className="text-gray-600 mb-6">
          {esAdmin 
            ? 'Comienza agregando tu primer cliente al sistema.' 
            : 'Contacta al administrador para que te asigne clientes.'}
        </p>
        {puedeCrearClientes && (
          <button
            onClick={() => setShowFormulario(true)}
            className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark font-medium"
          >
            <Plus size={20} className="inline mr-2" />
            Agregar Primer Cliente
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 🔝 HEADER CON INFORMACIÓN INTELIGENTE - ADAPTADO POR ROL */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="mr-3 text-primary" size={28} />
            {esAdmin ? 'Gestión de Clientes' : 'Mis Clientes'}
          </h2>
          <p className="text-gray-600 mt-1">
            {esBusquedaActiva ? (
              <span>
                {cantidadResultados} de {clientesFiltradosPorRol.length} clientes encontrados
                {termino && <span className="text-primary"> • Buscando: "{termino}"</span>}
              </span>
            ) : (
              `${clientesFiltradosPorRol.length} clientes ${esAdmin ? 'registrados en el sistema' : 'asignados a ti'}`
            )}
          </p>
        </div>
        
        {/* ❌ BOTÓN CREAR SOLO PARA ADMIN */}
        {puedeCrearClientes && (
          <button
            onClick={() => setShowFormulario(true)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center font-medium whitespace-nowrap"
          >
            <Plus size={20} className="mr-2" />
            Nuevo Cliente
          </button>
        )}
      </div>

      {/* 📊 ESTADÍSTICAS DINÁMICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.totalClientes}</p>
            </div>
            <Users className="text-blue-500" size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Con Deuda</p>
              <p className="text-2xl font-bold text-red-600">{estadisticas.clientesConDeuda}</p>
            </div>
            <AlertTriangle className="text-red-500" size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Deuda Total</p>
              <p className="text-lg font-bold text-green-600">{formatearMoneda(estadisticas.totalDeuda)}</p>
            </div>
            <TrendingUp className="text-green-500" size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sin Actividad</p>
              <p className="text-2xl font-bold text-gray-600">{estadisticas.clientesSinMovimientos}</p>
            </div>
            <MapPin className="text-gray-500" size={24} />
          </div>
        </div>
      </div>

      {/* 🔍 BUSCADOR INTELIGENTE */}
      <div className="bg-white rounded-lg shadow p-6">
        <BuscadorClientes
          onBuscar={manejarBusqueda}
          resultadosCount={cantidadResultados}
          onFiltroRapido={manejarFiltroRapido}
          historialBusquedas={historialBusquedas}
          onSeleccionarHistorial={setTermino}
          size="lg"
        />
      </div>

      {/* 🎯 FILTROS AVANZADOS */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filtro por vendedor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
            <select
              value={filtroVendedor}
              onChange={(e) => setFiltroVendedor(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los vendedores</option>
              {vendedoresUnicos.map(v => (
                <option key={v.id} value={v.id.toString()}>
                  {v.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por departamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los departamentos</option>
              {departamentosUnicos.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por saldo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Cuenta</label>
            <select
              value={filtroSaldo}
              onChange={(e) => setFiltroSaldo(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="todos">Todos</option>
              <option value="con-deuda">Con deuda</option>
              <option value="a-favor">A favor</option>
              <option value="sin-movimientos">Sin movimientos</option>
            </select>
          </div>

          {/* Botón limpiar filtros */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroVendedor('');
                setFiltroDepartamento('');
                setFiltroSaldo('todos');
                limpiarBusqueda();
              }}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* 📋 TABLA DE RESULTADOS */}
      {clientesFinales.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron clientes</h3>
          <p className="text-gray-500 mb-4">
            {esBusquedaActiva || filtroVendedor || filtroDepartamento || filtroSaldo !== 'todos'
              ? 'Intenta ajustar los filtros de búsqueda.'
              : 'No hay clientes que coincidan con los criterios.'}
          </p>
          <button
            onClick={() => {
              limpiarBusqueda();
              setFiltroVendedor('');
              setFiltroDepartamento('');
              setFiltroSaldo('todos');
            }}
            className="text-primary hover:text-primary-dark font-medium"
          >
            Limpiar todos los filtros
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RUT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientesFinales.map((cliente) => {
                  const infoSaldo = obtenerInfoSaldo(cliente.id);
                  
                  return (
                    <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {esBusquedaActiva ? resaltarTexto(cliente.razon_social, termino) : cliente.razon_social}
                          </div>
                          {cliente.nombre_fantasia && (
                            <div className="text-sm text-gray-500">
                              {esBusquedaActiva ? resaltarTexto(cliente.nombre_fantasia, termino) : cliente.nombre_fantasia}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {esBusquedaActiva ? resaltarTexto(cliente.rut, termino) : cliente.rut}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1 text-gray-400" />
                          <div>
                            <div>{esBusquedaActiva ? resaltarTexto(cliente.ciudad, termino) : cliente.ciudad}</div>
                            <div className="text-xs">{cliente.departamento}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <User size={14} className="mr-1 text-gray-400" />
                          {esBusquedaActiva ? resaltarTexto(cliente.vendedor_nombre || 'Sin asignar', termino) : (cliente.vendedor_nombre || 'Sin asignar')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${
                          infoSaldo.saldo > 0.01 ? 'text-red-600' : 
                          infoSaldo.saldo < -0.01 ? 'text-green-600' : 
                          'text-gray-900'
                        }`}>
                          {formatearMoneda(infoSaldo.saldo)}
                        </div>
                        {infoSaldo.tieneMovimientos && (
                          <div className="text-xs text-gray-500">
                            {infoSaldo.cantidadMovimientos} mov.
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center space-x-2">
                          {/* ✅ TODOS PUEDEN VER ESTADO DE CUENTA */}
                          <button
                            onClick={() => onVerEstadoCuenta(cliente.id)}
                            className="text-primary hover:text-primary-dark transition-colors"
                            title="Ver estado de cuenta"
                          >
                            📊
                          </button>
                          
                          {/* ❌ EDITAR SOLO ADMIN */}
                          {puedeEditarClientes && (
                            <button
                              onClick={() => handleEditarCliente(cliente)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Editar cliente"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          
                          {/* ❌ ELIMINAR SOLO ADMIN */}
                          {puedeEliminarClientes && (
                            <button
                              onClick={() => handleEliminarCliente(cliente)}
                              disabled={eliminando === cliente.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 transition-colors"
                              title="Eliminar cliente"
                            >
                              {eliminando === cliente.id ? (
                                <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 💡 MENSAJE INFORMATIVO PARA VENDEDORES */}
      {!esAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <User className="text-blue-600 mr-3" size={20} />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Vista de Vendedor - Solo Consulta</h4>
              <p className="text-sm text-blue-700">
                Estás viendo únicamente tus clientes asignados. Puedes consultar sus estados de cuenta pero no modificar la información.
                {estadisticas.totalClientes > 0 && ` Tienes ${estadisticas.totalClientes} clientes bajo tu gestión.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 FORMULARIO DE CLIENTE - SOLO ADMIN PUEDE ACCEDER */}
      {puedeCrearClientes && showFormulario && (
        <FormularioCliente
          isOpen={showFormulario}
          onClose={cerrarFormulario}
          onSuccess={handleClienteGuardado}
          clienteEditar={clienteEditando}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

export default ClientesView