// src/components/Buscador.tsx - VERSIÓN CORREGIDA
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, ScanLine, Clock, Zap, Tag } from 'lucide-react';

/**
 * 🔍 COMPONENTE BUSCADOR INTELIGENTE FERABEN CRM
 *
 * Características:
 * - Búsqueda en tiempo real con indicadores visuales
 * - Soporte para códigos de barras (futuro)
 * - Historial de búsquedas frecuentes
 * - Filtros rápidos personalizables
 * - Responsive y accesible
 * - Indicadores de performance
 */

interface FiltroRapido {
  id: string;
  label: string;
  icono?: React.ReactNode;
  filtro: (datos: any[]) => any[];
  activo?: boolean;
}

interface BuscadorProps {
  // Configuración básica
  placeholder: string;
  onBuscar: (termino: string) => void;
  resultadosCount: number;

  // Personalización visual
  icono?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';

  // Funcionalidades avanzadas
  filtrosRapidos?: FiltroRapido[];
  onFiltroRapido?: (filtroId: string) => void;
  mostrarContador?: boolean;
  mostrarLimpiar?: boolean;

  // Códigos de barras (futuro)
  soportaCodigoBarras?: boolean;
  onEscanearCodigo?: (codigo: string) => void;

  // Historial de búsquedas
  historialBusquedas?: string[];
  onSeleccionarHistorial?: (termino: string) => void;

  // Estados
  loading?: boolean;
  error?: string;

  // Configuración avanzada
  debounceMs?: number;
  minCaracteres?: number;
}

export const Buscador: React.FC<BuscadorProps> = ({
  placeholder,
  onBuscar,
  resultadosCount,
  icono = <Search size={20} />,
  className = '',
  size = 'md',
  filtrosRapidos = [],
  onFiltroRapido,
  mostrarContador = true,
  mostrarLimpiar = true,
  soportaCodigoBarras = false,
  onEscanearCodigo,
  historialBusquedas = [],
  onSeleccionarHistorial,
  loading = false,
  error,
  debounceMs = 300,
  minCaracteres = 0,
}) => {
  // Estados del componente
  const [termino, setTermino] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [tiempoUltimaBusqueda, setTiempoUltimaBusqueda] = useState<
    number | null
  >(null);

  // Referencias
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tiempoInicioRef = useRef<number>();

  // Configuración de tamaños
  const sizeClasses = {
    sm: 'py-2 text-sm',
    md: 'py-3 text-sm',
    lg: 'py-4 text-base',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  // 🔍 MANEJO DE CAMBIOS EN EL INPUT
  const handleChange = (valor: string) => {
    setTermino(valor);

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Solo buscar si cumple requisitos mínimos
    if (valor.length < minCaracteres && valor.length > 0) {
      return;
    }

    // Marcar inicio de búsqueda
    tiempoInicioRef.current = performance.now();

    // Debounce de búsqueda
    timeoutRef.current = setTimeout(() => {
      onBuscar(valor);

      // Calcular tiempo de búsqueda
      if (tiempoInicioRef.current) {
        const tiempoTranscurrido = performance.now() - tiempoInicioRef.current;
        setTiempoUltimaBusqueda(tiempoTranscurrido);
      }
    }, debounceMs);
  };

  // 🧹 LIMPIAR BÚSQUEDA
  const limpiarBusqueda = () => {
    setTermino('');
    onBuscar('');
    setTiempoUltimaBusqueda(null);
    inputRef.current?.focus();
  };

  // 🎯 SELECCIONAR DEL HISTORIAL
  const seleccionarHistorial = (terminoHistorial: string) => {
    setTermino(terminoHistorial);
    onBuscar(terminoHistorial);
    setMostrarHistorial(false);
    onSeleccionarHistorial?.(terminoHistorial);
  };

  // 📱 ESCANEAR CÓDIGO DE BARRAS (FUTURO)
  const iniciarEscaneo = () => {
    // Aquí se integrará con la API de cámara para códigos de barras
    console.log('🔍 Iniciando escaneo de código de barras...');

    // Simulación temporal para demo
    if (onEscanearCodigo) {
      // En el futuro, esto vendrá del scanner real
      const codigoSimulado = '7891234567890';
      onEscanearCodigo(codigoSimulado);
      setTermino(codigoSimulado);
    }
  };

  // 🏷️ MANEJO DE FILTROS RÁPIDOS
  const manejarFiltroRapido = (filtroId: string) => {
    onFiltroRapido?.(filtroId);
  };

  // ⌨️ MANEJO DE TECLAS
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      limpiarBusqueda();
    }

    if (e.key === 'Enter' && termino.trim()) {
      // Búsqueda inmediata al presionar Enter
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      onBuscar(termino);
    }
  };

  // 🧹 CLEANUP
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 🎨 CLASES CSS DINÁMICAS
  const inputClasses = `
    pl-12 pr-12 border border-gray-300 rounded-lg w-full
    focus:ring-2 focus:ring-primary focus:border-primary
    transition-all duration-200 placeholder-gray-400
    ${sizeClasses[size]}
    ${error ? 'border-red-500 focus:ring-red-500' : ''}
    ${loading ? 'bg-gray-50' : 'bg-white'}
    ${className}
  `.trim();

  return (
    <div className="space-y-4">
      {/* Input principal de búsqueda */}
      <div className="relative">
        {/* Icono de búsqueda */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {loading ? (
            <div className="animate-spin rounded-full border-2 border-gray-300 border-t-primary w-5 h-5" />
          ) : (
            React.cloneElement(icono as React.ReactElement, {
              size: iconSizes[size],
            })
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={termino}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClasses}
          disabled={loading}
        />

        {/* Botones de acción */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
          {/* Botón de código de barras */}
          {soportaCodigoBarras && (
            <button
              onClick={iniciarEscaneo}
              className="text-gray-400 hover:text-primary transition-colors p-1"
              title="Escanear código de barras"
            >
              <ScanLine size={iconSizes[size] - 2} />
            </button>
          )}

          {/* Botón de historial */}
          {historialBusquedas.length > 0 && (
            <button
              onClick={() => setMostrarHistorial(!mostrarHistorial)}
              className="text-gray-400 hover:text-primary transition-colors p-1"
              title="Historial de búsquedas"
            >
              <Clock size={iconSizes[size] - 2} />
            </button>
          )}

          {/* Botón de filtros */}
          {filtrosRapidos.length > 0 && (
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`transition-colors p-1 ${
                mostrarFiltros
                  ? 'text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
              title="Filtros rápidos"
            >
              <Filter size={iconSizes[size] - 2} />
            </button>
          )}

          {/* Botón limpiar */}
          {termino && mostrarLimpiar && (
            <button
              onClick={limpiarBusqueda}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Limpiar búsqueda"
            >
              <X size={iconSizes[size] - 2} />
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="text-red-600 text-xs flex items-center">
          <X size={12} className="mr-1" />
          {error}
        </div>
      )}

      {/* Información de resultados y performance */}
      {termino && mostrarContador && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'
                }`}
              />
              <span>
                {loading
                  ? 'Buscando...'
                  : `${resultadosCount} resultado${resultadosCount !== 1 ? 's' : ''} encontrado${resultadosCount !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Indicador de performance */}
            {tiempoUltimaBusqueda !== null && !loading && (
              <div className="flex items-center text-gray-400">
                <Zap size={12} className="mr-1" />
                <span>{tiempoUltimaBusqueda.toFixed(0)}ms</span>
              </div>
            )}
          </div>

          {/* Indicador de búsqueda activa */}
          {termino && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
              Buscando: "{termino}"
            </span>
          )}
        </div>
      )}

      {/* Historial de búsquedas */}
      {mostrarHistorial && historialBusquedas.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Búsquedas recientes
            </span>
            <button
              onClick={() => setMostrarHistorial(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {historialBusquedas.slice(0, 5).map((busqueda, index) => (
              <button
                key={index}
                onClick={() => seleccionarHistorial(busqueda)}
                className="w-full text-left px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <Clock size={12} className="inline mr-2" />
                {busqueda}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros rápidos */}
      {mostrarFiltros && filtrosRapidos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 flex items-center">
              <Filter size={14} className="mr-2" />
              Filtros rápidos
            </span>
            <button
              onClick={() => setMostrarFiltros(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filtrosRapidos.map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => manejarFiltroRapido(filtro.id)}
                className={`
                  inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-200 border
                  ${
                    filtro.activo
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                {filtro.icono && (
                  <span className="mr-1.5">
                    {React.cloneElement(filtro.icono as React.ReactElement, {
                      size: 12,
                    })}
                  </span>
                )}
                {filtro.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 🎯 COMPONENTE ESPECIALIZADO PARA BÚSQUEDA DE CLIENTES
export const BuscadorClientes: React.FC<
  Omit<BuscadorProps, 'placeholder' | 'icono'>
> = (props) => (
  <Buscador
    {...props}
    placeholder="Buscar por razón social, RUT, ciudad, vendedor..."
    icono={<Search size={20} />}
    filtrosRapidos={[
      {
        id: 'con-deuda',
        label: 'Con deuda',
        icono: <Tag />,
        filtro: (clientes) => clientes.filter((c: any) => c.saldo > 0),
      },
      {
        id: 'activos',
        label: 'Activos',
        icono: <Zap />,
        filtro: (clientes) => clientes.filter((c: any) => c.activo),
      },
      {
        id: 'montevideo',
        label: 'Montevideo',
        icono: <Tag />,
        filtro: (clientes) =>
          clientes.filter((c: any) =>
            c.ciudad.toLowerCase().includes('montevideo')
          ),
      },
    ]}
  />
);

// 📋 COMPONENTE ESPECIALIZADO PARA BÚSQUEDA DE MOVIMIENTOS
export const BuscadorMovimientos: React.FC<
  Omit<BuscadorProps, 'placeholder' | 'icono'>
> = (props) => (
  <Buscador
    {...props}
    placeholder="Buscar por documento, cliente, tipo, vendedor..."
    icono={<Search size={20} />}
    filtrosRapidos={[
      {
        id: 'ventas',
        label: 'Solo ventas',
        icono: <Tag />,
        filtro: (movs) =>
          movs.filter((m: any) => m.tipo_movimiento === 'Venta'),
      },
      {
        id: 'pagos',
        label: 'Solo pagos',
        icono: <Tag />,
        filtro: (movs) => movs.filter((m: any) => m.tipo_movimiento === 'Pago'),
      },
      {
        id: 'mes-actual',
        label: 'Este mes',
        icono: <Clock />,
        filtro: (movs) => {
          const hoy = new Date();
          const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          return movs.filter((m: any) => new Date(m.fecha) >= inicioMes);
        },
      },
    ]}
  />
);

export default Buscador;
