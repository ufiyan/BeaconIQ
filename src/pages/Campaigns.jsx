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
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Campaigns" description="Automated follow-up sequences">
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Campaign
        </Button>
      </PageHeader>

      {campaigns.length === 0 ? (
        <EmptyState icon={Zap} title="No campaigns yet" description="Create your first automated follow-up campaign">
          <Button onClick={() => setShowCreate(true)} size="sm">Create Campaign</Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-foreground">{campaign.name}</h3>
                    <StatusBadge status={campaign.status} />
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => toggleStatus(campaign)}
                    className="h-8 w-8"
                  >
                    {campaign.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteCampaign(campaign.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Leads</p>
                  <p className="text-sm font-semibold text-foreground">{campaign.total_leads || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Emails Sent</p>
                  <p className="text-sm font-semibold text-foreground">{campaign.total_sent || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Replies</p>
                  <p className="text-sm font-semibold text-foreground">{campaign.total_replied || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Steps</p>
                  <p className="text-sm font-semibold text-foreground">{campaign.steps?.length || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateCampaignDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={loadCampaigns} />
    </div>
  );
}