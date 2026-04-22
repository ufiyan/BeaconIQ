import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Zap, Settings } from "lucide-react";

const TABS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/app" },
  { label: "Leads", icon: Users, path: "/leads" },
  { label: "Campaigns", icon: Zap, path: "/campaigns" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function MobileNavigation() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path !== "/app" && location.pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <tab.icon className="h-[18px] w-[18px]" />
              <span className="tracking-wide">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}