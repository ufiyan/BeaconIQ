import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, Trash2, Loader2, CheckCircle, ChevronDown, ChevronUp, FlaskConical } from "lucide-react";

const CHECKLIST = [
  { id: 1, label: "Load demo data", sub: "Seeds leads, prospects, campaigns, email logs, and more", path: null },
  { id: 2, label: "Open Inbox Activity", sub: "Verify sample ingestion logs appear", path: "/email-ingestion" },
  { id: 3, label: "Open Review Queue", sub: "Approve a pending item", path: "/review-queue" },
  { id: 4, label: "Open Prospect Discovery", sub: "Browse AI-discovered prospects with signals", path: "/prospect-discovery" },
  { id: 5, label: "Save a prospect to Leads", sub: "Convert a high-score prospect", path: "/prospect-discovery" },
  { id: 6, label: "Generate an outreach email", sub: "AI writes a personalized cold email", path: "/prospect-discovery" },
  { id: 7, label: "Check Dashboard metrics", sub: "Confirm pipeline and KPI cards updated", path: "/" },
];

export default function DemoDataPanel() {
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [done, setDone] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [checked, setChecked] = useState({});

  const handleSeed = async () => {
    if (!workspace?.id) return toast({ title: "No workspace found", variant: "destructive" });
    setSeeding(true);
    try {
      const res = await base44.functions.invoke("loadDemoData", { action: "seed", workspace_id: workspace.id });
      if (res.data.already_seeded) {
        toast({ title: "Demo data already loaded", description: "Clear first to re-seed." });
      } else {
        setDone("seeded");
        toast({ title: "Demo workspace loaded!", description: `${res.data.leads_created} leads, ${res.data.prospects_created} prospects, and more.` });
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (e) {
      toast({ title: "Error loading demo data", description: e.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!workspace?.id) return;
    setClearing(true);
    try {
      await base44.functions.invoke("loadDemoData", { action: "clear", workspace_id: workspace.id });
      setDone("cleared");
      toast({ title: "Demo data cleared" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast({ title: "Error clearing demo data", description: e.message, variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const toggleCheck = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid rgba(139,92,246,0.3)" }}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ borderBottom: expanded ? "1px solid rgba(139,92,246,0.2)" : "none" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
            <FlaskConical className="h-4 w-4" style={{ color: "#8B5CF6" }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Demo Workspace</p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>Load sample data to explore every feature</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" style={{ color: "#64748B" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "#64748B" }} />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-4 space-y-5">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSeed}
              disabled={seeding || clearing}
              className="gap-2"
              style={{ background: "rgba(139,92,246,0.2)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.4)" }}
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {seeding ? "Loading Demo Data…" : "Load Sample Workspace"}
            </Button>
            <Button
              onClick={handleClear}
              disabled={seeding || clearing}
              variant="outline"
              className="gap-2 text-xs"
              style={{ color: "#EF4444", borderColor: "rgba(239,68,68,0.3)" }}
            >
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {clearing ? "Clearing…" : "Clear Demo Data"}
            </Button>
          </div>

          {done === "seeded" && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "#10B981" }}>
              <CheckCircle className="h-4 w-4" /> Demo workspace loaded — reloading…
            </div>
          )}

          {/* What's included */}
          <div className="rounded-xl p-4 space-y-1.5" style={{ background: "hsl(var(--background))" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#8B5CF6" }}>What's included</p>
            {[
              "10 realistic leads across all pipeline stages",
              "6 scored intent profiles with urgency signals",
              "5 AI-discovered prospects with buying signals & contacts",
              "3 campaigns (active, paused, completed)",
              "8 email ingestion logs including pending reviews",
              "3 follow-up reminders",
              "Full ICP profile for B2B SaaS targets",
              "Discovery run with realistic results",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full flex-shrink-0" style={{ background: "#8B5CF6" }} />
                <p className="text-xs" style={{ color: "#94A3B8" }}>{item}</p>
              </div>
            ))}
          </div>

          {/* QA Checklist */}
          <div>
            <p className="text-xs font-semibold mb-3" style={{ color: "#64748B" }}>DEMO WALKTHROUGH CHECKLIST</p>
            <div className="space-y-2">
              {CHECKLIST.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: checked[item.id] ? "rgba(16,185,129,0.08)" : "hsl(var(--background))",
                    border: `1px solid ${checked[item.id] ? "rgba(16,185,129,0.3)" : "hsl(var(--border))"}`,
                  }}
                  onClick={() => toggleCheck(item.id)}
                >
                  <div className="h-4 w-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center" style={{
                    background: checked[item.id] ? "rgba(16,185,129,0.2)" : "rgba(59,130,246,0.1)",
                    border: `1px solid ${checked[item.id] ? "#10B981" : "rgba(59,130,246,0.4)"}`,
                  }}>
                    {checked[item.id] && <CheckCircle className="h-3 w-3" style={{ color: "#10B981" }} />}
                    {!checked[item.id] && <span className="text-xs font-bold" style={{ color: "#3B82F6" }}>{item.id}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: checked[item.id] ? "#10B981" : "#CBD5E1", textDecoration: checked[item.id] ? "line-through" : "none" }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs" style={{ color: "#475569" }}>
            Demo data is workspace-scoped and safe to load in any environment. Stack: Base44 managed DB · AI scoring layer · adapter-ready signal engine.
          </p>
        </div>
      )}
    </div>
  );
}