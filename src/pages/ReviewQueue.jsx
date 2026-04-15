import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitPullRequest, CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import { toast } from "@/components/ui/use-toast";
import moment from "moment";

function confidenceStyle(score) {
  if (!score && score !== 0) return { bg: "rgba(148,163,184,0.15)", color: "#94A3B8" };
  if (score >= 70) return { bg: "rgba(16,185,129,0.15)", color: "#10B981" };
  if (score >= 50) return { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" };
  return { bg: "rgba(239,68,68,0.15)", color: "#EF4444" };
}

export default function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [editing, setEditing] = useState({});

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const data = await base44.entities.EmailIngestionLog.filter({ created_by: user.email, result: "pending_review" }, "-created_date", 100);
    setItems(data);
    setLoading(false);
  };

  const getFields = (item) => ({
    name: item.extracted_name || item.sender_name || "",
    company: item.extracted_company || "",
    title: item.extracted_title || "",
    phone: "",
    industry: item.extracted_industry || "",
    ...(editing[item.id] || {}),
  });

  const setField = (itemId, field, value) => {
    setEditing(prev => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), [field]: value } }));
  };

  const createLead = async (item) => {
    const user = await base44.auth.me();
    const fields = getFields(item);
    const email = item.extracted_email || item.sender_email;
    const existing = await base44.entities.Lead.filter({ email, created_by: user.email });
    let leadId;
    if (existing.length > 0) {
      const lead = existing[0];
      const note = item.email_body_summary || item.subject || "";
      await base44.entities.Lead.update(lead.id, {
        notes: lead.notes ? `${lead.notes}\n\n${note}` : note,
      });
      leadId = lead.id;
      await base44.entities.EmailIngestionLog.update(item.id, { result: "duplicate_updated", lead_id: leadId });
      toast({ title: "Existing lead updated with new note" });
    } else {
      const newLead = await base44.entities.Lead.create({
        name: fields.name || email,
        email, company: fields.company, title: fields.title,
        phone: fields.phone, industry: fields.industry,
        source: "Gmail Ingestion", status: "New", priority: "Medium",
        notes: item.email_body_summary || "",
      });
      leadId = newLead.id;
      await base44.entities.EmailIngestionLog.update(item.id, { result: "lead_created", lead_id: leadId });
      toast({ title: "Lead created successfully!" });
    }
    loadItems();
  };

  const dismissItem = async (item) => {
    await base44.entities.EmailIngestionLog.update(item.id, { result: "skipped", skip_reason: "manually dismissed" });
    toast({ title: "Item dismissed" });
    loadItems();
  };

  const bulkApprove = async () => {
    setBulkApproving(true);
    const highConf = items.filter(i => (i.confidence_score || 0) >= 70);
    for (const item of highConf) {
      await createLead(item).catch(() => {});
    }
    toast({ title: `${highConf.length} leads created from high-confidence emails` });
    setBulkApproving(false);
  };

  const highConfCount = items.filter(i => (i.confidence_score || 0) >= 70).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#1E293B", borderTopColor: "#3B82F6" }} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Review Queue"
        description={`${items.length} email${items.length !== 1 ? 's' : ''} awaiting review`}
      >
        {highConfCount > 0 && (
          <Button onClick={bulkApprove} disabled={bulkApproving} size="sm" className="gap-2">
            {bulkApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Bulk approve {highConfCount} high-confidence
          </Button>
        )}
      </PageHeader>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={GitPullRequest} title="Review Queue is empty" description="Emails flagged for review will appear here after the next sync" />
        </div>
      ) : (
        <div className="space-y-4 mt-6">
          {items.map(item => {
            const fields = getFields(item);
            const cs = confidenceStyle(item.confidence_score);
            return (
              <div key={item.id} className="rounded-xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-white">{item.sender_name || item.sender_email}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cs.bg, color: cs.color }}>
                        AI Confidence: {item.confidence_score ?? "—"}%
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>
                      {item.sender_email} · {item.received_at ? moment(item.received_at).fromNow() : moment(item.created_date).fromNow()}
                    </p>
                    {item.subject && <p className="text-xs mt-1 font-medium text-white">Subject: {item.subject}</p>}
                    {item.email_body_summary && <p className="text-xs mt-1 italic" style={{ color: "#94A3B8" }}>{item.email_body_summary}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { field: "name", label: "Name" },
                    { field: "company", label: "Company" },
                    { field: "title", label: "Title" },
                    { field: "phone", label: "Phone" },
                    { field: "industry", label: "Industry" },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <Label className="text-xs" style={{ color: "#94A3B8" }}>{label}</Label>
                      <Input
                        className="mt-1 h-8 text-xs"
                        value={fields[field] || ""}
                        onChange={e => setField(item.id, field, e.target.value)}
                        placeholder={label}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => createLead(item)} className="gap-1.5" style={{ background: "#10B981", border: "none", color: "#fff" }}>
                    <CheckCircle className="h-3.5 w-3.5" /> Create Lead
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => dismissItem(item)} className="gap-1.5">
                    <XCircle className="h-3.5 w-3.5" /> Dismiss
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}