const ACCENT = {
  blue:   { icon: "#60A5FA", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)" },
  purple: { icon: "#A78BFA", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.2)" },
  green:  { icon: "#34D399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)" },
  amber:  { icon: "#FBBF24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)" },
  red:    { icon: "#F87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)" },
  slate:  { icon: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" },
};

export default function StatsCard({ icon: Icon, label, value, sub, accent = "blue" }) {
  const a = ACCENT[accent] || ACCENT.blue;
  return (
    <div className="surface rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: a.bg, border: `1px solid ${a.border}` }}
        >
          <Icon className="h-4 w-4" style={{ color: a.icon }} />
        </div>
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
      <p className="text-[22px] font-semibold text-white leading-none tracking-tight">{value}</p>
      <p className="text-[12px] text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}