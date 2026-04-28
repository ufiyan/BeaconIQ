import { Sparkles, AlertTriangle, ArrowUpRight } from "lucide-react";

const priorityStyles = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function SeoRecommendations({ recommendations = [], strengths = [] }) {
  return (
    <div className="space-y-4">
      {strengths.length > 0 && (
        <div className="surface rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-success" />
            <h3 className="text-sm font-semibold text-foreground">Strengths</h3>
          </div>
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li key={i} className="text-sm text-foreground/85 flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="surface rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpRight className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
        </div>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations returned.</p>
        ) : (
          <ul className="space-y-3">
            {recommendations.map((r, i) => (
              <li key={i} className="border-l-2 border-border pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${priorityStyles[r.priority] || priorityStyles.low}`}>
                    {r.priority || "info"}
                  </span>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{r.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-xs text-muted-foreground flex items-start gap-2">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>Scores are AI-generated estimates based on on-page signals. They are guidance, not a substitute for full technical SEO audits.</span>
      </div>
    </div>
  );
}