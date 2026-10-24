import { create } from 'zustand';
import { User, Role } from '@/types';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  checkAuth: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
}

const getStoredToken = () => localStorage.getItem('cinego_token');
const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('cinego_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),
  isLoading: false,

  login: (user: User, token: string) => {
    localStorage.setItem('cinego_token', token);
    localStorage.setItem('cinego_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('cinego_token');
    localStorage.removeItem('cinego_user');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    try {
      apiClient.post(ENDPOINTS.AUTH.LOGOUT).catch(() => {});
    } catch {}
  },

  updateUser: (data: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...data };
    localStorage.setItem('cinego_user', JSON.stringify(updated));
    set({ user: updated });
  },

  checkAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }
    try {
      set({ isLoading: true });
      const res = await apiClient.get<{ user: User }>(ENDPOINTS.AUTH.ME);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      get().logout();
    }
  },

  hasRole: (roles: Role[]) => {
    const user = get().user;
    if (!user) return false;
    return roles.includes(user.role);
  },
}));
