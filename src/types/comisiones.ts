// src/types/comisiones.ts
export const formatearMonedaComision = (monto: number | null | undefined): string => {
    if (monto === null || monto === undefined) return '$ 0,00'
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(monto)
}

export const formatearPorcentaje = (valor: number | null | undefined): string => {
    if (valor === null || valor === undefined) return '0 %'
    return `${valor.toFixed(2).replace('.',',')} %`
}

export const formatearPeriodo = (inicio: string, fin: string): string => {
    const formatear = (fechaStr: string) => {
        if (!fechaStr) return '';
        const fecha = new Date(fechaStr + 'T00:00:00');
        if (isNaN(fecha.getTime())) return '';
        return fecha.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    return `${formatear(inicio)} al ${formatear(fin)}`;
};

export interface PeriodoComision {
    id: number;
    vendedor_id: number;
    periodo_inicio: string;
    periodo_fin: string;
    estado: 'pendiente' | 'calculado' | 'liquidado';
    total_base: number;
    total_comision: number;
    // 🆕 NUEVOS CAMPOS PARA ADELANTOS Y DESCUENTOS
    total_adelantos: number;
    total_pagos_mano: number;
    otros_descuentos?: number;
    concepto_descuentos?: string;
    saldo_liquido: number;
    created_by: number;
    created_at: string;
    calculado_en?: string;
    liquidado_en?: string;
    observaciones?: string;
    usuarios?: {
        nombre: string;
        comision_porcentaje: number;
        comision_base: 'pagos' | 'ventas' | 'ambos';
    };
}

export interface DetalleCalculoComision {
    movimiento_id: number;
    cliente_id: number;
    cliente_nombre?: string;
    fecha_movimiento: string;
    tipo_movimiento: string;
    documento: string;
    monto_movimiento: number;
    aplica_comision: boolean;
    monto_comisionable: number;
    porcentaje: number;
    comision_calculada: number;
    clientes?: { razon_social: string };
}

export interface CalculoComision {
    vendedor_id: number;
    vendedor_nombre: string;
    periodo_inicio: string;
    periodo_fin: string;
    comision_porcentaje: number;
    comision_base: 'pagos' | 'ventas' | 'ambos';
    total_ventas: number;
    total_pagos: number;
    base_calculo: number;
    comision_bruta: number;
    // 🆕 ADELANTOS Y DESCUENTOS EN EL CÁLCULO
    total_adelantos: number;
    total_pagos_mano: number;
    otros_descuentos?: number;
    saldo_liquido: number;
    detalles: DetalleCalculoComision[];
}

export interface LiquidacionComision {
    id: number;
    periodo_id: number;
    vendedor_id: number;
    numero_recibo: string;
    fecha_liquidacion: string;
    periodo_inicio: string;
    periodo_fin: string;
    total_ventas: number;
    total_pagos: number;
    base_calculo: number;
    porcentaje_aplicado: number;
    comision_bruta: number;
    // 🆕 DESCUENTOS EN LA LIQUIDACIÓN
    total_adelantos: number;
    total_pagos_mano: number;
    otros_descuentos?: number;
    concepto_descuentos?: string;
    saldo_liquido: number;
    generado_por: number;
    created_at: string;
    usuarios?: { nombre: string };
    generado_por_usuario?: { nombre: string };
}