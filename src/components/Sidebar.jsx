import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Mail, Zap, Settings, X, LogOut, Inbox, GitPullRequest, FileText, Telescope, Target, FlaskConical, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";

const navGroups = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Leads", icon: Users, path: "/leads" },
      { label: "Campaigns", icon: Zap, path: "/campaigns" },
    ]
  },
  {
    label: "DISCOVER",
    items: [
      { label: "Prospect Discovery", subtitle: "Find outbound opportunities", icon: Telescope, path: "/prospect-discovery" },
      { label: "ICP Settings", subtitle: "Define your ideal customer", icon: Target, path: "/icp-settings" },
    ]
  },
  {
    label: "INBOX",
    items: [
      { label: "Sent Emails", icon: Mail, path: "/emails" },
      { label: "Inbox Activity", subtitle: "Emails scanned by AI", icon: Inbox, path: "/email-ingestion" },
      { label: "Needs Review", icon: GitPullRequest, path: "/review-queue", badge: true },
    ]
  },
  {
    items: [
      { label: "Email Templates", icon: FileText, path: "/templates" },
      { label: "Settings", icon: Settings, path: "/settings" },
    ]
  },
];

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    base44.entities.EmailIngestionLog.filter({ created_by: user.email, result: "pending_review" }, "-created_date", 200)
      .then(items => setPendingCount(items.length))
      .catch(() => {});
  }, [location.pathname, user]);

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ background: "linear-gradient(180deg, #06081A 0%, #05070F 100%)" }}>
      {/* Ambient glow orbs */}
      <div className="absolute -top-20 -left-10 w-48 h-48 rounded-full opacity-30 pointer-events-none animate-float-orb" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.35) 0%, transparent 70%)", filter: "blur(40px)" }} />
      <div className="absolute bottom-32 -right-16 w-56 h-56 rounded-full opacity-20 pointer-events-none animate-float-orb" style={{ background: "radial-gradient(circle, rgba(255,45,146,0.35) 0%, transparent 70%)", filter: "blur(48px)", animationDelay: "-4s" }} />

      {/* Vertical accent rail */}
      <div className="absolute top-0 bottom-0 right-0 w-px" style={{ background: "linear-gradient(180deg, transparent, rgba(0,229,255,0.25) 20%, rgba(255,45,146,0.15) 60%, transparent)" }} />

      {/* Logo */}
      <div className="relative h-20 flex items-center justify-between px-5 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(255,45,146,0.15))", border: "1px solid rgba(0,229,255,0.3)", boxShadow: "0 0 24px rgba(0,229,255,0.25), inset 0 0 12px rgba(0,229,255,0.1)" }}>
            <Sparkles className="h-4 w-4 text-cyan-300 relative z-10" strokeWidth={2.5} />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-transparent" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-tight text-gradient-brand">BeaconIQ</span>
            <span className="font-mono text-[9px] tracking-[0.2em] text-cyan-400/70 mt-0.5">OUTBOUND.AI</span>
          </div>
        </Link>
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-3 py-5 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.label && (
              <p className="px-3 pb-2 font-mono text-[10px] font-semibold tracking-[0.25em] text-cyan-400/60">{group.label}</p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${isActive ? "text-white" : "text-slate-400 hover:text-white"}`}
                    style={{
                      background: isActive
                        ? "linear-gradient(90deg, rgba(0,229,255,0.15) 0%, rgba(0,229,255,0.04) 100%)"
                        : "transparent",
                      border: isActive ? "1px solid rgba(0,229,255,0.25)" : "1px solid transparent",
                      boxShadow: isActive ? "0 0 20px rgba(0,229,255,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full" style={{ background: "linear-gradient(180deg, #00E5FF, #FF2D92)", boxShadow: "0 0 12px #00E5FF" }} />
                    )}
                    <item.icon className="h-[17px] w-[17px] flex-shrink-0 transition-colors" style={{ color: isActive ? "#00E5FF" : undefined }} strokeWidth={isActive ? 2.25 : 2} />
                    <span className="flex-1 leading-tight">
                      {item.label}
                      {item.subtitle && <span className="block text-[10px] font-normal mt-0.5 text-slate-500 group-hover:text-slate-400">{item.subtitle}</span>}
                    </span>
                    {item.badge && pendingCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold leading-none font-mono" style={{ background: "linear-gradient(135deg, #FFB020, #FF2D92)", color: "#05070F", boxShadow: "0 0 12px rgba(255,45,146,0.4)" }}>{pendingCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="relative p-3 border-t border-white/5">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-cyan-300 flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(255,45,146,0.1))", border: "1px solid rgba(0,229,255,0.2)" }}>
              {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user.full_name || user.email}</p>
              <p className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">{user.role || "user"}</p>
            </div>
          </div>
        )}
        <Link
          to="/settings?tab=demo"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium w-full transition-all mb-1"
          style={{ color: "#FF2D92", background: "rgba(255,45,146,0.06)", border: "1px solid rgba(255,45,146,0.15)" }}
        >
          <FlaskConical className="h-[14px] w-[14px]" />
          Demo & Testing
        </Link>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium w-full transition-colors text-slate-400 hover:text-white hover:bg-white/5"
        >
          <LogOut className="h-[14px] w-[14px]" />
          Log Out
        </button>
      </div>
    </div>
  );
}