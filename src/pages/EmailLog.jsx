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
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#1E293B", borderTopColor: "#3B82F6" }} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Email Log" description={`${emails.length} emails sent`} />

      {emails.length === 0 ? (
        <EmptyState icon={Mail} title="No emails sent yet" description="Generate and send emails from lead detail pages" />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
                  {["Recipient","Subject","Status","Sent"].map((h, i) => (
                    <th key={h} className={`text-left px-5 py-3 text-xs font-medium ${i > 1 ? "hidden md:table-cell" : ""}`} style={{ color: "#94A3B8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emails.map((email, idx) => (
                  <tr key={email.id} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(30,41,59,0.3)", borderBottom: "0.5px solid hsl(var(--border))" }}>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-medium text-white">{email.lead_name || "Unknown"}</p>
                      <p className="text-xs" style={{ color: "#94A3B8" }}>{email.lead_email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-white truncate max-w-xs">{email.subject}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs hidden md:table-cell" style={{ color: "#94A3B8" }}>
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