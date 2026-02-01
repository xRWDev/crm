import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'director' | 'manager';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole;
  login: (role: UserRole) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      role: 'manager',
      login: (role) => set({ isAuthenticated: true, role }),
      logout: () => set({ isAuthenticated: false }),
      setRole: (role) => set({ role }),
    }),
    {
      name: 'crm-auth',
    }
  )
);
