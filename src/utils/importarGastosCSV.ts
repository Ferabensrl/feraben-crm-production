import { crearGasto } from '../lib/supabase';

// Script para importar datos del CSV a la base de datos
// Este script debe ejecutarse manualmente cuando sea necesario

export const importarGastosDesdeCSV = async (csvData: string, usuarioId: number) => {
  const lineas = csvData.split('\n');
  const header = lineas[0].split(';');
  
  // Encontrar las columnas relevantes
  const columnaCategoria = 0; // "Tipo de Gasto"
  const columnaTotalMensual = header.findIndex(col => col.includes('Total Mensual'));
  const columnaTipo = header.findIndex(col => col.includes('Tipo (Empresa / Personal)'));
  
  const gastosImportados = [];
  const errores = [];
  
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    
    const columnas = linea.split(';');
    if (columnas.length < 3) continue;
    
    try {
      const categoria = columnas[columnaCategoria]?.trim();
      const totalMensualStr = columnas[columnaTotalMensual]?.trim();
      const tipoStr = columnas[columnaTipo]?.trim();
      
      if (!categoria || !totalMensualStr || !tipoStr) continue;
      
      // Limpiar el monto (remover $, espacios, comas)
      const montoLimpio = totalMensualStr
        .replace(/\$/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.')
        .trim();
      
      const monto = parseFloat(montoLimpio);
      
      if (isNaN(monto) || monto <= 0) continue;
      
      const tipo = tipoStr as 'Empresa' | 'Personal';
      if (tipo !== 'Empresa' && tipo !== 'Personal') continue;
      
      // Crear el gasto para el mes actual
      const fechaActual = new Date();
      const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
      
      const nuevoGasto = {
        fecha: primerDiaMes.toISOString().split('T')[0],
        categoria,
        descripcion: `Importado desde CSV - Total mensual`,
        monto,
        tipo,
        usuario_id: usuarioId
      };
      
      const resultado = await crearGasto(nuevoGasto);
      
      if (resultado) {
        gastosImportados.push(resultado);
        console.log(`✅ Importado: ${categoria} - ${tipo} - $${monto}`);
      } else {
        errores.push(`Error creando gasto: ${categoria}`);
      }
      
    } catch (error) {
      errores.push(`Error procesando línea ${i + 1}: ${error}`);
    }
  }
  
  return {
    importados: gastosImportados.length,
    errores: errores.length,
    detalleErrores: errores
  };
};

// Función helper para usar en desarrollo/testing
export const ejecutarImportacionCSV = async (usuarioId: number) => {
  // Este es el contenido del CSV analizado
  const csvContent = `Tipo de Gasto;2025-05-01;2025-05-02;2025-05-03;2025-05-04;2025-05-05;2025-05-06;2025-05-07;2025-05-08;2025-05-09;2025-05-10;2025-05-11;2025-05-12;2025-05-13;2025-05-14;2025-05-15;2025-05-16;2025-05-17;2025-05-18;2025-05-19;2025-05-20;2025-05-21;2025-05-22;2025-05-23;2025-05-24;2025-05-25;2025-05-26;2025-05-27;2025-05-28;2025-05-29;2025-05-30;2025-05-31;Total Mensual;Tipo (Empresa / Personal)
  UTE;;;;;;;;;;;3796;;;;;;;;;;;;;;;;;;;;;$3.796;Personal
  ANTEL;;;;2056;;;;;;;;;;;;;;;;;;;;;;;;;;;;$2.056;Personal
  OSE;;;;676;;;;;;;;;;;;;;;;;;;;;;;;;;;;$676;Personal
  Combustible Celerio;;;;;;;2464;;;;;;;;;;;;;;2265;;;;;;;;;;;$4.729;Personal
  Seguro Celerio;;;;;;;;;;;;;;;3827;;;;;;;;;;;;;;;;;$3.827;Personal
  Cuota Celerio;;;;;15648;;;;;;;;;;;;;;;;;;;;;;;;;;;$15.648;Personal
  Combustible Kangoo;;;;;;;;;;;;1000;3402;;;;;;;;;;;;;;;;;;;$4.402;Empresa
  Supermercado;;;;;;234;2431;1033;;1159;;1752;;3935;;1008;;2802;733;;321;184;6117;;2210;;;2880;2568;2710;;$32.077;Personal
  Salir a comer;;;;;;;;;;1130;2145;;;;;179;;2220;;;;;;;;;;;;;;$5.674;Personal
  Celulares;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;$0;Personal
  DIRECTV + NETFLIX;;;;473;;;;;;;;1500;;;;;;;;;;;;;;;;1500;;;;$3.473;Personal
  Tarjeta OCA;;;;;;;;;;;;;;;11886;;;;;;;;;;;;;;;;;$11.886;Personal
  Varios Personal;;;;;;1287;264;;672;;;16500;1270;500;;;;;;;;;;1377;;429;;;889;;;$23.188;Personal
  Varios Empresa;;;;;;1768;354;;;;;;1690;;;2052;;;;;1345;;;;;;;;;;;$7.209;Empresa
  BPS EMPRESA;;;;;;;;;;;11864;;;;;;;;;;;;;;;;;;;;;$11.864;Empresa
  Sueldos;;;;;;;;;;16003;18633;;;;;;;;;;;;;;;;;;;;;$34.636;Empresa
  BPS PERSONAL;;;;;;;;;;;3453;;;;;;;;;;;;;;;;;;;;;$3.453;Personal
  BSE Empresa;;;;;;;;;;;321;;;;;;;;;;;;321;;;;;;;;;$642;Empresa
  Colegio Benjamin;;;;;;;;;;;18990;;;;;;;;;;;;;;;;;;;;;$18.990;Personal`;
  
  return await importarGastosDesdeCSV(csvContent, usuarioId);
};

// Para usar en consola del navegador:
// import { ejecutarImportacionCSV } from './utils/importarGastosCSV';
// ejecutarImportacionCSV(1); // Usar el ID del usuario admin