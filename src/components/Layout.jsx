import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Menu, X } from "lucide-react";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user) return;
      base44.entities.BusinessProfile.filter({ created_by: user.email }, '-created_date', 1).then(profiles => {
        if (profiles.length === 0) navigate('/onboarding');
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-background font-inter overflow-hidden">
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