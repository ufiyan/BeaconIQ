import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, Trash2, Loader2, CheckCircle2, FlaskConical } from "lucide-react";
import LaunchQAPanel from "./LaunchQAPanel";
import TemplateReadinessPanel from "./TemplateReadinessPanel";

const INCLUDED = [
  "10 inbound leads across every pipeline stage",
  "6 AI intent scores with urgency signals and pain points",
  "3 campaigns (Active, Paused)",
  "8 email ingestion logs including 2 pending reviews",
  "3 follow-up reminders",
  "Sample business profile configured for AI email generation",
];

function friendlyError(err) {
  return (
    err?.response?.data?.error ||
    err?.data?.error ||
    err?.message ||
    "Something went wrong. Please try again."
  );
}

export default function DemoDataPanel() {
  const { workspace, isLoading: wsLoading } = useWorkspace();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [done, setDone] = useState(null);

  const busy = seeding || clearing;

  const handleSeed = async () => {
    if (busy) return;
    if (!workspace?.id) {
      toast({ title: "Workspace not ready", description: "Please refresh and try again.", variant: "destructive" });
      return;
    }
    setSeeding(true);
    try {
      const res = await base44.functions.invoke("loadDemoData", { action: "seed", workspace_id: workspace.id });
      const d = res?.data || {};
      if (d.already_seeded) {
        toast({ title: "Demo data already loaded", description: "Clear demo data first, then re-seed." });
      } else if (d.success) {
        setDone("seeded");
        const desc = d.leads_created
          ? `${d.leads_created} leads · ${d.campaigns_created} campaigns · ${d.ingestion_logs_created} inbox logs · ${d.reminders_created} reminders`
          : (d.message || "Sample data loaded.");
        toast({ title: "Demo workspace ready", description: desc });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast({ title: "Could not load demo data", description: d.error || "Unexpected response.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Could not load demo data", description: friendlyError(e), variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    if (busy) return;
    if (!workspace?.id) return;
    if (!confirm("Clear all demo data from this workspace? Your real data will not be affected.")) return;
    setClearing(true);
    try {
      const res = await base44.functions.invoke("loadDemoData", { action: "clear", workspace_id: workspace.id });
      const d = res?.data || {};
      if (d.success) {
        setDone("cleared");
        toast({ title: "Demo data cleared", description: d.message || "Workspace reset." });
        setTimeout(() => window.location.reload(), 900);
      } else {
        toast({ title: "Could not clear demo data", description: d.error || "Unexpected response.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Could not clear demo data", description: friendlyError(e), variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero action card */}
      <div className="surface-elevated rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-accent/15 border border-accent/25 flex-shrink-0">
            <FlaskConical className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-white">Sample workspace</p>
            <p className="text-[12px] text-muted-foreground mt-0.5 max-w-md">
              Seeds realistic data across every live module so you can test BeaconIQ end-to-end without connecting Gmail.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSeed}
            disabled={busy || wsLoading || !workspace?.id}
            className="gap-1.5 h-9 text-[13px] font-semibold"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {seeding ? "Loading…" : "Load sample data"}
          </Button>
          <Button
            onClick={handleClear}
            disabled={busy || wsLoading || !workspace?.id}
            variant="outline"
            className="gap-1.5 h-9 text-[12px] text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/25"
          >
            {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {clearing ? "Clearing…" : "Reset demo data"}
          </Button>
        </div>

        {done === "seeded" && (
          <div className="flex items-center gap-2 text-[12px] mt-3 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Demo workspace loaded — reloading…
          </div>
        )}
        {done === "cleared" && (
          <div className="flex items-center gap-2 text-[12px] mt-3 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" /> Demo data cleared — reloading…
          </div>
        )}
      </div>

      {/* What's included */}
      <div className="surface rounded-xl p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">What's included</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {INCLUDED.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-foreground/90">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Launch QA checklist */}
      <LaunchQAPanel />

      {/* Template publishing readiness */}
      <TemplateReadinessPanel />
    </div>
  );
}