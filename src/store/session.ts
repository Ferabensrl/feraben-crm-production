import { create } from 'zustand';

export interface CurrentUser {
  id: number;
  auth_id: string;
  nombre: string;
  rol: 'admin' | 'vendedor';
}

interface SessionState {
  user: CurrentUser | null;
  isAuthLoading: boolean;
  setUser: (user: CurrentUser | null) => void;
  setAuthLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>(set => ({
  user: null,
  isAuthLoading: true,
  setUser: user => set({ user }),
  setAuthLoading: loading => set({ isAuthLoading: loading })
}));
