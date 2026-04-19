export default function ScoreBar({ label, score, color = "blue" }) {
  const colorMap = {
    blue: { bar: "#3B82F6", bg: "rgba(59,130,246,0.15)", text: "#3B82F6" },
    green: { bar: "#10B981", bg: "rgba(16,185,129,0.15)", text: "#10B981" },
    orange: { bar: "#F59E0B", bg: "rgba(245,158,11,0.15)", text: "#F59E0B" },
    purple: { bar: "#8B5CF6", bg: "rgba(139,92,246,0.15)", text: "#8B5CF6" },
  };
  const c = colorMap[color] || colorMap.blue;
  const pct = Math.max(0, Math.min(100, score || 0));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "#94A3B8" }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: c.text }}>{pct}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: c.bg }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: c.bar }}
        />
      </div>
    </div>
  );
}