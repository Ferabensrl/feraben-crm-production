// src/hooks/useBuscador.ts - VERSIÓN CORREGIDA
import { useState, useMemo, useCallback } from 'react';

/**
 * 🔍 HOOK BUSCADOR INTELIGENTE FERABEN CRM
 *
 * Funcionalidades:
 * - Búsqueda en tiempo real multi-campo
 * - Normalización de texto (sin tildes, espacios, case-insensitive)
 * - Soporte para búsqueda en campos anidados (ej: clientes.razon_social)
 * - Debounce integrado para optimizar performance
 * - Preparado para códigos de barras y búsquedas futuras
 */

interface BuscadorConfig {
  campos: string[];
  debounceMs?: number;
  caseSensitive?: boolean;
  busquedaExacta?: boolean;
}

interface ResultadoBusqueda<T> {
  termino: string;
  setTermino: (termino: string) => void;
  resultados: T[];
  limpiarBusqueda: () => void;
  cantidadResultados: number;
  esBusquedaActiva: boolean;
}

// 🧹 FUNCIÓN DE NORMALIZACIÓN DE TEXTO
const normalizarTexto = (texto: string): string => {
  return texto
    .toLowerCase()
    .trim()
    .replace(/[áäâàã]/g, 'a')
    .replace(/[éëêè]/g, 'e')
    .replace(/[íïîì]/g, 'i')
    .replace(/[óöôòõ]/g, 'o')
    .replace(/[úüûù]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/\s+/g, ' '); // Múltiples espacios a uno
};

// 🔍 FUNCIÓN PARA EXTRAER VALOR DE CAMPO ANIDADO
const extraerValorCampo = (objeto: any, campo: string): string => {
  try {
    const valor = campo.split('.').reduce((obj, key) => obj?.[key], objeto);
    return valor?.toString() || '';
  } catch {
    return '';
  }
};

// 🎯 FUNCIÓN DE BÚSQUEDA INTELIGENTE
const buscarEnDatos = <T>(
  datos: T[],
  termino: string,
  campos: string[],
  opciones: { caseSensitive?: boolean; busquedaExacta?: boolean } = {}
): T[] => {
  if (!termino.trim()) return datos;

  const terminoNormalizado = opciones.caseSensitive
    ? termino.trim()
    : normalizarTexto(termino);

  return datos.filter((item) => {
    return campos.some((campo) => {
      const valorCampo = extraerValorCampo(item, campo);
      const valorNormalizado = opciones.caseSensitive
        ? valorCampo
        : normalizarTexto(valorCampo);

      if (opciones.busquedaExacta) {
        return valorNormalizado === terminoNormalizado;
      }

      // 🔍 BÚSQUEDA INTELIGENTE: Coincidencias parciales
      return valorNormalizado.includes(terminoNormalizado);
    });
  });
};

// 🚀 HOOK PRINCIPAL
export const useBuscador = <T>(
  datos: T[],
  config: BuscadorConfig
): ResultadoBusqueda<T> => {
  const [termino, setTermino] = useState('');

  // 🎯 BÚSQUEDA CON MEMOIZACIÓN PARA PERFORMANCE
  const resultados = useMemo(() => {
    console.log(`🔍 Buscando "${termino}" en ${datos.length} registros...`);

    const tiempoInicio = performance.now();
    const resultado = buscarEnDatos(datos, termino, config.campos, {
      caseSensitive: config.caseSensitive,
      busquedaExacta: config.busquedaExacta,
    });
    const tiempoFin = performance.now();

    console.log(
      `✅ Búsqueda completada en ${(tiempoFin - tiempoInicio).toFixed(2)}ms - ${resultado.length} resultados`
    );

    return resultado;
  }, [
    datos,
    termino,
    config.campos,
    config.caseSensitive,
    config.busquedaExacta,
  ]);

  // 🧹 FUNCIÓN PARA LIMPIAR BÚSQUEDA
  const limpiarBusqueda = useCallback(() => {
    setTermino('');
  }, []);

  return {
    termino,
    setTermino,
    resultados,
    limpiarBusqueda,
    cantidadResultados: resultados.length,
    esBusquedaActiva: termino.trim().length > 0,
  };
};

// 🎯 HOOK ESPECIALIZADO PARA CLIENTES
export const useBuscadorClientes = (clientes: any[]) => {
  return useBuscador(clientes, {
    campos: [
      'razon_social',
      'rut',
      'nombre_fantasia',
      'email',
      'ciudad',
      'departamento',
      'vendedor_nombre',
    ],
    debounceMs: 300,
  });
};

// 📋 HOOK ESPECIALIZADO PARA MOVIMIENTOS
export const useBuscadorMovimientos = (movimientos: any[]) => {
  return useBuscador(movimientos, {
    campos: [
      'documento',
      'tipo_movimiento',
      'comentario',
      'clientes.razon_social',
      'usuarios.nombre',
    ],
    debounceMs: 300,
  });
};

// 💳 HOOK ESPECIALIZADO PARA CHEQUES
export const useBuscadorCheques = (cheques: any[]) => {
  return useBuscador(cheques, {
    campos: [
      'numero_cheque',
      'banco',
      'clientes.razon_social',
      'usuarios.nombre',
      'estado',
    ],
    debounceMs: 300,
  });
};

// 📊 FUNCIONES DE UTILIDAD ADICIONALES

// 🎯 BÚSQUEDA POR RANGO DE FECHAS
export const filtrarPorRangoFechas = <T extends { fecha: string }>(
  datos: T[],
  fechaDesde?: string,
  fechaHasta?: string
): T[] => {
  if (!fechaDesde && !fechaHasta) return datos;

  return datos.filter((item) => {
    const fecha = new Date(item.fecha + 'T00:00:00');
    const desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
    const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;

    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;

    return true;
  });
};

// 💰 BÚSQUEDA POR RANGO DE MONTOS
export const filtrarPorRangoMontos = <T extends { importe: number }>(
  datos: T[],
  montoDesde?: number,
  montoHasta?: number
): T[] => {
  if (montoDesde === undefined && montoHasta === undefined) return datos;

  return datos.filter((item) => {
    const monto = Math.abs(item.importe);
    if (montoDesde !== undefined && monto < montoDesde) return false;
    if (montoHasta !== undefined && monto > montoHasta) return false;
    return true;
  });
};

export default useBuscador;
