import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkspace = async () => {
    // Skip workspace bootstrap on the public landing page — no need to create
    // a workspace for anonymous (or merely browsing) visitors.
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      setIsLoading(false);
      return;
    }

    // Gracefully handle unauthenticated visitors.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      setWorkspace(null);
      setIsLoading(false);
      return;
    }
    if (!user) { setIsLoading(false); return; }

    let workspaces = await base44.entities.Workspace.filter(
      { owner_user_id: user.id },
      "-created_date",
      1
    ).catch(() => []);

    if (workspaces.length === 0) {
      try {
        const created = await base44.entities.Workspace.create({
          owner_user_id: user.id,
          name: user.full_name ? `${user.full_name}'s Workspace` : "My Workspace",
          onboarding_complete: false,
        });
        workspaces = [created];
      } catch (err) {
        // Permission denied or transient error — surface no workspace rather than crash the app.
        console.warn("Workspace auto-create skipped:", err?.message);
        setWorkspace(null);
        setIsLoading(false);
        return;
      }
    }

    setWorkspace(workspaces[0]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshWorkspace();
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspace, refreshWorkspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}