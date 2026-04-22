import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, Trash2, Loader2, CheckCircle2, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";

const CHECKLIST = [
  { id: 1, label: "Load demo data",          sub: "Seeds leads, campaigns, email logs, and ingestion history", path: null },
  { id: 2, label: "Review the Dashboard",    sub: "Confirm KPIs, pipeline, and next-best-action populate",     path: "/" },
  { id: 3, label: "Open a high-intent lead", sub: "See AI intent score, pain point, and urgency signals",      path: "/leads" },
  { id: 4, label: "Generate an AI email",    sub: "Watch AI personalize outreach from lead + business context", path: "/leads" },
  { id: 5, label: "Open Inbox Activity",     sub: "Verify sample ingestion logs appear",                        path: "/email-ingestion" },
  { id: 6, label: "Approve a review item",   sub: "Convert a flagged inbound email into a lead",                path: "/review-queue" },
  { id: 7, label: "Explore a campaign",      sub: "Review sequence steps and reply rates",                      path: "/campaigns" },
];

const INCLUDED = [
  "10 realistic inbound leads across every pipeline stage",
  "6 AI intent scores with urgency signals and pain points",
  "3 campaigns (active, paused, completed)",
  "8 email ingestion logs including pending reviews",
  "3 follow-up reminders",
  "Full business profile configured for AI email generation",
];

async function invokeDemoAction(action, workspaceId) {
  const candidates = ["loadDemoData", "seedDemoData", "demoData"];
  let lastErr = null;
  for (const fn of candidates) {
    try {
      const res = await base44.functions.invoke(fn, { action, workspace_id: workspaceId });
      return { res, fn };
    } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

export default function DemoDataPanel() {
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [done, setDone] = useState(null);
  const [checked, setChecked] = useState({});

  const handleSeed = async () => {
    if (!workspace?.id) {
      toast({ title: "No workspace found", description: "Please refresh and try again.", variant: "destructive" });
      return;
    }
    if (seeding) return;
    setSeeding(true);
    try {
      const { res, fn } = await invokeDemoAction("seed", workspace.id);
      const d = res?.data || res || {};
      if (d.already_seeded) {
        toast({ title: "Demo data already loaded", description: "Clear demo data first, then re-seed." });
      } else {
        setDone("seeded");
        const desc = d.leads_created
          ? `${d.leads_created} leads · ${d.campaigns_created} campaigns · ${d.ingestion_logs_created} inbox logs`
          : (d.message || `Sample data loaded using ${fn}.`);
        toast({ title: "Demo workspace ready", description: desc });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || e?.message || "The demo loader function is missing from the current deployment.";
      toast({ title: "Error loading demo data", description: msg, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!workspace?.id) return;
    setClearing(true);
    try {
      const { res, fn } = await invokeDemoAction("clear", workspace.id);
      const d = res?.data || res || {};
      setDone("cleared");
      toast({ title: "Demo data cleared", description: d.message || `Cleared using ${fn}.` });
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || e?.message || "The demo clear function is missing from the current deployment.";
      toast({ title: "Error clearing demo data", description: msg, variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const toggleCheck = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Hero action card */}
      <div className="surface-elevated rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 bg-accent pointer-events-none" />
        <div className="relative">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-accent/15 border border-accent/25 flex-shrink-0">
              <FlaskConical className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-white">Sample workspace</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 max-w-md">
                Load realistic demo data to explore every BeaconIQ feature end-to-end — no external integrations required.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSeed}
              disabled={seeding || clearing}
              className="gap-1.5 h-9 text-[13px] font-semibold"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {seeding ? "Loading…" : "Load sample data"}
            </Button>
            <Button
              onClick={handleClear}
              disabled={seeding || clearing}
              variant="outline"
              className="gap-1.5 h-9 text-[12px] text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/25"
            >
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {clearing ? "Clearing…" : "Clear demo data"}
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
      </div>

      {/* What's included */}
      <div className="surface rounded-xl p-5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">What's included</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {INCLUDED.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-foreground/90">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Walkthrough checklist */}
      <div className="surface rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-white">Demo walkthrough</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tick each step to test the end-to-end flow</p>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/25">
            {completedCount}/{CHECKLIST.length}
          </span>
        </div>
        <div className="space-y-1.5">
          {CHECKLIST.map((item) => {
            const isDone = checked[item.id];
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isDone ? "bg-success/5 border border-success/20" : "bg-secondary/40 border border-transparent hover:border-border"
                }`}
              >
                <button
                  onClick={() => toggleCheck(item.id)}
                  className={`h-[18px] w-[18px] rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center border transition-colors ${
                    isDone ? "bg-success/20 border-success" : "bg-background border-border hover:border-primary"
                  }`}
                >
                  {isDone && <CheckCircle2 className="h-3 w-3 text-success" />}
                  {!isDone && <span className="text-[9px] font-bold text-muted-foreground">{item.id}</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-medium ${isDone ? "text-success line-through decoration-success/40" : "text-white"}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] mt-0.5 text-muted-foreground">{item.sub}</p>
                </div>
                {item.path && (
                  <Link to={item.path} className="text-[11px] font-medium text-primary hover:underline whitespace-nowrap">
                    Go →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}