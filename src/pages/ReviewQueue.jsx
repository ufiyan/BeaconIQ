import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitPullRequest, CheckCircle, XCircle, Loader2, Sparkles, Mail, Clock } from "lucide-react";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import { SkeletonTable } from "../components/SkeletonTable";
import { toast } from "@/components/ui/use-toast";
import moment from "moment";

function confidenceStyle(score) {
  if (score == null) return { bg: "rgba(148,163,184,0.12)", color: "#94A3B8", label: "Unknown", border: "rgba(148,163,184,0.25)" };
  if (score >= 70)  return { bg: "rgba(16,185,129,0.12)",  color: "#34D399", label: `${score}% · High`,   border: "rgba(16,185,129,0.25)" };
  if (score >= 50)  return { bg: "rgba(245,158,11,0.12)",  color: "#FBBF24", label: `${score}% · Medium`, border: "rgba(245,158,11,0.25)" };
  return { bg: "rgba(239,68,68,0.12)", color: "#F87171", label: `${score}% · Low`, border: "rgba(239,68,68,0.25)" };
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
      toast({ title: "Lead created successfully" });
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
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <PageHeader title="Review Queue" description="Loading…" />
        <SkeletonTable rows={4} cols={3} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Review Queue"
        description={`${items.length} email${items.length !== 1 ? 's' : ''} awaiting your review`}
      >
        {highConfCount > 0 && (
          <Button onClick={bulkApprove} disabled={bulkApproving} className="gap-1.5 h-9 text-[13px]">
            {bulkApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Approve {highConfCount} high-confidence
          </Button>
        )}
      </PageHeader>

      {items.length === 0 ? (
        <div className="surface rounded-xl">
          <EmptyState
            icon={GitPullRequest}
            title="Review queue is empty"
            description="Emails flagged by AI for manual review will appear here. High-confidence inbound leads auto-create; ambiguous ones come to you first."
          />
        </div>
      ) : (
        <>
          <div className="surface-elevated rounded-xl p-4 mb-5 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-accent/15 border border-accent/25">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-white">Why are these flagged?</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                AI couldn't confidently classify these emails as qualified inbound leads. Approve to create, or dismiss if they're not leads. Edit any field before approving.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {items.map(item => {
              const fields = getFields(item);
              const cs = confidenceStyle(item.confidence_score);
              return (
                <div key={item.id} className="surface rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-[14px] font-semibold text-white">{item.sender_name || item.sender_email}</p>
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md"
                          style={{ background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cs.color }} />
                          {cs.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <Mail className="h-3 w-3" /> {item.sender_email}
                        <span className="text-muted-foreground/60">·</span>
                        <Clock className="h-3 w-3" /> {item.received_at ? moment(item.received_at).fromNow() : moment(item.created_date).fromNow()}
                      </p>
                      {item.subject && <p className="text-[13px] mt-2 font-medium text-white">Re: {item.subject}</p>}
                      {item.email_body_summary && (
                        <div className="mt-2.5 rounded-lg p-3 bg-accent/5 border-l-2 border-accent/40">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-accent mb-1">AI summary</p>
                          <p className="text-[12px] text-foreground/90 leading-relaxed">{item.email_body_summary}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2 mt-4">Extracted data — edit before approving</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {[
                      { field: "name", label: "Name" },
                      { field: "company", label: "Company" },
                      { field: "title", label: "Title" },
                      { field: "phone", label: "Phone" },
                      { field: "industry", label: "Industry" },
                    ].map(({ field, label }) => (
                      <div key={field}>
                        <Label className="text-[11px] text-muted-foreground">{label}</Label>
                        <Input
                          className="mt-1 h-8 text-[12px]"
                          value={fields[field] || ""}
                          onChange={e => setField(item.id, field, e.target.value)}
                          placeholder={label}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => createLead(item)} className="h-8 text-[12px] gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" /> Approve & create lead
                    </Button>
                    <Button variant="outline" onClick={() => dismissItem(item)} className="h-8 text-[12px] gap-1.5">
                      <XCircle className="h-3.5 w-3.5" /> Dismiss
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}