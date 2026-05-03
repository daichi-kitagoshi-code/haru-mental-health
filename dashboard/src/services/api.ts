const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

let token = localStorage.getItem("admin_token") ?? "";

export function setToken(t: string) {
  token = t;
  localStorage.setItem("admin_token", t);
}

export function clearToken() {
  token = "";
  localStorage.removeItem("admin_token");
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "エラーが発生しました" }));
    throw new Error(err.detail ?? "エラーが発生しました");
  }
  return res.json();
}

export const api = {
  signIn: (email: string, password: string) =>
    request("/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) }),
  getDashboard: () => request("/b2b/dashboard"),
};
