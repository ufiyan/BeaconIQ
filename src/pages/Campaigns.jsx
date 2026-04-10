import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Plus, Play, Pause, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import CreateCampaignDialog from "../components/CreateCampaignDialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadCampaigns = async () => {
    const data = await base44.entities.Campaign.list("-created_date", 50);
    setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => { loadCampaigns(); }, []);

  const toggleStatus = async (campaign) => {
    const newStatus = campaign.status === "Active" ? "Paused" : "Active";
    await base44.entities.Campaign.update(campaign.id, { status: newStatus });
    toast({ title: `Campaign ${newStatus === "Active" ? "activated" : "paused"}` });
    loadCampaigns();
  };

  const deleteCampaign = async (id) => {
    if (!confirm("Delete this campaign?")) return;
    await base44.entities.Campaign.delete(id);
    toast({ title: "Campaign deleted" });
    loadCampaigns();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#1E293B", borderTopColor: "#3B82F6" }} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Campaigns" description="Automated follow-up sequences">
        <Button onClick={() => setShowCreate(true)} className="gap-2 text-xs h-8" style={{ background: "#F59E0B", color: "#000", border: "none" }}>
          <Plus className="h-3.5 w-3.5" /> Create Campaign
        </Button>
      </PageHeader>

      {campaigns.length === 0 ? (
        <EmptyState icon={Zap} title="No campaigns yet" description="Create your first automated follow-up campaign">
          <Button onClick={() => setShowCreate(true)} className="text-xs h-8" style={{ background: "#F59E0B", color: "#000", border: "none" }}>Create Campaign</Button>
        </EmptyState>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => {
            const replyRate = campaign.total_sent > 0 ? Math.round((campaign.total_replied / campaign.total_sent) * 100) : 0;
            const stepCount = campaign.steps?.length || 0;
            return (
              <div key={campaign.id} className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs font-medium text-white truncate">{campaign.name}</h3>
                      <StatusBadge status={campaign.status} />
                    </div>
                    {campaign.description && (
                      <p className="text-xs truncate" style={{ color: "#94A3B8" }}>{campaign.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => toggleStatus(campaign)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: "hsl(var(--secondary))", color: "#94A3B8" }}
                    >
                      {campaign.status === "Active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: "hsl(var(--secondary))", color: "#EF4444" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Step progress pill */}
                <span className="self-start text-xs px-2.5 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>
                  {stepCount} step{stepCount !== 1 ? "s" : ""}
                </span>

                {/* Reply rate */}
                <div className="text-center py-3 rounded-lg" style={{ background: "hsl(var(--secondary))" }}>
                  <p className="text-2xl font-medium text-white">{replyRate}%</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>reply rate</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3 text-center" style={{ background: "hsl(var(--secondary))" }}>
                    <p className="text-sm font-medium text-white">{campaign.total_leads || 0}</p>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>leads</p>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: "hsl(var(--secondary))" }}>
                    <p className="text-sm font-medium text-white">{campaign.total_sent || 0}</p>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>sent</p>
                  </div>
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