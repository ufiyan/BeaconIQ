import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link, useNavigate } from "react-router-dom";
import IntentScoreCard from "../components/IntentScoreCard";
import { ArrowLeft, Mail, Phone, Building, Briefcase, Trash2, Sparkles, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import GenerateEmailDialog from "../components/GenerateEmailDialog";
import { toast } from "@/components/ui/use-toast";
import moment from "moment";

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [emails, setEmails] = useState([]);
  const [intentScore, setIntentScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [activeReminder, setActiveReminder] = useState(null);

  const loadData = async () => {
    const user = await base44.auth.me();
    const [leads, allEmails, scores, reminders] = await Promise.all([
      base44.entities.Lead.filter({ id, created_by: user.email }),
      base44.entities.EmailLog.filter({ lead_id: id, created_by: user.email }, "-created_date", 50),
      base44.entities.IntentScore.filter({ lead_id: id, created_by: user.email }, "-scored_at", 1),
      base44.entities.FollowUpReminder.filter({ lead_id: id, created_by: user.email, status: "pending" }, "-created_date", 1).catch(() => []),
    ]);
    setLead(leads[0]);
    setEmails(allEmails.filter(e => e.status !== "Cancelled"));
    setIntentScore(scores[0] || null);
    setActiveReminder(reminders[0] || null);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const updateStatus = async (status) => {
    await base44.entities.Lead.update(id, { status });
    setLead(prev => ({ ...prev, status }));
    toast({ title: `Status updated to ${status}` });
  };

  const deleteLead = async () => {
    if (!confirm("Delete this lead?")) return;
    await base44.entities.Lead.delete(id);
    toast({ title: "Lead deleted" });
    navigate("/leads");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <EmptyState icon={Mail} title="Lead not found" description="This lead may have been deleted or doesn't belong to your workspace.">
          <Link to="/leads" className="inline-flex items-center h-9 px-4 rounded-lg text-[13px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
            Back to leads
          </Link>
        </EmptyState>
      </div>
    );
  }

  const sortedEmails = [...emails].sort((a, b) => new Date(b.sent_at || b.created_date) - new Date(a.sent_at || a.created_date));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <Link to="/leads" className="inline-flex items-center gap-1.5 text-[12px] mb-5 text-muted-foreground hover:text-white transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to leads
      </Link>

      {activeReminder && (
        <div className="surface rounded-xl p-4 mb-5 border-warning/30 bg-warning/5" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
              <div>
                <p className="text-[13px] font-medium text-warning">Follow-up needed</p>
                <p className="text-[12px] text-muted-foreground">
                  This lead hasn't been contacted in {activeReminder.days_since_contact} days.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowGenerate(true)} className="h-8 text-[12px] gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Write follow-up
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await base44.entities.FollowUpReminder.update(activeReminder.id, { status: "dismissed", dismiss_reason: "manually dismissed" });
                  setActiveReminder(null);
                }}
                className="h-8 text-[12px]"
              >Dismiss</Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero card */}
      <div className="relative surface-elevated rounded-2xl p-6 mb-5 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 500px 180px at 100% 0%, rgba(139,92,246,0.08), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 text-[16px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {lead.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h1 className="text-[22px] font-semibold tracking-tight text-white truncate">{lead.name}</h1>
                <StatusBadge status={lead.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>
                {lead.company && <span className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5" /> {lead.company}</span>}
                {lead.title && <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {lead.title}</span>}
                {lead.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={() => setShowGenerate(true)}
              className="gap-1.5 h-10 px-4 text-[13px] font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Sparkles className="h-4 w-4" /> Generate Email
            </Button>
            <Button variant="ghost" size="icon" onClick={deleteLead} className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-border">
          <MetaField label="Status">
            <Select value={lead.status} onValueChange={updateStatus}>
              <SelectTrigger className="h-8 text-[12px] w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["New","Contacted","Replied","Interested","Meeting Booked","Closed","Unresponsive","Opted Out"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </MetaField>
          <MetaField label="Priority">
            <StatusBadge status={lead.priority || "Medium"} />
          </MetaField>
          <MetaField label="Source">
            <span className="text-[13px] text-white">{lead.source || "—"}</span>
          </MetaField>
          <MetaField label="Emails sent">
            <span className="text-[13px] text-white">{lead.total_emails_sent || 0}</span>
          </MetaField>
        </div>
      </div>

      {/* AI reasoning */}
      <IntentScoreCard lead={lead} intentScore={intentScore} onRescore={loadData} />

      <GenerateEmailDialog open={showGenerate} lead={lead} intentScore={intentScore} onClose={() => { setShowGenerate(false); loadData(); }} onSuccess={loadData} />

      {/* Email history */}
      <div className="surface rounded-xl overflow-hidden mt-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-[13px] font-semibold text-white">Email history</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sortedEmails.length} message{sortedEmails.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setShowGenerate(true)} variant="outline" className="h-8 text-[12px] gap-1.5 border-accent/30 text-accent hover:bg-accent/10 hover:text-accent">
            <Sparkles className="h-3.5 w-3.5" /> New email
          </Button>
        </div>
        {sortedEmails.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No emails yet"
            description="Generate your first AI-personalized email to this lead"
            compact
          >
            <Button onClick={() => setShowGenerate(true)} className="h-8 text-[12px] gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Generate email
            </Button>
          </EmptyState>
        ) : (
          <div className="divide-y divide-border">
            {sortedEmails.map((email) => (
              <div key={email.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-white truncate">{email.subject}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {moment(email.sent_at || email.created_date).format("MMM D, h:mm A")} · {moment(email.sent_at || email.created_date).fromNow()}
                    </p>
                  </div>
                  <StatusBadge status={email.status} />
                </div>
                {email.body && (
                  <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3 mt-2">
                    {email.body.replace(/<[^>]+>/g, " ").slice(0, 280)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaField({ label, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1.5">{label}</p>
      {children}
    </div>
  );
}