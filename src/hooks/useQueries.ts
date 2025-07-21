import { useQuery } from '@tanstack/react-query'
import { getClientes, getMovimientosCompleto, Cliente, Movimiento, supabase } from '../lib/supabase'
import { CurrentUser } from '../store/session'
import { LiquidacionComision, PeriodoComision } from '../types/comisiones'

export interface Cheque {
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
  clientes?: { razon_social: string }
}

const fetchCheques = async (user: CurrentUser): Promise<Cheque[]> => {
  let query = supabase
    .from('cheques')
    .select(`*, clientes (razon_social)`) // join clientes
    .order('fecha_vencimiento', { ascending: false })

  if (user.rol.toLowerCase() !== 'admin') {
    query = query.eq('vendedor_id', user.id)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const useClientesQuery = () =>
  useQuery<Cliente[]>(['clientes'], getClientes)

export const useMovimientosQuery = () =>
  useQuery<Movimiento[]>(['movimientos'], getMovimientosCompleto)

export const useChequesQuery = (user: CurrentUser | null) =>
  useQuery<Cheque[]>(['cheques', user?.id], () => fetchCheques(user as CurrentUser), { enabled: !!user })

const fetchLiquidaciones = async (): Promise<LiquidacionComision[]> => {
  const { data, error } = await supabase
    .from('liquidaciones_comision')
    .select(`*, usuarios:vendedor_id(nombre), generado_por_usuario:generado_por(nombre)`) // relaciones
    .order('fecha_liquidacion', { ascending: false })
  if (error) throw error
  return (data as any) || []
}

const fetchPeriodosCalculados = async (): Promise<PeriodoComision[]> => {
  const { data, error } = await supabase
    .from('periodos_comision')
    .select(`*, usuarios:vendedor_id(nombre)`) // join
    .eq('estado', 'calculado')
    .order('periodo_inicio')
  if (error) throw error
  return (data as any) || []
}

export const useLiquidacionesQuery = () =>
  useQuery<LiquidacionComision[]>(['liquidaciones'], fetchLiquidaciones)

export const usePeriodosCalculadosQuery = () =>
  useQuery<PeriodoComision[]>(['periodosCalculados'], fetchPeriodosCalculados)
