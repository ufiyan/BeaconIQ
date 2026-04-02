import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import moment from "moment";

export default function EmailLog() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.EmailLog.list("-created_date", 100).then(data => {
      setEmails(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Email Log" description={`${emails.length} emails sent`} />

      {emails.length === 0 ? (
        <EmptyState icon={Mail} title="No emails sent yet" description="Generate and send emails from lead detail pages" />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Recipient</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Subject</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden md:table-cell">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {emails.map(email => (
                  <tr key={email.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-foreground">{email.lead_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{email.lead_email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-foreground truncate max-w-xs">{email.subject}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">
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