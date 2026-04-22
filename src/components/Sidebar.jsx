import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Mail, Zap, Settings, X, LogOut, Inbox, GitPullRequest, FileText, FlaskConical, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";

const navGroups = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/app" },
      { label: "Leads", icon: Users, path: "/leads" },
      { label: "Campaigns", icon: Zap, path: "/campaigns" },
    ],
  },
  {
    label: "Inbox",
    items: [
      { label: "Sent Emails", icon: Mail, path: "/emails" },
      { label: "Inbox Activity", icon: Inbox, path: "/email-ingestion" },
      { label: "Review Queue", icon: GitPullRequest, path: "/review-queue", badge: true },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Email Templates", icon: FileText, path: "/templates" },
      { label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    base44.entities.EmailIngestionLog
      .filter({ created_by: user.email, result: "pending_review" }, "-created_date", 200)
      .then((items) => setPendingCount(items.length))
      .catch(() => {});
  }, [location.pathname, user]);

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
        <Link to="/app" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/15 border border-primary/25">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">BeaconIQ</span>
        </Link>
        <button onClick={onClose} className="lg:hidden h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.label && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/");
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 h-9 rounded-md text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-white"
                        : "text-muted-foreground hover:text-white hover:bg-secondary/60"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && pendingCount > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 h-[18px] min-w-[18px] rounded-full flex items-center justify-center bg-warning/15 text-warning border border-warning/25">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
              {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-white truncate">{user.full_name || user.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Link
          to="/settings?tab=demo"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 h-8 rounded-md text-[12px] font-medium text-muted-foreground hover:text-white hover:bg-secondary/60 transition-colors"
        >
          <FlaskConical className="h-3.5 w-3.5" /> Demo & Testing
        </Link>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-2.5 px-3 h-8 rounded-md text-[12px] font-medium w-full text-muted-foreground hover:text-white hover:bg-secondary/60 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </div>
    </div>
  );
}