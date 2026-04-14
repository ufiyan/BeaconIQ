import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Menu } from "lucide-react";
import WorkspaceOnboardingModal from "./WorkspaceOnboardingModal";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingWorkspace, setCheckingWorkspace] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async user => {
      if (!user) { setCheckingWorkspace(false); return; }
      setCurrentUser(user);
      const workspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1).catch(() => []);
      if (workspaces.length === 0 || !workspaces[0].onboarding_complete) {
        setShowOnboarding(true);
      }
      setCheckingWorkspace(false);
    }).catch(() => setCheckingWorkspace(false));
  }, []);

  if (checkingWorkspace) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background font-inter overflow-hidden">
      {showOnboarding && currentUser && (
        <WorkspaceOnboardingModal
          user={currentUser}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out
        lg:relative lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center h-14 px-4 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <span className="ml-3 font-bold text-foreground">Beacon<span style={{color:'#F59E0B'}}>IQ</span></span>
        </div>
        
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}