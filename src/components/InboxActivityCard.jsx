import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Inbox, CheckCircle2, XCircle } from "lucide-react";
import moment from "moment";

const RESULT_COLOR = {
  lead_created:      "#34D399",
  duplicate_updated: "#60A5FA",
  pending_review:    "#FBBF24",
  skipped:           "#64748B",
};

export default function InboxActivityCard({ ingestionSettings, logs = [], syncing, onSync, gmailConnected }) {
  const isConfigured = gmailConnected && ingestionSettings?.leads_inbox;
  const recent = logs.slice(0, 4);

  return (
    <div className="surface rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Inbox className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <p className="text-[13px] font-semibold text-white truncate">Inbox activity</p>
        </div>
        {isConfigured && (
          <Button size="sm" variant="outline" onClick={onSync} disabled={syncing} className="h-7 text-[11px] gap-1 px-2">
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Sync
          </Button>
        )}
      </div>

      {!isConfigured ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 text-center">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-3 bg-warning/10 border border-warning/20">
            <XCircle className="h-4 w-4 text-warning" />
          </div>
          <p className="text-[12px] font-medium text-white">Inbox not configured</p>
          <p className="text-[11px] text-muted-foreground mt-1 mb-3">Connect Gmail to auto-capture leads</p>
          <Link
            to="/settings?tab=ingestion"
            className="inline-flex items-center h-8 px-3 rounded-lg text-[12px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Set up now
          </Link>
        </div>
      ) : (
        <>
          <div className="px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
              <p className="text-[12px] text-white truncate">
                <span className="text-success">{ingestionSettings.leads_inbox}</span>
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {ingestionSettings.last_sync_at ? `Last sync ${moment(ingestionSettings.last_sync_at).fromNow()}` : "No sync yet"}
            </p>
          </div>

          {recent.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-5 py-6">
              <p className="text-[12px] text-muted-foreground text-center">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-border flex-1">
              {recent.map(log => (
                <div key={log.id} className="flex items-center gap-2.5 px-5 py-2.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ background: RESULT_COLOR[log.result] || RESULT_COLOR.skipped }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-white truncate">{log.sender_name || log.sender_email}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{log.subject || log.email_body_summary || "—"}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {moment(log.created_date).fromNow(true)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/email-ingestion"
            className="px-5 py-3 border-t border-border text-[12px] font-medium text-primary hover:bg-secondary/40 transition-colors"
          >
            View all activity →
          </Link>
        </>
      )}
    </div>
  );
}