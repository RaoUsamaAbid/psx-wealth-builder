import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthToken } from '../lib/api';
import type { AuthResponse, AuthUser } from '../lib/types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (email, password) => {
        const res = await api<AuthResponse>('/auth/login', {
          method: 'POST',
          body: { email, password },
          auth: false,
        });
        setAuthToken(res.token);
        set({ token: res.token, user: res.user });
      },
      register: async (email, password) => {
        const res = await api<AuthResponse>('/auth/register', {
          method: 'POST',
          body: { email, password },
          auth: false,
        });
        setAuthToken(res.token);
        set({ token: res.token, user: res.user });
      },
      logout: () => {
        setAuthToken(null);
        set({ token: null, user: null });
      },
    }),
    {
      name: 'psx-auth',
      onRehydrateStorage: () => (state) => {
        // Re-prime the API client with the persisted token on reload.
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);
