import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Mail, MessageSquare, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatsCard from "../components/StatsCard";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [l, c, e] = await Promise.all([
        base44.entities.Lead.list("-created_date", 50),
        base44.entities.Campaign.list("-created_date", 10),
        base44.entities.EmailLog.list("-created_date", 10),
      ]);
      setLeads(l);
      setCampaigns(c);
      setEmails(e);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalLeads = leads.length;
  const contacted = leads.filter(l => l.status !== "New").length;
  const replied = leads.filter(l => ["Replied", "Interested", "Meeting Booked", "Closed"].includes(l.status)).length;
  const totalSent = emails.filter(e => e.status === "Sent" || e.status === "Delivered").length;
  const recentLeads = leads.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Dashboard" 
        description="Your AI-powered revenue automation overview"
      >
        <Link to="/leads">
          <Button className="gap-2">
            <Users className="h-4 w-4" /> View Leads
          </Button>
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard icon={Users} label="Total Leads" value={totalLeads} />
        <StatsCard icon={Mail} label="Emails Sent" value={totalSent} />
        <StatsCard icon={MessageSquare} label="Replies Received" value={replied} />
        <StatsCard icon={TrendingUp} label="Response Rate" value={contacted > 0 ? `${Math.round((replied / contacted) * 100)}%` : "0%"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Leads</h2>
            <Link to="/leads" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <EmptyState icon={Users} title="No leads yet" description="Upload or add your first leads to get started">
              <Link to="/leads">
                <Button size="sm">Add Leads</Button>
              </Link>
            </EmptyState>
          ) : (
            <div className="divide-y divide-border">
              {recentLeads.map(lead => (
                <Link key={lead.id} to={`/leads/${lead.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">{lead.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.company || lead.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={lead.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active Campaigns */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Campaigns</h2>
            <Link to="/campaigns" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {campaigns.length === 0 ? (
            <EmptyState icon={Zap} title="No campaigns" description="Create your first follow-up campaign">
              <Link to="/campaigns">
                <Button size="sm">Create Campaign</Button>
              </Link>
            </EmptyState>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.map(c => (
                <Link key={c.id} to="/campaigns" className="block p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.total_leads || 0} leads · {c.total_sent || 0} sent</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}