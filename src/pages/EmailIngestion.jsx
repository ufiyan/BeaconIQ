import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Mail, Settings } from "lucide-react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import moment from "moment";

const RESULT_STYLES = {
  lead_created:     { bg: "rgba(16,185,129,0.15)",  color: "#10B981", label: "Lead" },
  duplicate_updated:{ bg: "rgba(59,130,246,0.15)",  color: "#3B82F6", label: "Updated" },
  pending_review:   { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B", label: "Review" },
  skipped:          { bg: "rgba(148,163,184,0.1)",   color: "#94A3B8", label: "Skipped" },
};

export default function EmailIngestion() {
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const uf = { created_by: user.email };
    const [logData, settingsList] = await Promise.all([
      base44.entities.EmailIngestionLog.filter(uf, "-created_date", 100),
      base44.entities.EmailIngestionSettings.filter(uf, "-created_date", 1).catch(() => []),
    ]);
    setLogs(logData);
    setSettings(settingsList[0] || null);
    setLoading(false);
  };

  const syncNow = async () => {
    if (!settings?.leads_inbox) {
      toast({ title: "Configure your leads inbox in Settings first", variant: "destructive" });
      return;
    }
    setSyncing(true);
    const res = await base44.functions.invoke('gmailSync', {}).catch(e => ({ data: { error: e.message } }));
    if (res?.data?.error) {
      toast({ title: "Sync failed: " + res.data.error, variant: "destructive" });
    } else {
      const s = res?.data?.stats;
      toast({ title: `Sync complete — ${s?.scanned || 0} scanned · ${s?.created || 0} created · ${s?.reviewed || 0} reviewed · ${s?.skipped || 0} skipped` });
    }
    setSyncing(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#1E293B", borderTopColor: "#3B82F6" }} />
      </div>
    );
  }

  const lastStats = settings?.last_sync_stats ? (() => { try { return JSON.parse(settings.last_sync_stats); } catch (_) { return null; } })() : null;
  const todayLogs = logs.filter(l => moment(l.created_date).isSame(moment(), 'day'));
  const todayScanned = todayLogs.length;
  const todayCreated = todayLogs.filter(l => l.result === 'lead_created').length;
  const todayReviewed = todayLogs.filter(l => l.result === 'pending_review').length;
  const todaySkipped = todayLogs.filter(l => l.result === 'skipped').length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader title="Email Sync" description="Automated Gmail ingestion history">
        <div className="flex items-center gap-2">
          <Link to="/settings?tab=ingestion">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Setup
            </Button>
          </Link>
          <Button size="sm" onClick={syncNow} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync Now
          </Button>
        </div>
      </PageHeader>

      {!settings?.leads_inbox ? (
        <div className="rounded-xl p-5 mb-6 border" style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)" }}>
          <p className="text-sm font-medium" style={{ color: "#F59E0B" }}>⚠ Email ingestion not configured</p>
          <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
            Set up your Gmail connection and leads inbox address in{" "}
            <Link to="/settings?tab=ingestion" className="underline" style={{ color: "#3B82F6" }}>Settings → Email Ingestion</Link>
          </p>
        </div>
      ) : (
        <div className="rounded-xl p-4 mb-6 border" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: "#10B981" }} />
            <span className="text-sm text-white">Watching <strong>{settings.leads_inbox}</strong> · syncing daily at {settings.sync_time}</span>
          </div>
          {settings.last_sync_at && (
            <p className="text-xs mt-1 ml-4" style={{ color: "#94A3B8" }}>Last sync: {moment(settings.last_sync_at).fromNow()}</p>
          )}
        </div>
      )}

      {/* Today's stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Scanned today", value: todayScanned },
          { label: "Created today", value: todayCreated, color: "#10B981" },
          { label: "In review", value: todayReviewed, color: "#F59E0B" },
          { label: "Skipped today", value: todaySkipped, color: "#94A3B8" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
            <p className="text-2xl font-bold" style={{ color: color || "#fff" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
          <p className="text-xs font-medium text-white">Ingestion Log</p>
          <span className="text-xs" style={{ color: "#94A3B8" }}>{logs.length} total</span>
        </div>
        {logs.length === 0 ? (
          <EmptyState icon={Mail} title="No emails processed yet" description="Run a sync or wait for the daily schedule" />
        ) : (
          <div>
            {logs.map(log => {
              const rs = RESULT_STYLES[log.result] || RESULT_STYLES.skipped;
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: rs.bg, color: rs.color }}>
                    {rs.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{log.sender_name || log.sender_email}</p>
                    <p className="text-xs truncate" style={{ color: "#94A3B8" }}>{log.subject || log.email_body_summary || "—"}</p>
                  </div>
                  {log.confidence_score != null && (
                    <span className="text-xs flex-shrink-0" style={{ color: "#94A3B8" }}>{log.confidence_score}%</span>
                  )}
                  <span className="text-xs flex-shrink-0" style={{ color: "#94A3B8" }}>
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