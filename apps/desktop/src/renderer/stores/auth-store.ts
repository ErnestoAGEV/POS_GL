import { create } from "zustand";

interface User {
  id: number;
  nombre: string;
  username: string;
  rol: string;
  sucursalId: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isOffline: boolean;
  serverUrl: string;
  loginError: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setServerUrl: (url: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoggedIn: false,
  isOffline: false,
  serverUrl: "http://localhost:3000",
  loginError: null,
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true, loginError: null });

    const result = await window.api.auth.login({
      username,
      password,
      serverUrl: get().serverUrl,
    });

    if (result.success) {
      set({
        user: result.user,
        token: result.token || null,
        isLoggedIn: true,
        isOffline: result.offline ?? false,
        isLoading: false,
        loginError: null,
      });
      return true;
    }

    set({
      isLoading: false,
      loginError: result.error || "Error de autenticacion",
    });
    return false;
  },

  logout: async () => {
    await window.api.auth.logout();
    set({
      user: null,
      token: null,
      isLoggedIn: false,
      isOffline: false,
      loginError: null,
    });
  },

  setServerUrl: (url: string) => set({ serverUrl: url }),
}));
