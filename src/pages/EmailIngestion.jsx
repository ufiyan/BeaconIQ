import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Mail, Settings, Inbox, CheckCircle2, XCircle } from "lucide-react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import StatsCard from "../components/StatsCard";
import { SkeletonTable } from "../components/SkeletonTable";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import moment from "moment";

const RESULT_STYLES = {
  lead_created:     { bg: "rgba(16,185,129,0.12)",  color: "#34D399", label: "Lead created", dot: "#10B981" },
  duplicate_updated:{ bg: "rgba(59,130,246,0.12)",  color: "#60A5FA", label: "Updated",      dot: "#3B82F6" },
  pending_review:   { bg: "rgba(245,158,11,0.12)",  color: "#FBBF24", label: "Review",       dot: "#F59E0B" },
  skipped:          { bg: "rgba(148,163,184,0.1)",  color: "#94A3B8", label: "Skipped",      dot: "#64748B" },
};

export default function EmailIngestion() {
  const { workspace, isLoading: wsLoading } = useWorkspace();
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { if (!wsLoading) loadData(); }, [workspace, wsLoading]);

  const loadData = async () => {
    if (!workspace?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const wf = { workspace_id: workspace.id };
      const [logData, settingsList] = await Promise.all([
        base44.entities.EmailIngestionLog.filter(wf, "-created_date", 100),
        base44.entities.EmailIngestionSettings.filter(wf, "-created_date", 1).catch(() => []),
      ]);
      setLogs(logData);
      setSettings(settingsList[0] || null);
    } catch (err) {
      toast({ title: "Could not load inbox activity", description: err?.message || "Please refresh.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const syncNow = async () => {
    if (syncing) return;
    if (!settings?.leads_inbox) {
      toast({ title: "Configure your leads inbox in Settings first", variant: "destructive" });
      return;
    }
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('gmailSync', {});
      const err = res?.data?.error;
      if (err) {
        toast({ title: "Sync failed", description: err, variant: "destructive" });
      } else {
        const s = res?.data?.stats;
        toast({ title: "Sync complete", description: `${s?.scanned || 0} scanned · ${s?.created || 0} created · ${s?.reviewed || 0} in review · ${s?.skipped || 0} skipped` });
      }
    } catch (err) {
      toast({ title: "Sync failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSyncing(false);
      loadData();
    }
  };

  if (wsLoading || loading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <PageHeader title="Inbox Activity" description="Loading…" />
        <SkeletonTable rows={6} cols={4} />
      </div>
    );
  }

  const todayLogs = logs.filter(l => moment(l.created_date).isSame(moment(), 'day'));
  const todayCreated = todayLogs.filter(l => l.result === 'lead_created').length;
  const todayReviewed = todayLogs.filter(l => l.result === 'pending_review').length;
  const todaySkipped = todayLogs.filter(l => l.result === 'skipped').length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader title="Inbox Activity" description="Every email BeaconIQ has scanned and processed">
        <Link to="/settings?tab=ingestion">
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-[13px]">
            <Settings className="h-3.5 w-3.5" /> Setup
          </Button>
        </Link>
        <Button size="sm" onClick={syncNow} disabled={syncing || !settings?.leads_inbox} className="gap-1.5 h-9 text-[13px]">
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sync now
        </Button>
      </PageHeader>

      {/* Connection status */}
      <div className="surface-elevated rounded-xl p-4 mb-5">
        {!settings?.leads_inbox ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <XCircle className="h-4 w-4 text-warning" />
              <div>
                <p className="text-[13px] font-medium text-warning">Inbox monitor not configured</p>
                <p className="text-[12px] text-muted-foreground">Connect Gmail and set a leads inbox to start capturing</p>
              </div>
            </div>
            <Link to="/settings?tab=ingestion" className="inline-flex items-center h-8 px-3 rounded-lg text-[12px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
              Set up now
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <div>
                <p className="text-[13px] font-medium text-white">Watching <span className="text-success">{settings.leads_inbox}</span></p>
                <p className="text-[12px] text-muted-foreground">
                  Auto-sync daily at {settings.sync_time || "08:00"}
                  {settings.last_sync_at && ` · last sync ${moment(settings.last_sync_at).fromNow()}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatsCard icon={Inbox} label="Scanned today" value={todayLogs.length} accent="blue" />
        <StatsCard icon={CheckCircle2} label="Leads created" value={todayCreated} accent="green" />
        <StatsCard icon={Mail} label="In review" value={todayReviewed} accent="amber" />
        <StatsCard icon={XCircle} label="Skipped" value={todaySkipped} accent="red" />
      </div>

      {/* Activity log */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-[13px] font-semibold text-white">Activity feed</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Latest inbox events</p>
          </div>
          <span className="text-[11px] text-muted-foreground">{logs.length} total</span>
        </div>
        {logs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={!settings?.leads_inbox ? "No inbox connected" : "No emails processed yet"}
            description={!settings?.leads_inbox
              ? "Connect Gmail in Settings and BeaconIQ will scan your inbox for new leads."
              : "Run a sync or wait for the daily schedule — inbound emails will appear here."}
          >
            {!settings?.leads_inbox ? (
              <Link to="/settings?tab=ingestion" className="inline-flex items-center h-9 px-4 rounded-lg text-[13px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
                Set up inbox monitor
              </Link>
            ) : (
              <Button onClick={syncNow} disabled={syncing} className="h-9 text-[13px] gap-1.5">
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Run sync now
              </Button>
            )}
          </EmptyState>
        ) : (
          <div className="divide-y divide-border">
            {logs.map(log => {
              const rs = RESULT_STYLES[log.result] || RESULT_STYLES.skipped;
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/30 transition-colors">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 min-w-[96px]"
                    style={{ background: rs.bg, color: rs.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: rs.dot }} />
                    {rs.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{log.sender_name || log.sender_email}</p>
                    <p className="text-[12px] text-muted-foreground truncate">{log.subject || log.email_body_summary || "—"}</p>
                  </div>
                  {log.confidence_score != null && (
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 hidden sm:block">{log.confidence_score}% conf</span>
                  )}
                  <span className="text-[11px] text-muted-foreground flex-shrink-0 hidden sm:block">
                    {moment(log.created_date).fromNow()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}