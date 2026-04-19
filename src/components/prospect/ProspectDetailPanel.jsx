import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Building2, MapPin, Users, Globe, Sparkles, Bookmark, UserCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignalBadge from "./SignalBadge";
import ScoreBar from "./ScoreBar";
import { toast } from "@/components/ui/use-toast";

export default function ProspectDetailPanel({ prospect, signals, contacts, onClose, onSaved, onConverted }) {
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [converting, setConverting] = useState(false);
  const [emailDraft, setEmailDraft] = useState(null);

  const handleGenerateOutreach = async () => {
    setGeneratingEmail(true);
    try {
      const res = await base44.functions.invoke("generateProspectOutreach", { prospect_id: prospect.id });
      setEmailDraft({ subject: res.data.subject, body: res.data.body });
    } catch (e) {
      toast({ title: "Error generating outreach", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleSendEmail = () => {
    if (!emailDraft) return;
    const contact = contacts[0];
    const mailto = contact?.email ? `mailto:${contact.email}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}` : null;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1${contact?.email ? `&to=${encodeURIComponent(contact.email)}` : ''}&su=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`;
    window.open(gmailUrl, '_blank');
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const res = await base44.functions.invoke("convertProspectToLead", { prospect_id: prospect.id });
      if (res.data.duplicate) {
        toast({ title: "Duplicate detected", description: res.data.message });
      } else {
        toast({ title: "Lead created!", description: `${prospect.company_name} added to your leads.` });
        onConverted?.();
      }
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  const opp = prospect.opportunity_score || 0;
  const oppColor = opp >= 75 ? "#10B981" : opp >= 50 ? "#F59E0B" : "#94A3B8";

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "hsl(var(--card))", borderLeft: "1px solid hsl(var(--border))" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
            <Building2 className="h-4 w-4" style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h2 className="font-bold text-white">{prospect.company_name}</h2>
            <p className="text-xs" style={{ color: "#64748B" }}>{prospect.industry}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="h-4 w-4" style={{ color: "#94A3B8" }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Company meta */}
        <div className="flex flex-wrap gap-3">
          {prospect.location && <span className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}><MapPin className="h-3.5 w-3.5" />{prospect.location}</span>}
          {prospect.employee_count && <span className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}><Users className="h-3.5 w-3.5" />{prospect.employee_count.toLocaleString()} employees</span>}
          {prospect.website && <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors" style={{ color: "#3B82F6" }}><Globe className="h-3.5 w-3.5" />{prospect.domain}</a>}
        </div>

        {/* Scores */}
        <div className="rounded-lg p-4 space-y-3" style={{ background: "hsl(var(--background))" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>Opportunity Scores</p>
          <ScoreBar label="Fit Score" score={prospect.fit_score} color="blue" />
          <ScoreBar label="Timing Score" score={prospect.timing_score} color="orange" />
          <div className="pt-1">
            <ScoreBar label="Opportunity Score" score={prospect.opportunity_score} color="green" />
          </div>
          <div className="text-center pt-1">
            <span className="text-3xl font-black" style={{ color: oppColor }}>{opp}</span>
            <span className="text-sm ml-1" style={{ color: "#64748B" }}>/100</span>
          </div>
        </div>

        {/* AI Summary */}
        {prospect.ai_summary && (
          <div className="rounded-lg p-4" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#8B5CF6" }}>
              <Sparkles className="h-3.5 w-3.5" /> AI Insight
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#C4B5FD" }}>{prospect.ai_summary}</p>
          </div>
        )}

        {/* Recommended Angle */}
        {prospect.recommended_angle && (
          <div className="rounded-lg p-4" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#F59E0B" }}>Recommended Outreach Angle</p>
            <p className="text-sm leading-relaxed" style={{ color: "#FCD34D" }}>{prospect.recommended_angle}</p>
          </div>
        )}

        {/* Signals Timeline */}
        {signals.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#64748B" }}>Buying Signals</p>
            <div className="space-y-3">
              {signals.map((sig, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#3B82F6" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SignalBadge type={sig.signal_type} />
                      <span className="text-xs" style={{ color: "#64748B" }}>
                        {sig.signal_date ? new Date(sig.signal_date).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-white">{sig.signal_title}</p>
                    {sig.signal_description && <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{sig.signal_description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contacts */}
        {contacts.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#64748B" }}>Suggested Contacts</p>
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "hsl(var(--background))" }}>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.1)" }}>
                    <UserCircle className="h-4 w-4" style={{ color: "#3B82F6" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>{c.title}</p>
                    {c.email && <p className="text-xs" style={{ color: "#3B82F6" }}>{c.email}</p>}
                  </div>
                  {c.decision_maker_likelihood >= 70 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>Decision Maker</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Draft */}
        {emailDraft && (
          <div className="rounded-lg p-4" style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: "#8B5CF6" }}>AI-Generated Outreach</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Subject</Label>
                <Input value={emailDraft.subject} onChange={e => setEmailDraft(d => ({ ...d, subject: e.target.value }))} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Body</Label>
                <Textarea value={emailDraft.body} onChange={e => setEmailDraft(d => ({ ...d, body: e.target.value }))} rows={6} className="mt-1 text-sm resize-none" />
              </div>
              <Button onClick={handleSendEmail} className="w-full" style={{ background: "#8B5CF6", color: "white" }}>
                Open in Gmail
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-4 space-y-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <Button
          onClick={handleGenerateOutreach}
          disabled={generatingEmail}
          className="w-full gap-2"
          style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}
        >
          {generatingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generatingEmail ? "Generating..." : "Generate Outreach Email"}
        </Button>
        <Button
          onClick={handleConvert}
          disabled={converting || prospect.status === "Converted"}
          className="w-full gap-2"
          style={{ background: prospect.status === "Converted" ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
          {prospect.status === "Converted" ? "Already a Lead" : converting ? "Converting..." : "Save to Leads"}
        </Button>
      </div>
    </div>
  );
}