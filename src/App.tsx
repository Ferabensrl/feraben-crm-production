import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, FileText, BarChart3, LogOut, Menu, X, UserCheck, Calculator, DollarSign, CreditCard, Loader2 } from 'lucide-react';
import { Cliente, Movimiento, getClientes, getMovimientosCompleto, supabase } from './lib/supabase';
import logger from './utils/logger';
import Dashboard from './components/Dashboard';
import ClientesView from './components/ClientesView';
import { MovimientosView } from './components/MovimientosView';
import EstadoCuentaView from './components/EstadoCuentaView';
import VendedoresView from './components/comisiones/VendedoresView';
import ComisionesView from './components/comisiones/ComisionesView';
import LiquidacionesView from './components/comisiones/LiquidacionesView';
import { ChequesView } from './components/ChequesView';
import { LoginScreen } from './components/LoginScreen';

type ViewType = 'dashboard' | 'clientes' | 'movimientos' | 'cheques' | 'estado-cuenta' | 'vendedores' | 'comisiones' | 'liquidaciones';

interface CurrentUser {
  id: number;
  auth_id: string;
  nombre: string;
  rol: 'admin' | 'vendedor';
}

interface Cheque {
  id: number;
  numero_cheque: string;
  banco: string;
  cliente_id: number;
  vendedor_id: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  importe: number;
  estado: 'Pendiente' | 'Cobrado' | 'Rechazado' | 'Anulado';
  comentario?: string;
  clientes?: { razon_social: string };
}

interface AppState {
  currentUser: CurrentUser | null;
  activeView: ViewType;
  clientes: Cliente[];
  movimientos: Movimiento[];
  cheques: Cheque[];
  selectedClienteId: number | null;
  isLoading: boolean;
  isAuthLoading: boolean;
  isMobileMenuOpen: boolean;
}

function App() {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    activeView: 'dashboard',
    clientes: [],
    movimientos: [],
    cheques: [],
    selectedClienteId: null,
    isLoading: false,
    isAuthLoading: true,
    isMobileMenuOpen: false,
  });

  const loadCheques = async (): Promise<Cheque[]> => {
    try {
      logger.log('📋 Cargando cheques...');
      
      let chequesQuery = supabase
        .from('cheques')
        .select(`
          *,
          clientes (razon_social)
        `)
        .order('fecha_vencimiento', { ascending: false });

      if (state.currentUser && state.currentUser.rol.toLowerCase() !== 'admin') {
        chequesQuery = chequesQuery.eq('vendedor_id', state.currentUser.id);
      }

      const { data, error } = await chequesQuery;
      
      if (error) {
        logger.error('❌ Error cargando cheques:', error);
        throw error;
      }

      logger.log(`✅ Cheques cargados: ${data?.length || 0}`);
      return data || [];
      
    } catch (error: any) {
      logger.error('❌ Error en loadCheques:', error);
      return [];
    }
  };

  const loadData = useCallback(async () => {
    if (!state.currentUser) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      logger.log('🔄 Cargando datos para usuario:', state.currentUser.nombre, 'rol:', state.currentUser.rol);
      
      const [clientesData, movimientosData, chequesData] = await Promise.all([
        getClientes(), 
        getMovimientosCompleto(),
        loadCheques()
      ]);
      
      logger.log('✅ Datos cargados - Clientes:', clientesData.length, 'Movimientos:', movimientosData.length, 'Cheques:', chequesData.length);
      
      setState(prev => ({ 
        ...prev, 
        clientes: clientesData, 
        movimientos: movimientosData,
        cheques: chequesData,
        isLoading: false 
      }));
    } catch (error) {
      logger.error('❌ Error cargando datos:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      alert('Error al cargar los datos. Revise la consola para más detalles.');
    }
  }, [state.currentUser]);

  useEffect(() => {
    const handleAuthChange = async (session: any) => {
      if (session && session.user) {
        if (!state.currentUser || state.currentUser.auth_id !== session.user.id) {
          logger.log('🔐 Autenticando usuario:', session.user.id);
          
          const { data: userData, error } = await supabase
            .from('usuarios')
            .select('id, auth_id, nombre, rol')
            .eq('auth_id', session.user.id)
            .single();
          
          if (userData) {
            logger.log('👤 Usuario encontrado:', userData.nombre, 'rol:', userData.rol);
            setState(prev => ({ 
              ...prev, 
              currentUser: userData, 
              isAuthLoading: false 
            }));
          } else {
            logger.error('❌ Usuario no encontrado en la base de datos:', error);
            await supabase.auth.signOut();
            setState(prev => ({ ...prev, isAuthLoading: false }));
          }
        } else {
          setState(prev => ({ ...prev, isAuthLoading: false }));
        }
      } else {
        logger.log('🚪 Sin sesión activa');
        setState(prev => ({ 
          ...prev, 
          currentUser: null, 
          clientes: [], 
          movimientos: [],
          cheques: [],
          isAuthLoading: false 
        }));
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [state.currentUser]);

  useEffect(() => {
    if (state.currentUser && state.clientes.length === 0) {
      loadData();
    }
  }, [state.currentUser, state.clientes.length, loadData]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setState(prev => ({ 
        ...prev, 
        currentUser: null, 
        clientes: [], 
        movimientos: [],
        cheques: [],
        activeView: 'dashboard' 
      }));
    }
  };

  const handleViewChange = (view: ViewType) => {
    setState(prev => ({ ...prev, activeView: view, isMobileMenuOpen: false }));
  };

  const handleVerEstadoCuenta = (clienteId: number) => {
    setState(prev => ({ 
      ...prev, 
      activeView: 'estado-cuenta', 
      selectedClienteId: clienteId 
    }));
  };

  const toggleMobileMenu = () => {
    setState(prev => ({ ...prev, isMobileMenuOpen: !prev.isMobileMenuOpen }));
  };

  // 🔧 FILTROS DE DATOS POR ROL
  const { clientesVisibles, movimientosVisibles, chequesVisibles } = useMemo(() => {
    if (!state.currentUser) {
      return { clientesVisibles: [], movimientosVisibles: [], chequesVisibles: [] };
    }

    const esAdmin = state.currentUser.rol.toLowerCase() === 'admin';
    
    if (esAdmin) {
      // ✅ ADMIN VE TODO
      logger.log('👑 Admin - Mostrando todos los datos');
      return {
        clientesVisibles: state.clientes,
        movimientosVisibles: state.movimientos,
        chequesVisibles: state.cheques
      };
    } else {
      // ✅ VENDEDOR VE SOLO SUS CLIENTES Y MOVIMIENTOS
      const clientesFiltrados = state.clientes.filter(c => c.vendedor_id === state.currentUser!.id);
      const movimientosFiltrados = state.movimientos.filter(m => m.vendedor_id === state.currentUser!.id);
      const chequesFiltrados = state.cheques.filter(ch => ch.vendedor_id === state.currentUser!.id);
      
      logger.log(`👤 Vendedor ${state.currentUser!.nombre} - Clientes: ${clientesFiltrados.length}, Movimientos: ${movimientosFiltrados.length}, Cheques: ${chequesFiltrados.length}`);
      
      return {
        clientesVisibles: clientesFiltrados,
        movimientosVisibles: movimientosFiltrados,
        chequesVisibles: chequesFiltrados
      };
    }
  }, [state.clientes, state.movimientos, state.cheques, state.currentUser]);

  const estadoCuentaMovimientos = useMemo(() => {
    if (!state.selectedClienteId) return [];
    
    return state.movimientos
      .filter(m => m.cliente_id === state.selectedClienteId)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [state.movimientos, state.selectedClienteId]);

  if (state.isAuthLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mb-4" size={48} />
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!state.currentUser) {
    return <LoginScreen />;
  }

  const esAdmin = state.currentUser.rol.toLowerCase() === 'admin';

  return (
    <div className="min-h-screen bg-secondary text-gray-800">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleMobileMenu} 
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {state.isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-xl font-bold text-primary">CRM Feraben</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{state.currentUser.nombre}</div>
              <div className="text-xs text-gray-500 capitalize">
                {state.currentUser.rol === 'admin' ? '👑 Administrador' : '👤 Vendedor'}
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 🔒 NAVEGACIÓN CONDICIONAL POR ROL */}
        <aside className={`${state.isMobileMenuOpen ? 'block' : 'hidden'} md:block w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen absolute md:relative z-20 md:z-0`}>
          <nav className="p-4 space-y-2">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Principal</h3>
              <NavItem 
                icon={<BarChart3 size={20} />} 
                label={esAdmin ? "Dashboard" : "Mi Dashboard"} 
                active={state.activeView === 'dashboard'} 
                onClick={() => handleViewChange('dashboard')} 
              />
              <NavItem 
                icon={<Users size={20} />} 
                label={esAdmin ? "Clientes" : "Mis Clientes"} 
                active={state.activeView === 'clientes'} 
                onClick={() => handleViewChange('clientes')} 
              />
              <NavItem 
                icon={<FileText size={20} />} 
                label={esAdmin ? "Movimientos" : "Mis Movimientos"} 
                active={state.activeView === 'movimientos'} 
                onClick={() => handleViewChange('movimientos')} 
              />
              
              {/* ❌ CHEQUES SOLO PARA ADMIN */}
              {esAdmin && (
                <NavItem 
                  icon={<CreditCard size={20} />} 
                  label="Cheques" 
                  active={state.activeView === 'cheques'} 
                  onClick={() => handleViewChange('cheques')} 
                />
              )}
            </div>
            
            {/* ❌ SECCIÓN COMISIONES SOLO PARA ADMIN */}
            {esAdmin && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Administración</h3>
                <NavItem 
                  icon={<UserCheck size={20} />} 
                  label="Vendedores" 
                  active={state.activeView === 'vendedores'} 
                  onClick={() => handleViewChange('vendedores')} 
                />
                <NavItem 
                  icon={<Calculator size={20} />} 
                  label="Comisiones" 
                  active={state.activeView === 'comisiones'} 
                  onClick={() => handleViewChange('comisiones')} 
                />
                <NavItem 
                  icon={<DollarSign size={20} />} 
                  label="Liquidaciones" 
                  active={state.activeView === 'liquidaciones'} 
                  onClick={() => handleViewChange('liquidaciones')} 
                />
              </div>
            )}

            {/* 💡 MENSAJE INFORMATIVO PARA VENDEDORES */}
            {!esAdmin && (
              <div className="mt-8 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-blue-800 font-medium mb-1">
                  👤 Vista de Vendedor
                </div>
                <div className="text-xs text-blue-600">
                  Estás viendo únicamente tus datos asignados.
                </div>
              </div>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-6 bg-secondary">
          {state.isLoading && state.clientes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="animate-spin text-primary mb-4" size={40} />
                <p className="text-gray-600">Cargando datos...</p>
              </div>
            </div>
          ) : (
            <>
              {state.activeView === 'dashboard' && (
                <Dashboard 
                  clientes={clientesVisibles} 
                  movimientos={movimientosVisibles}
                  cheques={chequesVisibles}
                  currentUser={state.currentUser} 
                />
              )}
              
              {state.activeView === 'clientes' && (
                <ClientesView 
                  clientes={clientesVisibles} 
                  movimientos={state.movimientos}
                  currentUser={state.currentUser} 
                  onVerEstadoCuenta={handleVerEstadoCuenta} 
                  onClienteCreado={loadData} 
                />
              )}
              
              {state.activeView === 'estado-cuenta' && state.selectedClienteId && (
                <EstadoCuentaView 
                  clienteId={state.selectedClienteId} 
                  clientes={state.clientes} 
                  movimientos={estadoCuentaMovimientos} 
                  onVolver={() => handleViewChange('clientes')} 
                  currentUser={state.currentUser} 
                  onMovimientoChange={loadData} 
                />
              )}
              
              {state.activeView === 'movimientos' && (
                <MovimientosView 
                  currentUser={state.currentUser} 
                  movimientos={movimientosVisibles} 
                  onMovimientoChange={loadData} 
                />
              )}
              
              {/* ❌ CHEQUES SOLO PARA ADMIN */}
              {state.activeView === 'cheques' && esAdmin && (
                <ChequesView currentUser={state.currentUser} />
              )}
              
              {/* ❌ GESTIÓN SOLO PARA ADMIN */}
              {state.activeView === 'vendedores' && esAdmin && (
                <VendedoresView currentUser={state.currentUser} />
              )}
              
              {state.activeView === 'comisiones' && esAdmin && (
                <ComisionesView currentUser={state.currentUser} />
              )}
              
              {state.activeView === 'liquidaciones' && esAdmin && (
                <LiquidacionesView currentUser={state.currentUser} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
      active 
        ? 'bg-primary/10 text-primary-dark font-semibold' 
        : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

export default App;