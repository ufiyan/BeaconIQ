import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link, useNavigate } from "react-router-dom";
import IntentScoreCard from "../components/IntentScoreCard";
import { ArrowLeft, Mail, Phone, Building, Briefcase, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "../components/StatusBadge";
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
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Lead not found</p>
        <Link to="/leads"><Button variant="outline" className="mt-4">Back to Leads</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <Link to="/leads" className="inline-flex items-center gap-2 text-xs mb-6 transition-colors" style={{ color: '#94A3B8' }}>
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      {/* Reminder banner */}
      {activeReminder && (
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4 flex-wrap" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: "#F59E0B" }} />
            <p className="text-sm" style={{ color: "#F59E0B" }}>
              This lead hasn't been contacted in {activeReminder.days_since_contact} days.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowGenerate(true); }}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: "#F59E0B", color: "#000" }}
            >Generate follow-up?</button>
            <button
              onClick={async () => {
                await base44.entities.FollowUpReminder.update(activeReminder.id, { status: "dismissed", dismiss_reason: "manually dismissed" });
                setActiveReminder(null);
              }}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "#94A3B8", background: "rgba(148,163,184,0.1)" }}
            >Dismiss</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl p-6 mb-6" style={{ background: 'hsl(var(--card))', border: '0.5px solid hsl(var(--border))' }}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
              {lead.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
            </div>
            <div>
              <h1 className="font-medium text-white" style={{ fontSize: '18px' }}>{lead.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs" style={{ color: '#94A3B8' }}>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>
                {lead.company && <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" /> {lead.company}</span>}
                {lead.title && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {lead.title}</span>}
                {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 text-xs h-8" onClick={() => setShowGenerate(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Generate Email
            </Button>
            <Button variant="ghost" size="icon" onClick={deleteLead} className="h-8 w-8" style={{ color: '#EF4444' }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-5 pt-5" style={{ borderTop: '0.5px solid hsl(var(--border))' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>Status</p>
            <Select value={lead.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['New','Contacted','Replied','Interested','Meeting Booked','Closed','Unresponsive','Opted Out'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>Priority</p>
            <StatusBadge status={lead.priority || 'Medium'} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>Source</p>
            <p className="text-xs text-white">{lead.source || '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>Emails Sent</p>
            <p className="text-xs text-white">{lead.total_emails_sent || 0}</p>
          </div>
        </div>
      </div>

      <IntentScoreCard lead={lead} intentScore={intentScore} onRescore={loadData} />

      {/* Email History */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '0.5px solid hsl(var(--border))' }}>
        <div className="p-5" style={{ borderBottom: '0.5px solid hsl(var(--border))' }}>
          <h2 className="text-xs font-medium text-white">Email History</h2>
        </div>
        {emails.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="h-7 w-7 mx-auto mb-2" style={{ color: '#94A3B8' }} />
            <p className="text-xs" style={{ color: '#94A3B8' }}>No emails sent yet</p>
            <Button size="sm" className="mt-3 gap-2 text-xs h-8" onClick={() => setShowGenerate(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Generate First Email
            </Button>
          </div>
        ) : (
          <div>
            {emails.map(email => (
              <div key={email.id} className="p-5" style={{ borderBottom: '0.5px solid hsl(var(--border))' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium text-white">{email.subject}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{moment(email.created_date).format('MMM D, YYYY h:mm A')}</p>
                  </div>
                  <StatusBadge status={email.status} />
                </div>
                <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: '#94A3B8' }}>{email.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <GenerateEmailDialog 
        open={showGenerate} 
        onClose={() => setShowGenerate(false)} 
        lead={lead} 
        onSuccess={loadData} 
      />
    </div>
  );
}