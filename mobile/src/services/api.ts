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
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "エラーが発生しました" }));
    throw new Error(error.detail || "エラーが発生しました");
  }

  return response.json();
}

export const api = {
  auth: {
    signUp: (email: string, password: string, name: string) =>
      request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) }),
    signIn: (email: string, password: string) =>
      request("/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) }),
    signOut: () => request("/auth/signout", { method: "POST" }),
  },

  chat: {
    sendMessage: (content: string, characterId: string) =>
      request("/chat/message", {
        method: "POST",
        body: JSON.stringify({ content, character_id: characterId }),
      }),
  },

  characters: {
    list: () => request("/characters/"),
    generatePreview: (gender: string, ageGroup: string) =>
      request("/characters/generate-preview", {
        method: "POST",
        body: JSON.stringify({ gender, age_group: ageGroup }),
      }),
    confirm: (character: any) =>
      request(`/characters/confirm/${character.gender}/${character.age}`, {
        method: "POST",
        body: JSON.stringify(character),
      }),
    generate: (gender: string, ageGroup: string) =>
      request("/characters/generate", {
        method: "POST",
        body: JSON.stringify({ gender, age_group: ageGroup }),
      }),
    delete: (characterId: string) =>
      request(`/characters/${characterId}`, { method: "DELETE" }),
  },

  notifications: {
    registerToken: (token: string, enabled: boolean = true) =>
      request("/notifications/register-token", {
        method: "POST",
        body: JSON.stringify({ token, enabled }),
      }),
  },
};
