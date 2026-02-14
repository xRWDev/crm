import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'director' | 'manager';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole;
  userId?: string;
  userName?: string;
  login: (role: UserRole, payload?: { userId?: string; userName?: string }) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      role: 'manager',
      login: (role, payload) =>
        set({
          isAuthenticated: true,
          role,
          userId: payload?.userId,
          userName: payload?.userName,
        }),
      logout: () => set({ isAuthenticated: false, userId: undefined, userName: undefined }),
      setRole: (role) => set({ role }),
    }),
    {
      name: 'crm-auth',
    }
  )
);
