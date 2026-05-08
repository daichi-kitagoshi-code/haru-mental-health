import { API_BASE_URL } from "../constants/api";
import * as SecureStore from "expo-secure-store";

// ── Custom error class ─────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind: "rate_limit" | "timeout" | "server" | "auth" | "network" | "unknown",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("access_token");
}

function classifyStatus(status: number, detail: string): ApiError["kind"] {
  if (status === 401 || status === 403) return "auth";
  if (status === 429 || status === 503) return "rate_limit";
  if (status === 504) return "timeout";
  if (status >= 500) return "server";
  return "unknown";
}

async function request(
  path: string,
  options: RequestInit = {},
  timeoutMs = 120_000,   // 2 min — allows backend to do up to 3 retries (each 30s)
) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
    console.warn(`[api] fetch aborted (timeout ${timeoutMs}ms): ${path}`);
  }, timeoutMs);

  try {
    console.log(`[api] → ${options.method ?? "GET"} ${path}`);
    const t0 = Date.now();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    console.log(`[api] ← ${response.status} ${path} (${Date.now() - t0}ms)`);

    if (!response.ok) {
      const body = await response.json().catch(() => ({ detail: "エラーが発生しました" }));
      const detail: string = body.detail ?? "エラーが発生しました";
      const kind = classifyStatus(response.status, detail);

      console.error(
        `[api] error: status=${response.status} kind=${kind} path=${path} detail=${detail}`,
      );
      throw new ApiError(detail, response.status, kind);
    }

    return response.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;

    // AbortController fired → treat as timeout
    if ((err as any)?.name === "AbortError") {
      console.error(`[api] request timed out after ${timeoutMs}ms: ${path}`);
      throw new ApiError("リクエストがタイムアウトしました", 0, "timeout");
    }

    // Network error (no connectivity, DNS failure, etc.)
    console.error(`[api] network error: ${path}`, err);
    throw new ApiError("ネットワークエラーが発生しました", 0, "network");
  } finally {
    clearTimeout(timer);
  }
}

// ── API surface ────────────────────────────────────────────────────────────
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
      request(
        "/chat/message",
        { method: "POST", body: JSON.stringify({ content, character_id: characterId }) },
        120_000,   // 2 min timeout for chat (backend retries take time)
      ),
  },

  characters: {
    list: () => request("/characters/"),
    generatePreview: (gender: string, ageGroup: string) =>
      request("/characters/generate-preview", {
        method: "POST",
        body: JSON.stringify({ gender, age_group: ageGroup }),
      }),
    confirm: (character: any) =>
      request("/characters/confirm", {
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

  posts: {
    getFeed: () => request("/posts/feed"),
    getCharacterPosts: (characterId: string) => request(`/posts/character/${characterId}`),
    generatePost: (characterId: string) =>
      request(`/posts/generate/${characterId}`, { method: "POST" }),
  },

  notifications: {
    registerToken: (token: string, enabled: boolean = true) =>
      request("/notifications/register-token", {
        method: "POST",
        body: JSON.stringify({ token, enabled }),
      }),
  },
};
