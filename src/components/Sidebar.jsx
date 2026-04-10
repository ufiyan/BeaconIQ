import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Mail, Zap, Settings, X, LogOut, Radio, Inbox, GitPullRequest } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Leads", icon: Users, path: "/leads" },
  { label: "Campaigns", icon: Zap, path: "/campaigns" },
  { label: "Email Log", icon: Mail, path: "/emails" },
  { label: "Ingestion", icon: Inbox, path: "/email-ingestion" },
  { label: "Review Queue", icon: GitPullRequest, path: "/review-queue" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const { user } = useAuth();

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
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-white truncate">{user.full_name || user.email}</p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>{user.role || "user"}</p>
          </div>
        )}
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