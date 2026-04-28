import { cn } from "@/lib/utils";

function scoreColor(score) {
  if (score >= 80) return { text: "text-success", bg: "bg-success/10", border: "border-success/30", ring: "stroke-success" };
  if (score >= 60) return { text: "text-warning", bg: "bg-warning/10", border: "border-warning/30", ring: "stroke-warning" };
  return { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", ring: "stroke-destructive" };
}

export default function SeoScoreCard({ score, label, sublabel }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const c = scoreColor(safeScore);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (safeScore / 100) * circumference;

  return (
    <div className={cn("surface-elevated rounded-xl p-5 flex items-center gap-4", c.border)}>
      <div className="relative h-24 w-24 flex-shrink-0">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" strokeWidth="8" className="stroke-secondary" fill="none" />
          <circle
            cx="50"
            cy="50"
            r="40"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className={c.ring}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-2xl font-bold", c.text)}>{safeScore}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        {sublabel && <p className="text-sm text-foreground/80 mt-1">{sublabel}</p>}
      </div>
    </div>
  );
}