import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api } from "../services/api";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  isLoading: true,

  checkAuth: async () => {
    const token = await SecureStore.getItemAsync("access_token");
    set({
      isAuthenticated: !!token,
      userId: await SecureStore.getItemAsync("user_id"),
      isLoading: false,
    });
  },

  signUp: async (email, password, name) => {
    const result = await api.auth.signUp(email, password, name);
    await SecureStore.setItemAsync("access_token", result.access_token);
    await SecureStore.setItemAsync("user_id", result.user_id);
    set({ isAuthenticated: true, userId: result.user_id });
  },

  signIn: async (email, password) => {
    const result = await api.auth.signIn(email, password);
    await SecureStore.setItemAsync("access_token", result.access_token);
    await SecureStore.setItemAsync("user_id", result.user_id);
    set({ isAuthenticated: true, userId: result.user_id });
  },

  signOut: async () => {
    await api.auth.signOut();
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("user_id");
    set({ isAuthenticated: false, userId: null });
  },
}));
