import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  UserCheck,
  Calculator,
  DollarSign,
  CreditCard,
  Loader2,
  Package,
  FilePlus,
  Wallet
} from 'lucide-react';
import { supabase } from './lib/supabase';
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
import InventarioView from './views/InventarioView';
import FacturacionView from './views/FacturacionView';
import GastosView from './components/gastos/GastosView';
import { useSessionStore } from './store/session';
import { useDataStore } from './store/data';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

const NavItem: React.FC<{ icon: React.ReactNode; label: string; to: string; active: boolean; onClick?: () => void }> = ({ icon, label, to, active, onClick }) => (
  <a
    href={to}
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
      active ? 'bg-primary/10 text-primary-dark font-semibold' : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </a>
);

function App() {
  const { user, isAuthLoading, setUser, setAuthLoading } = useSessionStore();
  const { clientes, movimientos, cheques, loadAll, selectedClienteId, setSelectedClienteId, isLoading } = useDataStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthChange = async (session: any) => {
      if (session && session.user) {
        logger.log('🔐 Autenticando usuario:', session.user.id);
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('id, auth_id, nombre, rol')
          .eq('auth_id', session.user.id)
          .single();
        if (userData) {
          setUser(userData);
          setAuthLoading(false);
        } else {
          logger.error('Usuario no encontrado', error);
          await supabase.auth.signOut();
          setAuthLoading(false);
        }
      } else {
        logger.log('🚪 Sin sesión activa');
        setUser(null);
        setAuthLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [setUser, setAuthLoading]);

  useEffect(() => {
    if (user && clientes.length === 0) {
      loadAll(user);
    }
  }, [user, clientes.length, loadAll]);

  const esAdmin = user?.rol.toLowerCase() === 'admin';

  const { clientesVisibles, movimientosVisibles, chequesVisibles } = useMemo(() => {
    if (!user) {
      return { clientesVisibles: [], movimientosVisibles: [], chequesVisibles: [] };
    }
    const esAdminUser = user.rol.toLowerCase() === 'admin';
    if (esAdminUser) {
      return { clientesVisibles: clientes, movimientosVisibles: movimientos, chequesVisibles: cheques };
    }
    return {
      clientesVisibles: clientes.filter(c => c.vendedor_id === user.id),
      movimientosVisibles: movimientos.filter(m => m.vendedor_id === user.id),
      chequesVisibles: cheques.filter(ch => ch.vendedor_id === user.id)
    };
  }, [clientes, movimientos, cheques, user]);

  const estadoCuentaMovimientos = useMemo(() => {
    if (!selectedClienteId) return [];
    return movimientos
      .filter(m => m.cliente_id === selectedClienteId)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [movimientos, selectedClienteId]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
    }
  };

  const handleVerEstadoCuenta = (clienteId: number) => {
    setSelectedClienteId(clienteId);
    navigate(`/clientes/${clienteId}`);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mb-4" size={48} />
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-secondary text-gray-800">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button onClick={toggleMobileMenu} className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-xl font-bold text-primary">CRM Feraben</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
              <div className="text-xs text-gray-500 capitalize">
                {user.rol === 'admin' ? '👑 Administrador' : '👤 Vendedor'}
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-600 hover:bg-gray-100 rounded-md">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen absolute md:relative z-20 md:z-0`}>
          <nav className="p-4 space-y-2">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Principal</h3>
              <NavItem icon={<BarChart3 size={20} />} label={esAdmin ? 'Dashboard' : 'Mi Dashboard'} to="/dashboard" active={isActive('/dashboard')} />
              <NavItem icon={<Users size={20} />} label={esAdmin ? 'Clientes' : 'Mis Clientes'} to="/clientes" active={isActive('/clientes')} />
              <NavItem icon={<FileText size={20} />} label={esAdmin ? 'Movimientos' : 'Mis Movimientos'} to="/movimientos" active={isActive('/movimientos')} />
              {esAdmin && (
                <NavItem icon={<CreditCard size={20} />} label="Cheques" to="/cheques" active={isActive('/cheques')} />
              )}
            </div>
            {esAdmin && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Administración</h3>
                <NavItem icon={<UserCheck size={20} />} label="Vendedores" to="/vendedores" active={isActive('/vendedores')} />
                <NavItem icon={<Calculator size={20} />} label="Comisiones" to="/comisiones" active={isActive('/comisiones')} />
                <NavItem icon={<DollarSign size={20} />} label="Liquidaciones" to="/liquidaciones" active={isActive('/liquidaciones')} />
                <NavItem icon={<Wallet size={20} />} label="Control Gastos" to="/gastos" active={isActive('/gastos')} />
                <NavItem icon={<Package size={20} />} label="Inventario" to="/inventario" active={isActive('/inventario')} />
                <NavItem icon={<FilePlus size={20} />} label="Facturación" to="/facturacion" active={isActive('/facturacion')} />
              </div>
            )}
            {!esAdmin && (
              <div className="mt-8 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-blue-800 font-medium mb-1">👤 Vista de Vendedor</div>
                <div className="text-xs text-blue-600">Estás viendo únicamente tus datos asignados.</div>
              </div>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-6 bg-secondary">
          {isLoading && clientes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="animate-spin text-primary mb-4" size={40} />
                <p className="text-gray-600">Cargando datos...</p>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/dashboard" element={<Dashboard clientes={clientesVisibles} movimientos={movimientosVisibles} cheques={chequesVisibles} currentUser={user} />} />
              <Route path="/clientes" element={<ClientesView clientes={clientesVisibles} movimientos={movimientos} currentUser={user} onVerEstadoCuenta={handleVerEstadoCuenta} onClienteCreado={() => loadAll(user)} />} />
              <Route path="/clientes/:id" element={selectedClienteId ? <EstadoCuentaView clienteId={selectedClienteId} clientes={clientes} movimientos={estadoCuentaMovimientos} onVolver={() => navigate('/clientes')} currentUser={user} onMovimientoChange={() => loadAll(user)} /> : <Navigate to="/clientes" />} />
              <Route path="/movimientos" element={<MovimientosView currentUser={user} movimientos={movimientosVisibles} onMovimientoChange={() => loadAll(user)} />} />
              {esAdmin && <Route path="/cheques" element={<ChequesView currentUser={user} />} />}
              {esAdmin && <Route path="/vendedores" element={<VendedoresView currentUser={user} />} />}
              {esAdmin && <Route path="/comisiones" element={<ComisionesView currentUser={user} />} />}
              {esAdmin && <Route path="/liquidaciones" element={<LiquidacionesView currentUser={user} />} />}
              {esAdmin && <Route path="/gastos" element={<GastosView />} />}
              {esAdmin && <Route path="/inventario" element={<InventarioView currentUser={user} />} />}
              {esAdmin && <Route path="/facturacion" element={<FacturacionView />} />}
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
