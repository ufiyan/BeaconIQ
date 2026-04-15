import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import IntentScoreBadge from "../components/IntentScoreBadge";
import { Users, Mail, MessageSquare, Calendar, ArrowRight, Zap, RefreshCw, Loader2, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import StatsCard from "../components/StatsCard";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { SkeletonDashboard } from "../components/SkeletonTable";
import GettingStartedBanner from "../components/GettingStartedBanner";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const PIPELINE_STAGES = ["New", "Contacted", "Replied", "Interested", "Meeting Booked", "Closed"];
const STAGE_COLORS = {
  "New": "#3B82F6",
  "Contacted": "#818CF8",
  "Replied": "#2DD4BF",
  "Interested": "#F59E0B",
  "Meeting Booked": "#10B981",
  "Closed": "#EF4444",
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

  useEffect(() => {
    if (workspaceLoading || !workspace) return;
    async function load() {
      const user = await base44.auth.me();
      const wf = { workspace_id: workspace.id };
      const [l, c, e, s, isl, ill, rem] = await Promise.all([
        base44.entities.Lead.filter(wf, "-created_date", 100),
        base44.entities.Campaign.filter(wf, "-created_date", 10),
        base44.entities.EmailLog.filter(wf, "-created_date", 20),
        base44.entities.IntentScore.filter({ created_by: user.email }, "-intent_score", 20),
        base44.entities.EmailIngestionSettings.filter({ created_by: user.email }, "-created_date", 1).catch(() => []),
        base44.entities.EmailIngestionLog.filter(wf, "-created_date", 5).catch(() => []),
        base44.entities.FollowUpReminder.filter({ workspace_id: workspace.id, status: "pending" }, "-due_date", 20).catch(() => []),
      ]);
      setLeads(l);
      setCampaigns(c);
      setEmails(e);
      setIntentScores(s);
      setIngestionSettings(isl[0] || null);
      setIngestionLogs(ill);
      setReminders(rem);
      setLoading(false);
    }
    load();
  }, [workspace, workspaceLoading]);

  if (workspaceLoading || loading) {
    return <SkeletonDashboard />;
  }

  const totalLeads = leads.length;
  const totalSent = emails.filter(e => e.status === "Sent" || e.status === "Delivered").length;
  const replied = leads.filter(l => ["Replied", "Interested", "Meeting Booked", "Closed"].includes(l.status)).length;
  const meetings = leads.filter(l => l.status === "Meeting Booked").length;
  const contacted = leads.filter(l => l.status !== "New").length;
  const recentLeads = leads.slice(0, 7);

  const stageCounts = {};
  PIPELINE_STAGES.forEach(s => { stageCounts[s] = leads.filter(l => l.status === s).length; });

  // Top high-intent leads
  const scoreMap = {};
  intentScores.forEach(s => { scoreMap[s.lead_id] = s.intent_score; });
  const highIntentLeads = [...leads]
    .filter(l => (scoreMap[l.id] ?? -1) >= 70)
    .sort((a, b) => (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0))
    .slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-medium text-white" style={{ fontSize: "18px" }}>Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: "#10B981" }} />
          <span className="text-xs" style={{ color: "#94A3B8" }}>BeaconIQ synced · {moment().format("h:mm A")}</span>
        </div>
      </div>

      {/* Getting Started Banner — hide once fully configured AND has leads */}
      {!(workspace?.gmail_connected && ingestionSettings?.leads_inbox && leads.length > 0) && (
        <GettingStartedBanner workspace={workspace} ingestionSettings={ingestionSettings} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard icon={Users} label="Total Leads" value={totalLeads} accentColor="#3B82F6" />
        <StatsCard icon={Mail} label="Emails Sent" value={totalSent} accentColor="#2DD4BF" />
        <StatsCard icon={MessageSquare} label="Reply Rate" value={contacted > 0 ? `${Math.round((replied / contacted) * 100)}%` : "0%"} accentColor="#F59E0B" />
        <StatsCard icon={Calendar} label="Meetings Booked" value={meetings} accentColor="#10B981" />
      </div>

      {/* Pipeline */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
        <p className="text-xs font-medium text-white mb-4">Lead Pipeline</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map(stage => (
            <div key={stage} className="flex flex-col items-center rounded-lg p-3" style={{ background: "hsl(var(--secondary))" }}>
              <span className="text-xl font-medium text-white">{stageCounts[stage]}</span>
              <span className="text-xs mt-1 text-center" style={{ color: "#94A3B8" }}>{stage}</span>
              <div className="mt-2 h-1 w-full rounded-full" style={{ background: STAGE_COLORS[stage], opacity: 0.7 }} />
            </div>
          ))}
        </div>
      </div>

      {/* High Intent Leads */}
      {highIntentLeads.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-5" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "#F59E0B" }} />
            <p className="text-xs font-medium text-white">High Intent Leads</p>
            <span className="text-xs ml-auto" style={{ color: "#94A3B8" }}>Top {highIntentLeads.length} by IQ Score</span>
          </div>
          {highIntentLeads.map(lead => (
            <div key={lead.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-3 min-w-0">
                <IntentScoreBadge score={scoreMap[lead.id]} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{lead.name}</p>
                  <p className="text-xs truncate" style={{ color: "#94A3B8" }}>{lead.company || lead.email}</p>
                </div>
              </div>
              <Link to={`/leads/${lead.id}`}>
                <button className="text-xs px-3 py-1 rounded-lg transition-colors" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>Generate Email →</button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Follow-up Due */}
      {reminders.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-5" style={{ background: "hsl(var(--card))", border: "0.5px solid rgba(245,158,11,0.4)" }}>
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
            <Clock className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />
            <p className="text-xs font-medium text-white">Follow-up Due</p>
            <span className="text-xs ml-auto" style={{ color: "#94A3B8" }}>{reminders.length} lead{reminders.length !== 1 ? 's' : ''}</span>
          </div>
          {[...reminders].sort((a, b) => {
            const order = { stale_interested: 0, no_reply: 1, no_contact: 2 };
            return (order[a.reminder_type] ?? 3) - (order[b.reminder_type] ?? 3);
          }).slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{
                  background: r.reminder_type === 'stale_interested' ? 'rgba(239,68,68,0.15)' : r.reminder_type === 'no_reply' ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.1)',
                  color: r.reminder_type === 'stale_interested' ? '#EF4444' : r.reminder_type === 'no_reply' ? '#F59E0B' : '#94A3B8',
                }}>
                  {r.reminder_type === 'stale_interested' ? 'Stale' : r.reminder_type === 'no_reply' ? 'No Reply' : 'Not Contacted'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{r.lead_name}</p>
                  <p className="text-xs truncate" style={{ color: "#94A3B8" }}>{r.lead_company || ''} · {r.days_since_contact}d ago</p>
                </div>
              </div>
              <Link to={`/leads/${r.lead_id}`}>
                <button className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                  <Sparkles className="h-3 w-3" /> Follow-up
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Two column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Leads */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
            <p className="text-xs font-medium text-white">Recent Leads</p>
            <Link to="/leads" className="flex items-center gap-1 text-xs" style={{ color: "#3B82F6" }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <EmptyState icon={Users} title="No leads yet" description="Import a CSV or use Email Ingestion">
              <Link to="/leads" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3" style={{ background: "#F59E0B", color: "#000" }}>Import leads</Link>
            </EmptyState>
          ) : (
            <div>
              {recentLeads.map(lead => (
                <Link key={lead.id} to={`/leads/${lead.id}`} className="flex items-center justify-between px-5 py-3 transition-colors" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}
                  onMouseEnter={e => e.currentTarget.style.background = "hsl(var(--secondary))"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium" style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>
                      {initials(lead.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{lead.name}</p>
                      <p className="text-xs truncate" style={{ color: "#94A3B8" }}>{lead.company || lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <StatusBadge status={lead.status} />
                    <span className="text-xs hidden sm:block" style={{ color: "#94A3B8" }}>{moment(lead.created_date).fromNow()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Ingestion card */}
          <div className="rounded-xl p-5" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-white">Lead Capture — Gmail</p>
              <button
                onClick={async () => {
                  if (!ingestionSettings?.leads_inbox) return;
                  setSyncing(true);
                  toast({ title: "Sync started", description: "Checking Gmail for new leads…" });
                  try {
                    const user = await base44.auth.me();
                    const uf = { created_by: user.email };
                    const res = await base44.functions.invoke('gmailSync', {});
                    const stats = res?.data?.stats;
                    const [isl, ill] = await Promise.all([
                      base44.entities.EmailIngestionSettings.filter(uf, '-created_date', 1).catch(() => []),
                      base44.entities.EmailIngestionLog.filter(uf, '-created_date', 5).catch(() => []),
                    ]);
                    setIngestionSettings(isl[0] || null);
                    setIngestionLogs(ill);
                    toast({
                      title: "Sync complete",
                      description: stats ? `${stats.created} new lead${stats.created !== 1 ? 's' : ''} found, ${stats.skipped} skipped` : "Sync finished",
                    });
                  } catch (err) {
                    toast({ title: "Sync failed", description: err.message || "Unknown error", variant: "destructive" });
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing || !ingestionSettings?.leads_inbox}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}
              >
                {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Check for new leads now
              </button>
            </div>

            {ingestionSettings?.leads_inbox ? (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#10B981" }} />
                  <span className="text-xs truncate" style={{ color: "#10B981" }}>{ingestionSettings.leads_inbox}</span>
                </div>
                {ingestionSettings.last_sync_at && (
                  <p className="text-xs" style={{ color: "#94A3B8" }}>Last sync: {moment(ingestionSettings.last_sync_at).fromNow()}</p>
                )}
              </div>
            ) : (
              <div className="mb-3">
                <p className="text-xs" style={{ color: "#94A3B8" }}>Not configured</p>
                <Link to="/settings?tab=ingestion" className="text-xs" style={{ color: "#3B82F6" }}>Set up Inbox Monitor →</Link>
              </div>
            )}

            {ingestionLogs.length > 0 && (
              <div className="space-y-1.5 mt-3">
                {ingestionLogs.map(log => {
                  const badge = log.result === 'lead_created'
                    ? { bg: "rgba(16,185,129,0.15)", color: "#10B981", label: "Lead" }
                    : log.result === 'pending_review'
                    ? { bg: "rgba(245,158,11,0.15)", color: "#F59E0B", label: "Review" }
                    : { bg: "rgba(148,163,184,0.1)", color: "#94A3B8", label: "Skip" };
                  return (
                    <div key={log.id} className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                      <span className="text-xs truncate" style={{ color: "#94A3B8" }}>{log.sender_name || log.sender_email}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Campaigns */}
          <div className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
              <p className="text-xs font-medium text-white">Active Campaigns</p>
              <Link to="/campaigns" className="text-xs" style={{ color: "#3B82F6" }}>View all</Link>
            </div>
            {campaigns.length === 0 ? (
              <EmptyState icon={Zap} title="No campaigns" description="Create your first campaign">
                <Link to="/campaigns" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3" style={{ background: "#F59E0B", color: "#000" }}>Create Campaign</Link>
              </EmptyState>
            ) : (
              <div>
                {campaigns.slice(0, 4).map(c => (
                  <Link key={c.id} to="/campaigns" className="block px-5 py-3 transition-colors" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}
                    onMouseEnter={e => e.currentTarget.style.background = "hsl(var(--secondary))"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-medium text-white truncate">{c.name}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>{c.total_leads || 0} leads · {c.total_sent || 0} sent</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}