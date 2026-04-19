import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Mail, Zap, Settings, X, LogOut, Radio, Inbox, GitPullRequest, FileText, Telescope, Target, FlaskConical } from "lucide-react";
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
    <div className="h-full flex flex-col" style={{ background: "hsl(var(--sidebar-background))", borderRight: "1px solid hsl(var(--sidebar-border))" }}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
            <Radio className="h-4 w-4" style={{ color: "#3B82F6" }} />
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span style={{ color: "#FFFFFF" }}>Beacon</span><span style={{ color: "#F59E0B" }}>IQ</span>
          </span>
        </Link>
        <button onClick={onClose} className="lg:hidden p-1 rounded-md" style={{ color: "#94A3B8" }}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div className="my-2 mx-2" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }} />}
            {group.label && (
              <p className="px-3 pt-1 pb-1 text-xs font-semibold tracking-widest" style={{ color: "#3B82F6", opacity: 0.7 }}>{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative"
                    style={{
                      background: isActive ? "#1E3A5F" : "transparent",
                      color: isActive ? "#3B82F6" : "#94A3B8",
                      borderLeft: isActive ? "4px solid #F59E0B" : "4px solid transparent",
                    }}
                  >
                    <item.icon className="h-[17px] w-[17px] flex-shrink-0" />
                    <span className="flex-1 leading-tight">
                      {item.label}
                      {item.subtitle && <span className="block text-xs font-normal" style={{ color: "#64748B" }}>{item.subtitle}</span>}
                    </span>
                    {item.badge && pendingCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold leading-none" style={{ background: "#F59E0B", color: "#000" }}>{pendingCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-white truncate">{user.full_name || user.email}</p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>{user.role || "user"}</p>
          </div>
        )}
        <Link
          to="/settings?tab=demo"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium w-full transition-colors mb-1"
          style={{ color: "#8B5CF6", background: "rgba(139,92,246,0.08)" }}
        >
          <FlaskConical className="h-[15px] w-[15px]" />
          Demo & Testing
        </Link>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-colors"
          style={{ color: "#94A3B8" }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "#94A3B8"}
        >
          <LogOut className="h-[17px] w-[17px]" />
          Log Out
        </button>
      </div>
    </div>
  );
}