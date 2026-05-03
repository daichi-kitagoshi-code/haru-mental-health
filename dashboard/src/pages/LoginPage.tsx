import { useState } from "react";
import { api, setToken } from "../services/api";

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api.signIn(email, password);
      setToken(result.access_token);
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #FFF5F9 0%, #F3E8FF 100%)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 40, width: 380,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40 }}>🌸</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 4px", color: "#1F2937" }}>ハル 管理ダッシュボード</h1>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>企業管理者向けポータル</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="管理者メールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px", background: "#F8B4D9",
              border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              color: "#fff",
            }}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  border: "1.5px solid #E5E7EB", fontSize: 15, marginBottom: 12,
  outline: "none", boxSizing: "border-box",
};
