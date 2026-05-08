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

function classifyStatus(status: number, _detail: string): ApiError["kind"] {
  if (status === 401 || status === 403) return "auth";
  if (status === 429 || status === 503) return "rate_limit";
  if (status === 504) return "timeout";
  if (status >= 500) return "server";
  return "unknown";
}

// ── Token refresh ──────────────────────────────────────────────────────────
// Deduplicate concurrent refresh calls — only one in-flight at a time.
let _refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      if (!refreshToken) return false;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        return false;
      }
      const data = await res.json();
      await SecureStore.setItemAsync("access_token", data.access_token);
      await SecureStore.setItemAsync("refresh_token", data.refresh_token);
      console.log("[api] token refreshed successfully");
      return true;
    } catch (e) {
      console.warn("[api] token refresh failed:", e);
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

// ── Core request ───────────────────────────────────────────────────────────
async function request(
  path: string,
  options: RequestInit = {},
  timeoutMs = 120_000,   // 2 min — allows backend to do up to 8 retries
  _isRetry = false,      // prevent infinite refresh loop
): Promise<any> {
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
      // ── Auto-refresh on 401 (token expired) ──────────────────────────
      if (response.status === 401 && !_isRetry && !path.startsWith("/auth/")) {
        console.log("[api] 401 received, attempting token refresh…");
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry original request with new token — once
          return request(path, options, timeoutMs, true);
        }
        // Refresh failed → fall through and throw auth error
      }

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
    getSettings: () => request("/notifications/settings"),
    updateSettings: (data: {
      birthday?: string | null;
      notify_morning?: boolean;
      notify_evening?: boolean;
      notify_inactive?: boolean;
    }) =>
      request("/notifications/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
