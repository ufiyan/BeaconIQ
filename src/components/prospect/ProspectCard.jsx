import { Building2, MapPin, Users, ChevronRight, Bookmark, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SignalBadge from "./SignalBadge";
import ScoreBar from "./ScoreBar";

export default function ProspectCard({ prospect, signals = [], onView, onSave, onDismiss, onOutreach, isSelected }) {
  const topSignals = signals.slice(0, 3);
  const opp = prospect.opportunity_score || 0;
  const oppColor = opp >= 75 ? "#10B981" : opp >= 50 ? "#F59E0B" : "#94A3B8";
  const oppBg = opp >= 75 ? "rgba(16,185,129,0.15)" : opp >= 50 ? "rgba(245,158,11,0.15)" : "rgba(148,163,184,0.1)";

  return (
    <div
      className="rounded-xl p-5 cursor-pointer transition-all duration-200"
      style={{
        background: isSelected ? "rgba(59,130,246,0.08)" : "hsl(var(--card))",
        border: isSelected ? "1px solid rgba(59,130,246,0.4)" : "1px solid hsl(var(--border))",
      }}
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Company Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.1)" }}>
              <Building2 className="h-4 w-4" style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm leading-tight">{prospect.company_name}</h3>
              <p className="text-xs" style={{ color: "#64748B" }}>{prospect.industry}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-2 mb-3">
            {prospect.location && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#94A3B8" }}>
                <MapPin className="h-3 w-3" />{prospect.location}
              </span>
            )}
            {prospect.employee_count && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#94A3B8" }}>
                <Users className="h-3 w-3" />{prospect.employee_count.toLocaleString()} employees
              </span>
            )}
          </div>

          {/* Signals */}
          {topSignals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {topSignals.map((sig, i) => <SignalBadge key={i} type={sig.signal_type} />)}
            </div>
          )}

          {/* Scores */}
          <div className="grid grid-cols-3 gap-3">
            <ScoreBar label="Fit" score={prospect.fit_score} color="blue" />
            <ScoreBar label="Timing" score={prospect.timing_score} color="orange" />
            <ScoreBar label="Opportunity" score={prospect.opportunity_score} color="green" />
          </div>
        </div>

        {/* Right: Opportunity Score Badge */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="rounded-xl px-3 py-2 text-center min-w-[64px]" style={{ background: oppBg }}>
            <p className="text-2xl font-bold leading-none" style={{ color: oppColor }}>{opp}</p>
            <p className="text-xs mt-0.5" style={{ color: oppColor, opacity: 0.8 }}>score</p>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: "#475569" }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }} onClick={e => e.stopPropagation()}>
        <Button size="sm" onClick={onSave} className="gap-1.5 h-7 text-xs" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
          <Bookmark className="h-3 w-3" /> Save to Leads
        </Button>
        <Button size="sm" onClick={onOutreach} className="gap-1.5 h-7 text-xs" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}>
          <Sparkles className="h-3 w-3" /> Generate Outreach
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss} className="gap-1.5 h-7 text-xs ml-auto" style={{ color: "#64748B" }}>
          <Trash2 className="h-3 w-3" /> Dismiss
        </Button>
      </div>
    </div>
  );
}