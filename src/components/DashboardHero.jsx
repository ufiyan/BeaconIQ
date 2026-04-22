import { Link } from "react-router-dom";
import { FlaskConical, Zap } from "lucide-react";
import moment from "moment";

export default function DashboardHero({ userName, isEmpty, totalLeads, totalSent }) {
  return (
    <div className="relative rounded-3xl overflow-hidden mb-6 grid-bg" style={{
      background: "linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(124,77,255,0.05) 50%, rgba(255,45,146,0.08) 100%)",
      border: "1px solid rgba(0,229,255,0.15)",
    }}>
      {/* Floating orbs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-40 animate-float-orb pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.4), transparent 60%)", filter: "blur(48px)" }} />
      <div className="absolute -bottom-20 right-0 w-80 h-80 rounded-full opacity-30 animate-float-orb pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,45,146,0.4), transparent 60%)", filter: "blur(56px)", animationDelay: "-6s" }} />

      <div className="relative p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#00E5FF" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#00E5FF", boxShadow: "0 0 8px #00E5FF" }} />
            </span>
            <span className="font-mono text-[10px] tracking-[0.25em] text-cyan-300/90 uppercase">System Online · {moment().format("h:mm A")}</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mb-1.5">
            <span className="text-white">Welcome back, </span>
            <span className="text-gradient-brand">{userName || "Operator"}</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Your AI-powered outbound intelligence is scanning signals, scoring intent, and surfacing high-value prospects in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isEmpty && (
            <Link
              to="/settings?tab=demo"
              className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl font-medium transition-all"
              style={{ background: "rgba(255,45,146,0.12)", color: "#FF2D92", border: "1px solid rgba(255,45,146,0.3)", boxShadow: "0 0 16px rgba(255,45,146,0.15)" }}
            >
              <FlaskConical className="h-3.5 w-3.5" /> Load Demo Data
            </Link>
          )}
          <div className="flex items-stretch gap-2">
            <HeroStat label="Active Leads" value={totalLeads} color="#00E5FF" />
            <HeroStat label="Sent" value={totalSent} color="#FF2D92" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, color }) {
  return (
    <div className="rounded-xl px-4 py-2.5 min-w-[88px]" style={{ background: "rgba(5,7,15,0.5)", border: `1px solid ${color}30`, backdropFilter: "blur(8px)" }}>
      <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-500 mb-0.5">{label}</p>
      <p className="font-display text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}