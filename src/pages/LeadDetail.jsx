import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Building, Briefcase, Trash2, Sparkles, Send, Globe } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);

  const loadData = async () => {
    const [leads, allEmails] = await Promise.all([
      base44.entities.Lead.filter({ id }),
      base44.entities.EmailLog.filter({ lead_id: id }, "-created_date", 50),
    ]);
    setLead(leads[0]);
    setEmails(allEmails);
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
      <Link to="/leads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary">{lead.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{lead.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>
                {lead.company && <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" /> {lead.company}</span>}
                {lead.title && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {lead.title}</span>}
                {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShowGenerate(true)}>
              <Sparkles className="h-4 w-4" /> Generate Email
            </Button>
            <Button variant="ghost" size="icon" onClick={deleteLead} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Select value={lead.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["New", "Contacted", "Replied", "Interested", "Meeting Booked", "Closed", "Unresponsive", "Opted Out"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Priority</p>
            <StatusBadge status={lead.priority || "Medium"} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Source</p>
            <p className="text-sm text-foreground">{lead.source || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Emails Sent</p>
            <p className="text-sm text-foreground">{lead.total_emails_sent || 0}</p>
          </div>
        </div>
      </div>

      {/* Email History */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Email History</h2>
        </div>
        {emails.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No emails sent yet</p>
            <Button size="sm" className="mt-3 gap-2" onClick={() => setShowGenerate(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Generate First Email
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {emails.map(email => (
              <div key={email.id} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{email.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{moment(email.created_date).format("MMM D, YYYY h:mm A")}</p>
                  </div>
                  <StatusBadge status={email.status} />
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{email.body}</p>
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