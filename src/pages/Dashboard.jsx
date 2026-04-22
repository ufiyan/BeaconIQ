import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Users, MessageSquare, Calendar, Zap, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import DashboardHero from "../components/DashboardHero";
import StatsCard from "../components/StatsCard";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { SkeletonDashboard } from "../components/SkeletonTable";
import GettingStartedBanner from "../components/GettingStartedBanner";
import NextBestAction from "../components/NextBestAction";
import InboxActivityCard from "../components/InboxActivityCard";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const PIPELINE_STAGES = ["New", "Contacted", "Replied", "Interested", "Meeting Booked", "Closed"];
const STAGE_COLORS = {
  "New":            "#60A5FA",
  "Contacted":      "#A78BFA",
  "Replied":        "#34D399",
  "Interested":     "#FBBF24",
  "Meeting Booked": "#10B981",
  "Closed":         "#94A3B8",
};

function initials(name) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function Dashboard() {
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [emails, setEmails] = useState([]);
  const [intentScores, setIntentScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ingestionSettings, setIngestionSettings] = useState(null);
  const [ingestionLogs, setIngestionLogs] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (workspaceLoading || !workspace) return;
    let cancelled = false;
    (async () => {
      const wf = { workspace_id: workspace.id };
      try {
        const [l, c, e, s, isl, ill, rem, rev] = await Promise.all([
          base44.entities.Lead.filter(wf, "-created_date", 100),
          base44.entities.Campaign.filter(wf, "-created_date", 10),
          base44.entities.EmailLog.filter(wf, "-created_date", 20),
          base44.entities.IntentScore.filter(wf, "-intent_score", 50).catch(() => []),
          base44.entities.EmailIngestionSettings.filter(wf, "-created_date", 1).catch(() => []),
          base44.entities.EmailIngestionLog.filter(wf, "-created_date", 10).catch(() => []),
          base44.entities.FollowUpReminder.filter({ ...wf, status: "pending" }, "-due_date", 20).catch(() => []),
          base44.entities.EmailIngestionLog.filter({ ...wf, result: "pending_review" }, "-created_date", 200).catch(() => []),
        ]);
        if (cancelled) return;
        setLeads(l);
        setCampaigns(c);
        setEmails(e);
        setIntentScores(s);
        setIngestionSettings(isl[0] || null);
        setIngestionLogs(ill);
        setReminders(rem);
        setReviewCount(rev.length);
      } catch (err) {
        if (!cancelled) toast({ title: "Could not load dashboard", description: err?.message || "Please refresh.", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [workspace, workspaceLoading, toast]);

  if (workspaceLoading || loading) return <SkeletonDashboard />;

  const totalLeads = leads.length;
  const totalSent = emails.filter(e => e.status === "Sent" || e.status === "Delivered").length;
  const replied = leads.filter(l => ["Replied", "Interested", "Meeting Booked", "Closed"].includes(l.status)).length;
  const meetings = leads.filter(l => l.status === "Meeting Booked").length;
  const contacted = leads.filter(l => l.status !== "New").length;
  const recentLeads = leads.slice(0, 6);

  const stageCounts = {};
  PIPELINE_STAGES.forEach(s => { stageCounts[s] = leads.filter(l => l.status === s).length; });

  const scoreMap = {};
  intentScores.forEach(s => { scoreMap[s.lead_id] = s.intent_score; });
  const highIntentLeads = [...leads]
    .filter(l => (scoreMap[l.id] ?? -1) >= 70)
    .sort((a, b) => (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0));
  const highIntentCount = highIntentLeads.length;
  const replyRatePct = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

  const isEmpty = totalLeads === 0;
  const setupIncomplete = !(workspace?.gmail_connected && ingestionSettings?.leads_inbox && leads.length > 0);
  const maxStage = Math.max(1, ...Object.values(stageCounts));

  const handleSync = async () => {
    if (!ingestionSettings?.leads_inbox || syncing) return;
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('gmailSync', {});
      const stats = res?.data?.stats;
      // Targeted refresh — only ingestion-related state
      const wf = { workspace_id: workspace.id };
      const [isl, ill] = await Promise.all([
        base44.entities.EmailIngestionSettings.filter(wf, '-created_date', 1).catch(() => []),
        base44.entities.EmailIngestionLog.filter(wf, '-created_date', 10).catch(() => []),
      ]);
      setIngestionSettings(isl[0] || null);
      setIngestionLogs(ill);
      toast({ title: "Sync complete", description: stats ? `${stats.created || 0} new leads · ${stats.skipped || 0} skipped` : "Sync finished" });
    } catch (err) {
      toast({ title: "Sync failed", description: err?.message || "Please try again in a moment.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <DashboardHero userName={workspace?.name} isEmpty={isEmpty} />

      {setupIncomplete && (
        <GettingStartedBanner workspace={workspace} ingestionSettings={ingestionSettings} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard icon={Users} label="Total Leads" value={totalLeads} accent="blue" sub={contacted > 0 ? `${contacted} contacted` : null} />
        <StatsCard icon={Sparkles} label="High Intent" value={highIntentCount} accent="purple" sub="Score 70+" />
        <StatsCard icon={MessageSquare} label="Reply Rate" value={`${replyRatePct}%`} accent="green" sub={`${replied} of ${contacted}`} />
        <StatsCard icon={Calendar} label="Meetings" value={meetings} accent="amber" sub={totalSent > 0 ? `${totalSent} emails sent` : null} />
      </div>

      {/* Pipeline */}
      <div className="surface rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[13px] font-semibold text-white">Pipeline overview</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Lead distribution across stages</p>
          </div>
          <Link to="/leads" className="text-[12px] font-medium text-primary hover:underline">View leads →</Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {PIPELINE_STAGES.map(stage => {
            const count = stageCounts[stage];
            const heightPct = (count / maxStage) * 100;
            return (
              <div key={stage} className="flex flex-col gap-2">
                <span className="text-[22px] font-semibold text-white leading-none tracking-tight">{count}</span>
                <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${heightPct}%`, background: STAGE_COLORS[stage] }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground leading-tight">{stage}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next best action + Inbox activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <NextBestAction
            highIntentLeads={highIntentLeads}
            reminders={reminders}
            reviewCount={reviewCount}
            scoreMap={scoreMap}
          />
        </div>
        <InboxActivityCard
          ingestionSettings={ingestionSettings}
          logs={ingestionLogs}
          syncing={syncing}
          onSync={handleSync}
          gmailConnected={!!workspace?.gmail_connected}
        />
      </div>

      {/* Recent leads + Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 surface rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-[13px] font-semibold text-white">Recent leads</p>
            <Link to="/leads" className="text-[12px] font-medium text-primary hover:underline">View all →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <EmptyState icon={Users} title="No leads yet" description="Connect Gmail or import a CSV to get started" compact>
              <Link to="/leads" className="inline-flex items-center h-8 px-3 rounded-lg text-[12px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground">Go to Leads</Link>
            </EmptyState>
          ) : (
            <div className="divide-y divide-border">
              {recentLeads.map(lead => (
                <Link key={lead.id} to={`/leads/${lead.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      {initials(lead.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{lead.name}</p>
                      <p className="text-[12px] text-muted-foreground truncate">{lead.company || lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <StatusBadge status={lead.status} />
                    <span className="text-[11px] text-muted-foreground hidden sm:block">{moment(lead.created_date).fromNow(true)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="surface rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-[13px] font-semibold text-white">Active campaigns</p>
            <Link to="/campaigns" className="text-[12px] font-medium text-primary hover:underline">View all →</Link>
          </div>
          {campaigns.length === 0 ? (
            <EmptyState icon={Zap} title="No campaigns" description="Build an automated follow-up sequence" compact>
              <Link to="/campaigns" className="inline-flex items-center h-8 px-3 rounded-lg text-[12px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground">Create campaign</Link>
            </EmptyState>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.slice(0, 4).map(c => (
                <Link key={c.id} to="/campaigns" className="block px-5 py-3 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[13px] font-medium text-white truncate">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{c.total_leads || 0} leads · {c.total_sent || 0} sent · {c.total_replied || 0} replies</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}