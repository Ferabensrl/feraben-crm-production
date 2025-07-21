// src/utils/busqueda.ts - VERSIÓN FINAL LIMPIA
export {}; // Para que TypeScript lo reconozca como módulo

/**
 * 🔍 UTILIDADES AVANZADAS DE BÚSQUEDA FERABEN CRM
 *
 * Funciones especializadas para diferentes tipos de búsqueda:
 * - Normalización de texto avanzada
 * - Búsqueda fuzzy (tolerante a errores)
 * - Validación de códigos de barras
 * - Funciones de scoring para relevancia
 * - Herramientas para futuras funcionalidades
 */

// 🧹 NORMALIZACIÓN AVANZADA DE TEXTO
export const normalizarTextoAvanzado = (texto: string): string => {
  return (
    texto
      .toLowerCase()
      .trim()
      // Acentos y caracteres especiales
      .replace(/[áäâàãå]/g, 'a')
      .replace(/[éëêè]/g, 'e')
      .replace(/[íïîì]/g, 'i')
      .replace(/[óöôòõ]/g, 'o')
      .replace(/[úüûù]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[ý]/g, 'y')
      // Caracteres especiales de empresas
      .replace(/[&]/g, 'y')
      .replace(/[\.]/g, '')
      .replace(/[,]/g, '')
      .replace(/[-_]/g, ' ')
      // Múltiples espacios a uno
      .replace(/\s+/g, ' ')
      // Eliminar espacios al inicio y final
      .trim()
  );
};

// 🎯 BÚSQUEDA FUZZY (TOLERANTE A ERRORES)
export const calcularSimilitud = (texto1: string, texto2: string): number => {
  const t1 = normalizarTextoAvanzado(texto1);
  const t2 = normalizarTextoAvanzado(texto2);

  if (t1 === t2) return 1;
  if (t1.length === 0 || t2.length === 0) return 0;

  // Algoritmo de Levenshtein simplificado
  const distancia = calcularDistanciaLevenshtein(t1, t2);
  const longitudMaxima = Math.max(t1.length, t2.length);

  return (longitudMaxima - distancia) / longitudMaxima;
};

const calcularDistanciaLevenshtein = (a: string, b: string): number => {
  const matriz: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matriz[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matriz[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matriz[i][j] = matriz[i - 1][j - 1];
      } else {
        matriz[i][j] = Math.min(
          matriz[i - 1][j - 1] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j] + 1
        );
      }
    }
  }

  return matriz[b.length][a.length];
};

// 🔍 BÚSQUEDA INTELIGENTE CON SCORING
export interface ResultadoBusquedaConScore<T> {
  item: T;
  score: number;
  coincidencias: string[];
}

// 🔧 FUNCIÓN AUXILIAR PARA EXTRAER VALORES DE CAMPOS ANIDADOS
const extraerValorCampo = (objeto: any, campo: string): string => {
  try {
    const valor = campo.split('.').reduce((obj, key) => obj?.[key], objeto);
    return valor?.toString() || '';
  } catch {
    return '';
  }
};

export const buscarConScore = <T>(
  datos: T[],
  termino: string,
  campos: string[],
  umbralMinimo: number = 0.3
): ResultadoBusquedaConScore<T>[] => {
  const resultados: ResultadoBusquedaConScore<T>[] = [];
  const terminoNormalizado = normalizarTextoAvanzado(termino);

  datos.forEach((item) => {
    let scoreMaximo = 0;
    const coincidencias: string[] = [];

    campos.forEach((campo) => {
      const valor = extraerValorCampo(item, campo);
      const valorNormalizado = normalizarTextoAvanzado(valor);

      // Coincidencia exacta
      if (valorNormalizado === terminoNormalizado) {
        scoreMaximo = Math.max(scoreMaximo, 1.0);
        coincidencias.push(`${campo}:exacta`);
        return;
      }

      // Coincidencia por substring
      if (valorNormalizado.includes(terminoNormalizado)) {
        const scoreSubstring =
          terminoNormalizado.length / valorNormalizado.length;
        scoreMaximo = Math.max(scoreMaximo, scoreSubstring * 0.8);
        coincidencias.push(`${campo}:substring`);
        return;
      }

      // Coincidencia fuzzy
      const scoreFuzzy = calcularSimilitud(
        valorNormalizado,
        terminoNormalizado
      );
      if (scoreFuzzy >= umbralMinimo) {
        scoreMaximo = Math.max(scoreMaximo, scoreFuzzy * 0.6);
        coincidencias.push(`${campo}:fuzzy`);
      }
    });

    if (scoreMaximo >= umbralMinimo) {
      resultados.push({
        item,
        score: scoreMaximo,
        coincidencias,
      });
    }
  });

  // Ordenar por score descendente
  return resultados.sort((a, b) => b.score - a.score);
};

// 📊 VALIDACIÓN Y FORMATEO DE RUT URUGUAYO
export const validarRUT = (rut: string): boolean => {
  const rutLimpio = rut.replace(/[^0-9]/g, '');

  // RUT debe tener 12 dígitos
  if (rutLimpio.length !== 12) return false;

  // Algoritmo de verificación de RUT uruguayo
  const digitos = rutLimpio.split('').map(Number);
  const verificador = digitos.pop()!;

  const pesos = [4, 3, 6, 7, 8, 9, 2, 3, 4, 5, 6];
  let suma = 0;

  for (let i = 0; i < 11; i++) {
    suma += digitos[i] * pesos[i];
  }

  const resto = suma % 11;
  const digitoVerificador = resto < 2 ? resto : 11 - resto;

  return digitoVerificador === verificador;
};

export const formatearRUT = (rut: string): string => {
  const rutLimpio = rut.replace(/[^0-9]/g, '');
  if (rutLimpio.length !== 12) return rut;

  return `${rutLimpio.slice(0, 2)}.${rutLimpio.slice(2, 5)}.${rutLimpio.slice(5, 8)}-${rutLimpio.slice(8)}`;
};

// 🔍 BÚSQUEDA ESPECÍFICA PARA CLIENTES
export const buscarClientes = (clientes: any[], termino: string) => {
  const campos = [
    'razon_social',
    'rut',
    'nombre_fantasia',
    'email',
    'ciudad',
    'departamento',
    'vendedor_nombre',
  ];

  return buscarConScore(clientes, termino, campos, 0.2);
};

// 📋 BÚSQUEDA ESPECÍFICA PARA MOVIMIENTOS
export const buscarMovimientos = (movimientos: any[], termino: string) => {
  const campos = [
    'documento',
    'tipo_movimiento',
    'comentario',
    'clientes.razon_social',
    'usuarios.nombre',
  ];

  return buscarConScore(movimientos, termino, campos, 0.2);
};

// 💳 BÚSQUEDA ESPECÍFICA PARA CHEQUES
export const buscarCheques = (cheques: any[], termino: string) => {
  const campos = [
    'numero_cheque',
    'banco',
    'estado',
    'clientes.razon_social',
    'usuarios.nombre',
  ];

  return buscarConScore(cheques, termino, campos, 0.2);
};

// 📦 VALIDACIÓN DE CÓDIGOS DE BARRAS (FUTURO)
export interface TipoCodigoBarras {
  tipo: 'UPC-A' | 'UPC-E' | 'EAN-13' | 'EAN-8' | 'CODE-128' | 'DESCONOCIDO';
  valido: boolean;
  formato: string;
}

export const validarCodigoBarras = (codigo: string): TipoCodigoBarras => {
  const codigoLimpio = codigo.replace(/[^0-9]/g, '');

  // EAN-13 (más común internacionalmente)
  if (codigoLimpio.length === 13) {
    const valido = validarEAN13(codigoLimpio);
    return {
      tipo: 'EAN-13',
      valido,
      formato: formatearEAN13(codigoLimpio),
    };
  }

  // UPC-A (común en Estados Unidos)
  if (codigoLimpio.length === 12) {
    const valido = validarUPC(codigoLimpio);
    return {
      tipo: 'UPC-A',
      valido,
      formato: formatearUPC(codigoLimpio),
    };
  }

  // EAN-8 (códigos cortos)
  if (codigoLimpio.length === 8) {
    const valido = validarEAN8(codigoLimpio);
    return {
      tipo: 'EAN-8',
      valido,
      formato: formatearEAN8(codigoLimpio),
    };
  }

  return {
    tipo: 'DESCONOCIDO',
    valido: false,
    formato: codigo,
  };
};

const validarEAN13 = (codigo: string): boolean => {
  if (codigo.length !== 13) return false;

  const digitos = codigo.split('').map(Number);
  const checksum = digitos.pop()!;

  let suma = 0;
  for (let i = 0; i < 12; i++) {
    suma += digitos[i] * (i % 2 === 0 ? 1 : 3);
  }

  const calculado = (10 - (suma % 10)) % 10;
  return calculado === checksum;
};

const validarUPC = (codigo: string): boolean => {
  if (codigo.length !== 12) return false;

  const digitos = codigo.split('').map(Number);
  const checksum = digitos.pop()!;

  let suma = 0;
  for (let i = 0; i < 11; i++) {
    suma += digitos[i] * (i % 2 === 0 ? 3 : 1);
  }

  const calculado = (10 - (suma % 10)) % 10;
  return calculado === checksum;
};

const validarEAN8 = (codigo: string): boolean => {
  if (codigo.length !== 8) return false;

  const digitos = codigo.split('').map(Number);
  const checksum = digitos.pop()!;

  let suma = 0;
  for (let i = 0; i < 7; i++) {
    suma += digitos[i] * (i % 2 === 0 ? 3 : 1);
  }

  const calculado = (10 - (suma % 10)) % 10;
  return calculado === checksum;
};

const formatearEAN13 = (codigo: string): string => {
  return `${codigo.slice(0, 1)}-${codigo.slice(1, 7)}-${codigo.slice(7, 12)}-${codigo.slice(12)}`;
};

const formatearUPC = (codigo: string): string => {
  return `${codigo.slice(0, 1)}-${codigo.slice(1, 6)}-${codigo.slice(6, 11)}-${codigo.slice(11)}`;
};

const formatearEAN8 = (codigo: string): string => {
  return `${codigo.slice(0, 4)}-${codigo.slice(4, 7)}-${codigo.slice(7)}`;
};

// 🔍 BÚSQUEDA POR CÓDIGO DE BARRAS EN PRODUCTOS (FUTURO)
export const buscarPorCodigoBarras = (productos: any[], codigo: string) => {
  const { valido, tipo } = validarCodigoBarras(codigo);

  if (!valido) {
    return {
      encontrado: false,
      error: `Código de barras inválido (${tipo})`,
      productos: [],
    };
  }

  const codigoLimpio = codigo.replace(/[^0-9]/g, '');
  const productosEncontrados = productos.filter(
    (p) =>
      p.codigo_barras === codigoLimpio ||
      p.codigo_barras === codigo ||
      normalizarTextoAvanzado(p.codigo_barras || '') ===
        normalizarTextoAvanzado(codigo)
  );

  return {
    encontrado: productosEncontrados.length > 0,
    tipo,
    productos: productosEncontrados,
  };
};

// 📈 ANALYTICS DE BÚSQUEDA
export interface EstadisticasBusqueda {
  terminosBuscados: string[];
  tiempoPromedioBusqueda: number;
  resultadosPromedio: number;
  busquedasSinResultados: number;
  terminosMasFrecuentes: { termino: string; frecuencia: number }[];
}

export class AnalyticsBusqueda {
  private busquedas: Array<{
    termino: string;
    timestamp: number;
    tiempoBusqueda: number;
    cantidadResultados: number;
  }> = [];

  registrarBusqueda(
    termino: string,
    tiempoBusqueda: number,
    cantidadResultados: number
  ) {
    this.busquedas.push({
      termino: termino.trim().toLowerCase(),
      timestamp: Date.now(),
      tiempoBusqueda,
      cantidadResultados,
    });

    // Mantener solo las últimas 1000 búsquedas
    if (this.busquedas.length > 1000) {
      this.busquedas = this.busquedas.slice(-1000);
    }
  }

  obtenerEstadisticas(): EstadisticasBusqueda {
    if (this.busquedas.length === 0) {
      return {
        terminosBuscados: [],
        tiempoPromedioBusqueda: 0,
        resultadosPromedio: 0,
        busquedasSinResultados: 0,
        terminosMasFrecuentes: [],
      };
    }

    const tiempoPromedio =
      this.busquedas.reduce((sum, b) => sum + b.tiempoBusqueda, 0) /
      this.busquedas.length;
    const resultadosPromedio =
      this.busquedas.reduce((sum, b) => sum + b.cantidadResultados, 0) /
      this.busquedas.length;
    const sinResultados = this.busquedas.filter(
      (b) => b.cantidadResultados === 0
    ).length;

    // Calcular frecuencia de términos
    const frecuencias: { [key: string]: number } = {};
    this.busquedas.forEach((b) => {
      if (b.termino.length > 0) {
        frecuencias[b.termino] = (frecuencias[b.termino] || 0) + 1;
      }
    });

    const terminosFrecuentes = Object.entries(frecuencias)
      .map(([termino, frecuencia]) => ({ termino, frecuencia }))
      .sort((a, b) => b.frecuencia - a.frecuencia)
      .slice(0, 10);

    // CORREGIDO: Usar Array.from en lugar de spread operator
    const terminosUnicosSet = new Set(this.busquedas.map((b) => b.termino));
    const terminosUnicos = Array.from(terminosUnicosSet);

    return {
      terminosBuscados: terminosUnicos,
      tiempoPromedioBusqueda: tiempoPromedio,
      resultadosPromedio,
      busquedasSinResultados: sinResultados,
      terminosMasFrecuentes: terminosFrecuentes,
    };
  }

  limpiarHistorial() {
    this.busquedas = [];
  }
}

// 🎯 INSTANCIA GLOBAL DE ANALYTICS (OPCIONAL)
export const analyticsBusqueda = new AnalyticsBusqueda();

// 🔧 FUNCIONES DE UTILIDAD PARA EL FUTURO

// 🏷️ GENERADOR DE SUGERENCIAS DE BÚSQUEDA
export const generarSugerencias = (
  termino: string,
  datos: any[],
  campos: string[]
): string[] => {
  if (termino.length < 2) return [];

  const sugerenciasSet = new Set<string>();
  const terminoNorm = normalizarTextoAvanzado(termino);

  datos.forEach((item) => {
    campos.forEach((campo) => {
      const valor = extraerValorCampo(item, campo);
      const valorNorm = normalizarTextoAvanzado(valor);

      if (valorNorm.includes(terminoNorm) && valor.length > 0) {
        sugerenciasSet.add(valor);
      }
    });
  });

  return Array.from(sugerenciasSet)
    .slice(0, 10)
    .sort((a, b) => a.length - b.length);
};

// 🎨 RESALTADO INTELIGENTE DE TEXTO
export const resaltarCoincidencias = (
  texto: string,
  termino: string
): string => {
  if (!termino.trim()) return texto;

  const regex = new RegExp(
    `(${termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  );
  return texto.replace(
    regex,
    '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
  );
};

// 📱 DETECCIÓN DE DISPOSITIVO PARA OPTIMIZACIÓN
export const esDispositivoMovil = (): boolean => {
  return window.innerWidth < 768;
};

// ⚡ OPTIMIZACIÓN DE PERFORMANCE
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// 🎯 EXPORTACIONES PRINCIPALES
export default {
  normalizarTextoAvanzado,
  calcularSimilitud,
  buscarConScore,
  validarRUT,
  formatearRUT,
  validarCodigoBarras,
  buscarClientes,
  buscarMovimientos,
  buscarCheques,
  buscarPorCodigoBarras,
  AnalyticsBusqueda,
  analyticsBusqueda,
  generarSugerencias,
  resaltarCoincidencias,
  esDispositivoMovil,
  debounce,
  throttle,
};
