export default function StatsCard({ icon: Icon, label, value, change, accentColor = "#00E5FF" }) {
  const isPositive = change === undefined || change >= 0;

  return (
    <div
      className="group relative rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Glow halo */}
      <div
        className="absolute -top-16 -right-10 w-40 h-40 rounded-full opacity-20 group-hover:opacity-40 transition-opacity blur-3xl pointer-events-none"
        style={{ background: accentColor }}
      />

      {/* Corner tick */}
      <div className="absolute top-0 right-0 w-12 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accentColor})` }} />
      <div className="absolute top-0 right-0 w-px h-12" style={{ background: `linear-gradient(180deg, ${accentColor}, transparent)` }} />

      <div className="relative flex items-start justify-between mb-5">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center relative"
          style={{
            background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}08)`,
            border: `1px solid ${accentColor}40`,
            boxShadow: `0 0 16px ${accentColor}30, inset 0 1px 0 rgba(255,255,255,0.08)`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} strokeWidth={2.25} />
        </div>
        {change !== undefined && (
          <span
            className="text-[10px] font-mono font-semibold tracking-wider px-2 py-1 rounded-md"
            style={{
              background: isPositive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              color: isPositive ? "#10F5A5" : "#FF4D6D",
              border: `1px solid ${isPositive ? "rgba(16,245,165,0.25)" : "rgba(255,77,109,0.25)"}`,
            }}
          >
            {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}{change}%
          </span>
        )}
      </div>

      <p className="relative font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500 mb-2">{label}</p>
      <p className="relative font-display text-3xl font-semibold text-white tracking-tight">{value}</p>

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
    </div>
  );
}