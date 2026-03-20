// frontend/src/store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({ user: data.user, token: data.token, isLoading: false });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          return true;
        } catch (err) {
          set({ error: err.response?.data?.error || 'Login failed', isLoading: false });
          return false;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', { name, email, password });
          set({ user: data.user, token: data.token, isLoading: false });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          return true;
        } catch (err) {
          set({ error: err.response?.data?.error || 'Registration failed', isLoading: false });
          return false;
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, error: null });
      },

      clearError: () => set({ error: null }),

      // Rehydrate axios header on page load
      hydrate: () => {
        const { token } = get();
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      },
    }),
    {
      name: 'sp-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
