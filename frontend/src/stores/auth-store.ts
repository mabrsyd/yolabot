import { create } from 'zustand';
import { api, ApiUser } from '../lib/api';

interface AuthState {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: ApiUser | null) => void;
  checkAuth: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('yolabot_user') || 'null') as ApiUser | null,
  isAuthenticated: Boolean(localStorage.getItem('yolabot_user')),
  isLoading: false,

  setUser: (user: ApiUser | null) => {
    if (user) {
      localStorage.setItem('yolabot_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } else {
      localStorage.removeItem('yolabot_user');
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: () => {
    const stored = localStorage.getItem('yolabot_user');
    if (stored) {
      try {
        const user = JSON.parse(stored) as ApiUser;
        set({ user, isAuthenticated: true });
      } catch {
        localStorage.removeItem('yolabot_user');
        set({ user: null, isAuthenticated: false });
      }
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network error on logout
    } finally {
      localStorage.removeItem('yolabot_user');
      set({ user: null, isAuthenticated: false });
    }
  },
}));
