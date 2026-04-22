import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scoreLeadIntent } from "../utils/intentScoring";
import { toast } from "@/components/ui/use-toast";

const URGENCY_COLORS = {
  Immediate: { bg: "rgba(239,68,68,0.12)",   color: "#F87171", border: "rgba(239,68,68,0.25)" },
  High:      { bg: "rgba(245,158,11,0.12)",  color: "#FBBF24", border: "rgba(245,158,11,0.25)" },
  Medium:    { bg: "rgba(59,130,246,0.12)",  color: "#60A5FA", border: "rgba(59,130,246,0.25)" },
  Low:       { bg: "rgba(148,163,184,0.12)", color: "#94A3B8", border: "rgba(148,163,184,0.25)" },
};

const AUTH_COLORS = {
  High:   { bg: "rgba(16,185,129,0.12)",  color: "#34D399", border: "rgba(16,185,129,0.25)" },
  Medium: { bg: "rgba(245,158,11,0.12)",  color: "#FBBF24", border: "rgba(245,158,11,0.25)" },
  Low:    { bg: "rgba(148,163,184,0.12)", color: "#94A3B8", border: "rgba(148,163,184,0.25)" },
};

function Pill({ label, style }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.color }} />
      {label}
    </span>
  );
}

function ScoreGauge({ score }) {
  const color = score >= 80 ? "#34D399" : score >= 50 ? "#FBBF24" : "#94A3B8";
  const label = score >= 80 ? "High intent" : score >= 50 ? "Medium intent" : "Low intent";
  const pct = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5" stroke="hsl(var(--secondary))" />
          <circle
            cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5"
            stroke={color}
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-semibold text-white leading-none">{score}</span>
          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">/ 100</span>
        </div>
      </div>
      <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

export default function IntentScoreCard({ lead, intentScore, onRescore }) {
  const [rescoring, setRescoring] = useState(false);

  const handleRescore = async () => {
    const text = lead.notes || "";
    if (!text.trim()) {
      toast({ title: "No text to analyze", description: "Add notes to this lead first, then re-score.", variant: "destructive" });
      return;
    }
    setRescoring(true);
    await scoreLeadIntent(lead.id, text);
    toast({ title: "Intent score updated" });
    setRescoring(false);
    onRescore();
  };

  return (
    <div className="surface rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md flex items-center justify-center bg-accent/15 border border-accent/25">
            <Zap className="h-3.5 w-3.5 text-accent" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">AI Intent Analysis</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Scored from behavioral and email signals</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRescore} disabled={rescoring} className="h-8 text-[12px] gap-1.5 text-muted-foreground hover:text-white">
          {rescoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Re-score
        </Button>
      </div>

      {!intentScore ? (
        <div className="flex flex-col items-center py-8 gap-3 text-center">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-accent/10 border border-accent/20">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-white">No intent score yet</p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">Add notes to this lead — AI will extract urgency, pain points, and decision authority.</p>
          </div>
          <Button size="sm" onClick={handleRescore} disabled={rescoring} className="gap-1.5 h-8 text-[12px]">
            {rescoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Score this lead
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-6">
            <ScoreGauge score={intentScore.intent_score} />
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1.5">Urgency</p>
                <Pill label={intentScore.urgency_level || "Low"} style={URGENCY_COLORS[intentScore.urgency_level] || URGENCY_COLORS.Low} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1.5">Decision Authority</p>
                <Pill label={intentScore.decision_authority || "Low"} style={AUTH_COLORS[intentScore.decision_authority] || AUTH_COLORS.Low} />
              </div>
            </div>
          </div>

          {intentScore.pain_point && (
            <div className="rounded-lg p-3.5 bg-accent/5 border-l-2 border-accent">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-accent mb-1.5">Pain point</p>
              <p className="text-[13px] text-white leading-relaxed">"{intentScore.pain_point}"</p>
            </div>
          )}

          {intentScore.urgency_signals && (
            <div>
              <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-2">Urgency signals</p>
              <div className="flex flex-wrap gap-1.5">
                {intentScore.urgency_signals.split(",").map((s, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/20">
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {intentScore.scoring_rationale && (
            <div className="pt-3 border-t border-border">
              <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1.5">Why this score</p>
              <p className="text-[12px] text-foreground/80 leading-relaxed">{intentScore.scoring_rationale}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}