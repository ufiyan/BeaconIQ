import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
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
  const { workspace, isLoading: wsLoading } = useWorkspace();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [editing, setEditing] = useState({});
  const [processingIds, setProcessingIds] = useState(() => new Set());

  useEffect(() => { if (!wsLoading) loadItems(); }, [workspace, wsLoading]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const filter = workspace?.id
        ? { workspace_id: workspace.id, result: "pending_review" }
        : { result: "pending_review" };
      const data = await base44.entities.EmailIngestionLog.filter(filter, "-created_date", 100);
      setItems(data);
    } catch (err) {
      toast({ title: "Could not load review queue", description: err?.message || "Please refresh.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const markProcessing = (id, on) => {
    setProcessingIds(prev => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
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

  // Internal worker — does NOT toast or reload. Used by single + bulk flows.
  const processApproval = async (item) => {
    const fields = getFields(item);
    const rawEmail = item.extracted_email || item.sender_email;
    const email = (rawEmail || "").trim().toLowerCase();
    if (!email) throw new Error("Missing sender email");

    // Re-check latest status to guard against double-approval
    const latestLog = await base44.entities.EmailIngestionLog
      .filter({ id: item.id }, "-created_date", 1)
      .catch(() => [item]);
    if (latestLog[0]?.result !== "pending_review") {
      return { skipped: true, reason: "already-processed" };
    }

    const dupFilter = workspace?.id
      ? { workspace_id: workspace.id, email }
      : { email };
    const existing = await base44.entities.Lead.filter(dupFilter, "-created_date", 1).catch(() => []);

    if (existing.length > 0) {
      const lead = existing[0];
      const note = item.email_body_summary || item.subject || "";
      if (note) {
        await base44.entities.Lead.update(lead.id, {
          notes: lead.notes ? `${lead.notes}\n\n${note}` : note,
        });
      }
      await base44.entities.EmailIngestionLog.update(item.id, {
        result: "duplicate_updated",
        lead_id: lead.id,
      });
      return { updated: true, leadId: lead.id };
    }

    const newLead = await base44.entities.Lead.create({
      workspace_id: workspace?.id,
      name: fields.name?.trim() || email,
      email,
      company: fields.company || "",
      title: fields.title || "",
      phone: fields.phone || "",
      industry: fields.industry || "",
      source: "Email Ingestion",
      status: "New",
      priority: "Medium",
      notes: item.email_body_summary || "",
    });
    await base44.entities.EmailIngestionLog.update(item.id, {
      result: "lead_created",
      lead_id: newLead.id,
    });
    return { created: true, leadId: newLead.id };
  };

  const createLead = async (item) => {
    if (processingIds.has(item.id)) return;
    markProcessing(item.id, true);
    // Optimistic: remove from queue immediately
    setItems(prev => prev.filter(i => i.id !== item.id));
    try {
      const res = await processApproval(item);
      if (res?.skipped) toast({ title: "Already processed", description: "This item was handled already." });
      else if (res?.updated) toast({ title: "Existing lead updated with new note" });
      else toast({ title: "Lead created successfully" });
    } catch (err) {
      // Rollback the optimistic remove on failure
      setItems(prev => (prev.some(i => i.id === item.id) ? prev : [item, ...prev]));
      toast({ title: "Could not approve item", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      markProcessing(item.id, false);
    }
  };

  const dismissItem = async (item) => {
    if (processingIds.has(item.id)) return;
    markProcessing(item.id, true);
    // Optimistic removal
    setItems(prev => prev.filter(i => i.id !== item.id));
    try {
      await base44.entities.EmailIngestionLog.update(item.id, { result: "skipped", skip_reason: "manually dismissed" });
      toast({ title: "Item dismissed" });
    } catch (err) {
      setItems(prev => (prev.some(i => i.id === item.id) ? prev : [item, ...prev]));
      toast({ title: "Could not dismiss", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      markProcessing(item.id, false);
    }
  };

  const bulkApprove = async () => {
    if (bulkApproving) return;
    const highConf = items.filter(i => (i.confidence_score || 0) >= 70 && !processingIds.has(i.id));
    if (highConf.length === 0) return;
    setBulkApproving(true);
    // Optimistic: remove all at once
    const targetIds = new Set(highConf.map(i => i.id));
    const snapshot = highConf;
    setItems(prev => prev.filter(i => !targetIds.has(i.id)));
    let created = 0, updated = 0, failed = 0;
    // Sequential — prevents concurrent duplicate-lead creation for same email
    for (const item of highConf) {
      try {
        const r = await processApproval(item);
        if (r?.created) created++;
        else if (r?.updated) updated++;
      } catch {
        failed++;
      }
    }
    if (failed > 0) {
      // Restore failed items (best effort: reload from server to get accurate queue)
      await loadItems();
      toast({
        title: `Processed ${created + updated} of ${snapshot.length}`,
        description: `${created} created, ${updated} updated, ${failed} failed.`,
        variant: failed === snapshot.length ? "destructive" : undefined,
      });
    } else {
      toast({ title: `${created + updated} items processed`, description: `${created} leads created, ${updated} updated.` });
    }
    setBulkApproving(false);
  };

  const highConfCount = items.filter(i => (i.confidence_score || 0) >= 70).length;

  if (wsLoading || loading) {
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
            title="Nothing to review"
            description="There are no pending review items right now. When AI is unsure whether an inbound email is a qualified lead, it will land here for your approval."
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
                    <Button
                      onClick={() => createLead(item)}
                      disabled={processingIds.has(item.id) || bulkApproving}
                      className="h-8 text-[12px] gap-1.5"
                    >
                      {processingIds.has(item.id)
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <CheckCircle className="h-3.5 w-3.5" />}
                      Approve & create lead
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => dismissItem(item)}
                      disabled={processingIds.has(item.id) || bulkApproving}
                      className="h-8 text-[12px] gap-1.5"
                    >
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