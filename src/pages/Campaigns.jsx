import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Link } from "react-router-dom";
import { Zap, Plus, Play, Pause, Trash2, Users, Mail, MessageSquare, FlaskConical } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import CreateCampaignDialog from "../components/CreateCampaignDialog";
import { SkeletonTable } from "../components/SkeletonTable";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function Campaigns() {
  const { workspace, isLoading: wsLoading } = useWorkspace();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadCampaigns = async () => {
    if (!workspace?.id) { setLoading(false); return; }
    try {
      const data = await base44.entities.Campaign.filter({ workspace_id: workspace.id }, "-created_date", 50);
      setCampaigns(data);
    } catch (err) {
      toast({ title: "Could not load campaigns", description: err?.message || "Please refresh the page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!wsLoading) loadCampaigns(); }, [workspace, wsLoading]);

  const [busyIds, setBusyIds] = useState(() => new Set());
  const setBusy = (id, on) => setBusyIds(prev => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });

  const toggleStatus = async (campaign) => {
    if (busyIds.has(campaign.id)) return;
    const newStatus = campaign.status === "Active" ? "Paused" : "Active";
    setBusy(campaign.id, true);
    // Optimistic update
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
    try {
      await base44.entities.Campaign.update(campaign.id, { status: newStatus });
      toast({ title: `Campaign ${newStatus === "Active" ? "activated" : "paused"}` });
    } catch (err) {
      // Rollback
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: campaign.status } : c));
      toast({ title: "Could not update campaign", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(campaign.id, false);
    }
  };

  const deleteCampaign = async (id) => {
    if (busyIds.has(id)) return;
    if (!confirm("Delete this campaign?")) return;
    const snapshot = campaigns;
    setBusy(id, true);
    // Optimistic removal
    setCampaigns(prev => prev.filter(c => c.id !== id));
    try {
      await base44.entities.Campaign.delete(id);
      toast({ title: "Campaign deleted" });
    } catch (err) {
      setCampaigns(snapshot);
      toast({ title: "Could not delete campaign", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(id, false);
    }
  };

  if (wsLoading || loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <PageHeader title="Campaigns" description="Loading campaigns…" />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Campaigns" description="Automated multi-step follow-up sequences">
        <Button onClick={() => setShowCreate(true)} className="gap-1.5 h-9 text-[13px]">
          <Plus className="h-3.5 w-3.5" /> Create Campaign
        </Button>
      </PageHeader>

      {campaigns.length === 0 ? (
        <div className="surface rounded-xl">
          <EmptyState
            icon={Zap}
            title="No campaigns yet"
            description="Build an automated follow-up sequence that runs in the background — or load sample campaigns to explore how they work."
          >
            <Button onClick={() => setShowCreate(true)} className="h-9 text-[13px] gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create campaign
            </Button>
            <Link
              to="/settings?tab=demo"
              className="inline-flex items-center h-9 px-3.5 rounded-lg text-[13px] font-medium bg-accent/10 text-accent border border-accent/25 hover:bg-accent/15 transition-colors gap-1.5"
            >
              <FlaskConical className="h-3.5 w-3.5" /> Load sample data
            </Link>
          </EmptyState>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => {
            const replyRate = campaign.total_sent > 0 ? Math.round((campaign.total_replied / campaign.total_sent) * 100) : 0;
            const stepCount = campaign.steps?.length || 0;
            return (
              <div key={campaign.id} className="surface rounded-xl p-5 flex flex-col gap-4 hover:border-border/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-[14px] font-semibold text-white truncate">{campaign.name}</h3>
                      <StatusBadge status={campaign.status} />
                    </div>
                    {campaign.description && (
                      <p className="text-[12px] text-muted-foreground line-clamp-2">{campaign.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleStatus(campaign)}
                      disabled={busyIds.has(campaign.id)}
                      title={campaign.status === "Active" ? "Pause" : "Activate"}
                      className="h-8 w-8 rounded-md flex items-center justify-center transition-colors bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-white disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {campaign.status === "Active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      disabled={busyIds.has(campaign.id)}
                      title="Delete"
                      className="h-8 w-8 rounded-md flex items-center justify-center transition-colors bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    <Zap className="h-3 w-3" /> {stepCount} step{stepCount !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <CampaignStat icon={Users} value={campaign.total_leads || 0} label="Leads" />
                  <CampaignStat icon={Mail} value={campaign.total_sent || 0} label="Sent" />
                  <CampaignStat icon={MessageSquare} value={`${replyRate}%`} label="Reply" highlight />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateCampaignDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={loadCampaigns} />
    </div>
  );
}

function CampaignStat({ icon: Icon, value, label, highlight }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${highlight ? "bg-success/10 border border-success/20" : "bg-secondary"}`}>
      <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${highlight ? "text-success" : "text-muted-foreground"}`} />
      <p className={`text-[14px] font-semibold ${highlight ? "text-success" : "text-white"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}