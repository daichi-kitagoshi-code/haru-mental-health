import { API_BASE_URL } from "../constants/api";
import * as SecureStore from "expo-secure-store";

async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("access_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "エラーが発生しました" }));
    throw new Error(error.detail || "エラーが発生しました");
  }

  return response.json();
}

export const api = {
  auth: {
    signUp: (email: string, password: string, name: string) =>
      request("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }),
    signIn: (email: string, password: string) =>
      request("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    signOut: () => request("/auth/signout", { method: "POST" }),
  },

  chat: {
    sendMessage: (content: string, mode: string = "chat") =>
      request("/chat/message", {
        method: "POST",
        body: JSON.stringify({ content, mode }),
      }),
    extractMemories: () =>
      request("/chat/extract-memories", { method: "POST" }),
  },

  mood: {
    log: (score: number, note?: string) =>
      request("/mood/log", {
        method: "POST",
        body: JSON.stringify({ score, note }),
      }),
    getHistory: (days: number = 30) =>
      request(`/mood/history?days=${days}`),
    getSummary: () => request("/mood/summary"),
  },

  character: {
    getSettings: () => request("/character/settings"),
    updateSettings: (charName: string, speechStyle: string) =>
      request("/character/settings", {
        method: "PUT",
        body: JSON.stringify({ char_name: charName, speech_style: speechStyle }),
      }),
  },

  notifications: {
    registerToken: (token: string, enabled: boolean = true) =>
      request("/notifications/register-token", {
        method: "POST",
        body: JSON.stringify({ token, enabled }),
      }),
  },
};
