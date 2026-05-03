interface Props {
  icon: string;
  label: string;
  value: number | string;
  color?: string;
}

export default function SummaryCard({ icon, label, value, color = "#1F2937" }: Props) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: "20px 24px",
      flex: 1,
      minWidth: 140,
      boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
