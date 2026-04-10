import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, Zap, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scoreLeadIntent } from "../utils/intentScoring";
import { toast } from "@/components/ui/use-toast";

const URGENCY_COLORS = {
  Immediate: { bg: "rgba(239,68,68,0.15)", color: "#EF4444" },
  High: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" },
  Medium: { bg: "rgba(59,130,246,0.15)", color: "#3B82F6" },
  Low: { bg: "rgba(148,163,184,0.1)", color: "#94A3B8" },
};

const AUTH_COLORS = {
  High: { bg: "rgba(16,185,129,0.15)", color: "#10B981" },
  Medium: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" },
  Low: { bg: "rgba(148,163,184,0.1)", color: "#94A3B8" },
};

function Pill({ label, style }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={style}>
      {label}
    </span>
  );
}

function ScoreGauge({ score }) {
  const color = score >= 80 ? "#F59E0B" : score >= 50 ? "#3B82F6" : "#94A3B8";
  const label = score >= 80 ? "High Intent" : score >= 50 ? "Medium Intent" : "Low Intent";
  const pct = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" stroke="hsl(var(--secondary))" />
          <circle
            cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
            stroke={color}
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

export default function IntentScoreCard({ lead, intentScore, onRescore }) {
  const [rescoring, setRescoring] = useState(false);

  const handleRescore = async () => {
    const text = lead.notes || "";
    if (!text.trim()) {
      toast({ title: "No text to analyze. Add notes to this lead first.", variant: "destructive" });
      return;
    }
    setRescoring(true);
    await scoreLeadIntent(lead.id, text);
    toast({ title: "Intent score updated!" });
    setRescoring(false);
    onRescore();
  };

  return (
    <div className="rounded-xl p-5" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" style={{ color: "#F59E0B" }} />
          <p className="text-xs font-medium text-white">IQ Intent Score</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRescore}
          disabled={rescoring}
          className="h-7 text-xs gap-1.5"
          style={{ color: "#94A3B8" }}
        >
          {rescoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Re-score
        </Button>
      </div>

      {!intentScore ? (
        <div className="flex flex-col items-center py-6 gap-3">
          <Sparkles className="h-8 w-8" style={{ color: "#94A3B8" }} />
          <p className="text-xs text-center" style={{ color: "#94A3B8" }}>No intent score yet. Add notes and click Re-score.</p>
          <Button size="sm" onClick={handleRescore} disabled={rescoring} className="gap-2 text-xs h-8" style={{ background: "#F59E0B", color: "#000", border: "none" }}>
            {rescoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Score this Lead
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Score gauge + pills */}
          <div className="flex items-center gap-6">
            <ScoreGauge score={intentScore.intent_score} />
            <div className="space-y-2">
              <div>
                <p className="text-xs mb-1" style={{ color: "#94A3B8" }}>Urgency</p>
                <Pill label={intentScore.urgency_level} style={URGENCY_COLORS[intentScore.urgency_level] || URGENCY_COLORS.Low} />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "#94A3B8" }}>Decision Authority</p>
                <Pill label={intentScore.decision_authority} style={AUTH_COLORS[intentScore.decision_authority] || AUTH_COLORS.Low} />
              </div>
            </div>
          </div>

          {/* Pain point */}
          {intentScore.pain_point && (
            <div className="rounded-lg p-3" style={{ background: "rgba(59,130,246,0.08)", borderLeft: "2px solid #3B82F6" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "#3B82F6" }}>Pain Point</p>
              <p className="text-xs text-white leading-relaxed">"{intentScore.pain_point}"</p>
            </div>
          )}

          {/* Urgency signals */}
          {intentScore.urgency_signals && (
            <div>
              <p className="text-xs mb-2" style={{ color: "#94A3B8" }}>Urgency Signals</p>
              <div className="flex flex-wrap gap-1.5">
                {intentScore.urgency_signals.split(",").map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rationale */}
          {intentScore.scoring_rationale && (
            <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>
              <span className="font-medium" style={{ color: "#64748B" }}>Why: </span>
              {intentScore.scoring_rationale}
            </p>
          )}
        </div>
      )}
    </div>
  );
}