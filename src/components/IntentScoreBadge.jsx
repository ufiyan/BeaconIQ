export default function IntentScoreBadge({ score }) {
  if (score == null) return <span className="text-xs" style={{ color: "#94A3B8" }}>—</span>;

  const color = score >= 80 ? "#F59E0B" : score >= 50 ? "#3B82F6" : "#94A3B8";
  const bg = score >= 80 ? "rgba(245,158,11,0.15)" : score >= 50 ? "rgba(59,130,246,0.15)" : "rgba(148,163,184,0.1)";

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: bg, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {score}
    </span>
  );
}