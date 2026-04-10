export default function StatsCard({ icon: Icon, label, value, change, accentColor = "#3B82F6" }) {
  const isPositive = change === undefined || change >= 0;

  return (
    <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}20` }}>
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
        {change !== undefined && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
            background: isPositive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
            color: isPositive ? "#10B981" : "#EF4444"
          }}>
            {isPositive ? "+" : ""}{change}%
          </span>
        )}
      </div>
      <p className="text-xs mb-1" style={{ color: "#94A3B8" }}>{label}</p>
      <p className="text-2xl font-medium text-white tracking-tight">{value}</p>
      {/* Accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: accentColor, opacity: 0.6 }} />
    </div>
  );
}