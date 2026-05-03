type Severity = "high" | "medium" | "low";

interface Alert {
  department: string;
  target_role_level: string;
  keywords: string[];
  severity: Severity;
  signal_count: number;
  change_pct: number | null;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; dot: string; border: string; bg: string }> = {
  high:   { label: "高リスク", dot: "🔴", border: "#FCA5A5", bg: "#FEF2F2" },
  medium: { label: "中リスク", dot: "🟡", border: "#FCD34D", bg: "#FFFBEB" },
  low:    { label: "低リスク", dot: "🟢", border: "#6EE7B7", bg: "#ECFDF5" },
};

const ROLE_LABELS: Record<string, string> = {
  manager: "マネージャー", leader: "リーダー",
  director: "部長クラス", executive: "役員クラス", member: "メンバー",
};

export default function AlertCard({ alert }: { alert: Alert }) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  return (
    <div style={{
      border: `1.5px solid ${cfg.border}`,
      background: cfg.bg,
      borderRadius: 12,
      padding: "16px 20px",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {cfg.dot} {cfg.label}：{alert.department} {ROLE_LABELS[alert.target_role_level] ?? alert.target_role_level}
        </span>
        <span style={{ fontSize: 13, color: "#6B7280" }}>
          関連発言数：<strong>{alert.signal_count}件</strong>
          {alert.change_pct !== null && (
            <span style={{ color: alert.change_pct > 0 ? "#EF4444" : "#10B981", marginLeft: 6 }}>
              （先月比{alert.change_pct > 0 ? "+" : ""}{alert.change_pct}%）
            </span>
          )}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {alert.keywords.map((kw, i) => (
          <span key={i} style={{
            background: "#fff",
            border: `1px solid ${cfg.border}`,
            borderRadius: 20,
            padding: "2px 10px",
            fontSize: 13,
            color: "#374151",
          }}>
            「{kw}」
          </span>
        ))}
      </div>
    </div>
  );
}
