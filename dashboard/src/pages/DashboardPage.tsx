import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api, clearToken } from "../services/api";
import AlertCard from "../components/AlertCard";
import SummaryCard from "../components/SummaryCard";

interface DashboardData {
  company: { name: string; plan: string };
  summary: {
    employee_count: number;
    high_risk_count: number;
    medium_risk_count: number;
    total_signals: number;
  };
  alerts: Array<{
    department: string;
    target_role_level: string;
    keywords: string[];
    severity: "high" | "medium" | "low";
    signal_count: number;
    change_pct: number | null;
  }>;
  generated_at: string;
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
const SEVERITY_COLORS = { high: "#EF4444", medium: "#F59E0B", low: "#10B981" };

export default function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearToken();
    onLogout();
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
        <p style={{ color: "#6B7280" }}>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
        <p style={{ color: "#EF4444" }}>{error}</p>
        <button onClick={handleLogout} style={btnStyle}>再ログイン</button>
      </div>
    );
  }

  if (!data) return null;

  const sortedAlerts = [...data.alerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  const chartData = data.alerts
    .sort((a, b) => b.signal_count - a.signal_count)
    .slice(0, 8)
    .map(a => ({
      name: `${a.department}\n${a.target_role_level}`,
      count: a.signal_count,
      severity: a.severity,
    }));

  const generatedAt = new Date(data.generated_at).toLocaleString("ja-JP");

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {/* ヘッダー */}
      <header style={{
        background: "#fff", borderBottom: "1px solid #E5E7EB",
        padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🌸</span>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#1F2937" }}>ハル ダッシュボード</span>
          <span style={{
            background: "#F3E8FF", color: "#7C3AED", fontSize: 12,
            padding: "2px 10px", borderRadius: 20, marginLeft: 4,
          }}>
            {data.company.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>最終更新：{generatedAt}</span>
          <button onClick={handleLogout} style={btnStyle}>ログアウト</button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* 重要な注記 */}
        <div style={{
          background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10,
          padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#1D4ED8",
        }}>
          ⚠️ このデータは従業員の発言を<strong>匿名・集計</strong>したものです。
          個人を特定する情報は含まれていません。詳細な調査が必要な場合は、従業員が自発的に相談できる環境を整えることを推奨します。
        </div>

        {/* サマリーカード */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <SummaryCard icon="👥" label="登録従業員数" value={data.summary.employee_count} />
          <SummaryCard icon="🔴" label="高リスク" value={data.summary.high_risk_count} color="#EF4444" />
          <SummaryCard icon="🟡" label="中リスク" value={data.summary.medium_risk_count} color="#F59E0B" />
          <SummaryCard icon="📊" label="総シグナル数（今月）" value={data.summary.total_signals} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* アラート一覧 */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", marginBottom: 16 }}>
              ⚠️ リスクアラート（今月）
            </h2>
            {sortedAlerts.length === 0 ? (
              <div style={{
                background: "#ECFDF5", border: "1px solid #6EE7B7",
                borderRadius: 12, padding: 24, textAlign: "center", color: "#065F46",
              }}>
                ✅ 今月はリスクシグナルが検出されていません
              </div>
            ) : (
              sortedAlerts.map((alert, i) => <AlertCard key={i} alert={alert} />)
            )}
          </div>

          {/* 棒グラフ */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", marginBottom: 16 }}>
              📈 部署別シグナル数
            </h2>
            {chartData.length > 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip
                      formatter={(value: number) => [`${value}件`, "シグナル数"]}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={SEVERITY_COLORS[entry.severity]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#6B7280", justifyContent: "center" }}>
                  {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
                    <span key={sev} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block" }} />
                      {sev === "high" ? "高" : sev === "medium" ? "中" : "低"}リスク
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24, textAlign: "center", color: "#9CA3AF" }}>
                データがありません
              </div>
            )}

            {/* キーワードクラウド */}
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", margin: "24px 0 12px" }}>
              🔑 頻出キーワード（今月）
            </h2>
            <div style={{
              background: "#fff", borderRadius: 12, padding: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", flexWrap: "wrap", gap: 8,
            }}>
              {Array.from(
                new Set(data.alerts.flatMap(a => a.keywords))
              ).slice(0, 20).map((kw, i) => (
                <span key={i} style={{
                  background: "#FEF2F2", border: "1px solid #FECACA",
                  borderRadius: 20, padding: "4px 12px", fontSize: 13, color: "#991B1B",
                }}>
                  {kw}
                </span>
              ))}
              {data.alerts.flatMap(a => a.keywords).length === 0 && (
                <span style={{ color: "#9CA3AF", fontSize: 13 }}>キーワードがありません</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 16px", background: "transparent",
  border: "1px solid #E5E7EB", borderRadius: 8,
  fontSize: 13, cursor: "pointer", color: "#374151",
};
