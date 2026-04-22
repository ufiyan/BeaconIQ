export default function IntentScoreBadge({ score }) {
  if (score == null) return <span className="text-[11px] text-muted-foreground">—</span>;

  let color = "#94A3B8", bg = "rgba(148,163,184,0.1)", border = "rgba(148,163,184,0.2)";
  if (score >= 70)      { color = "#FBBF24"; bg = "rgba(245,158,11,0.12)";  border = "rgba(245,158,11,0.25)"; }
  else if (score >= 40) { color = "#60A5FA"; bg = "rgba(59,130,246,0.12)";  border = "rgba(59,130,246,0.25)"; }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {score}
    </span>
  );
}