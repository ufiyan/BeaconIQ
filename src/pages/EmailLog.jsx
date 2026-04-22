import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Mail } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { SkeletonTable } from "../components/SkeletonTable";
import moment from "moment";

export default function EmailLog() {
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceLoading || !workspace) return;
    base44.entities.EmailLog.filter({ workspace_id: workspace.id }, "-created_date", 100).then(data => {
      setEmails(data);
      setLoading(false);
    });
  }, [workspace, workspaceLoading]);

  if (workspaceLoading || loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <PageHeader title="Sent Emails" description="Loading…" />
        <SkeletonTable rows={6} cols={4} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Sent Emails" description={`${emails.length} email${emails.length !== 1 ? 's' : ''} sent`} />

      {emails.length === 0 ? (
        <div className="surface rounded-xl">
          <EmptyState icon={Mail} title="No emails sent yet" description="Generate personalized AI emails from any lead detail page — they'll log here automatically." />
        </div>
      ) : (
        <div className="surface rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recipient</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Status</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Sent</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr key={email.id} className="border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-medium text-white truncate">{email.lead_name || "Unknown"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{email.lead_email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[13px] text-white truncate max-w-xs">{email.subject}</p>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground hidden md:table-cell">
                      {email.sent_at ? moment(email.sent_at).format("MMM D, h:mm A") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}