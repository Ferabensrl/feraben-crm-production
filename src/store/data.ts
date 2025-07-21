import { create } from 'zustand';
import {
  Cliente,
  Movimiento,
  getClientes,
  getMovimientosCompleto,
  InventarioItem,
  getInventario,
  supabase,
} from '../lib/supabase';
import logger from '../utils/logger';
import { CurrentUser } from './session';

export interface Cheque {
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

const loadCheques = async (user: CurrentUser): Promise<Cheque[]> => {
  try {
    let query = supabase
      .from('cheques')
      .select(
        `
        *,
        clientes (razon_social)
      `
      )
      .order('fecha_vencimiento', { ascending: false });

    if (user.rol.toLowerCase() !== 'admin') {
      query = query.eq('vendedor_id', user.id);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Error cargando cheques:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Error en loadCheques:', err);
    return [];
  }
};

interface DataState {
  clientes: Cliente[];
  movimientos: Movimiento[];
  cheques: Cheque[];
  inventario: InventarioItem[];
  selectedClienteId: number | null;
  isLoading: boolean;
  loadAll: (user: CurrentUser) => Promise<void>;
  setSelectedClienteId: (id: number | null) => void;
}

export const useDataStore = create<DataState>((set) => ({
  clientes: [],
  movimientos: [],
  cheques: [],
  inventario: [],
  selectedClienteId: null,
  isLoading: false,
  setSelectedClienteId: (id) => set({ selectedClienteId: id }),
  loadAll: async (user: CurrentUser) => {
    set({ isLoading: true });
    try {
      const [clientesData, movimientosData, chequesData, inventarioData] =
        await Promise.all([
          getClientes(),
          getMovimientosCompleto(),
          loadCheques(user),
          getInventario(),
        ]);
      set({
        clientes: clientesData,
        movimientos: movimientosData,
        cheques: chequesData,
        inventario: inventarioData,
        isLoading: false,
      });
    } catch (err) {
      logger.error('Error loading data:', err);
      set({ isLoading: false });
    }
  },
}));
