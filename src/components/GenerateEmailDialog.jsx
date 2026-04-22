import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SendConfirmModal from "./SendConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, Target, Building, Zap, User, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

function ContextChip({ icon: Icon, label, value, color = "primary" }) {
  const colors = {
    primary: "bg-primary/10 text-primary border-primary/20",
    accent:  "bg-accent/10 text-accent border-accent/20",
    amber:   "bg-warning/10 text-warning border-warning/25",
    green:   "bg-success/10 text-success border-success/25",
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border ${colors[color]}`}>
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate max-w-[180px]">{value}</span>
    </div>
  );
}

export default function GenerateEmailDialog({ open, onClose, lead, intentScore: initialIntentScore, onSuccess }) {
  const { workspace } = useWorkspace();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState(null);
  const [intentScore, setIntentScore] = useState(initialIntentScore || null);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [logging, setLogging] = useState(false);

  useEffect(() => { setIntentScore(initialIntentScore || null); }, [initialIntentScore]);

  useEffect(() => {
    if (!open) return;
    base44.auth.me().then(async user => {
      const [p, s] = await Promise.all([
        base44.entities.BusinessProfile.filter({ created_by: user.email }, "-created_date", 1),
        initialIntentScore ? Promise.resolve([initialIntentScore]) :
          base44.entities.IntentScore.filter({ lead_id: lead.id, created_by: user.email }, "-scored_at", 1).catch(() => []),
      ]);
      if (p.length > 0) setProfile(p[0]);
      if (s.length > 0) setIntentScore(s[0]);
    });
  }, [open, lead?.id, initialIntentScore]);

  const generateEmail = async () => {
    if (generating) return;
    setGenerating(true);
    try {
    const context = profile
      ? `Business: ${profile.business_name}. Description: ${profile.description}. Target audience: ${profile.target_audience}. Tone: ${profile.tone}. Goal: ${profile.sales_goal}. Products/Services: ${profile.products_services || 'N/A'}.`
      : "A professional business reaching out to potential clients.";

    let intentContext = "";
    if (intentScore) {
      const s = intentScore;
      if (s.pain_point) intentContext += `\nThe lead specifically mentioned this problem: "${s.pain_point}". Reference this directly in the email.`;
      if (s.urgency_signals) intentContext += `\nThe lead showed these urgency signals: "${s.urgency_signals}". Acknowledge their timeline.`;
      if (s.urgency_level) intentContext += `\nUrgency level: ${s.urgency_level}.`;
      if (s.decision_authority === 'High') intentContext += `\nTone instruction: Write peer-to-peer as one executive to another — confident, direct, no fluff.`;
      else if (s.decision_authority === 'Low') intentContext += `\nTone instruction: Write as educational and helpful — explain value clearly, no pressure.`;
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert sales copywriter. Generate a personalized cold outreach email.

${context}

Lead info:
- Name: ${lead.name}
- Email: ${lead.email}
- Company: ${lead.company || 'Unknown'}
- Title: ${lead.title || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}${intentContext}

IMPORTANT: If a pain point or urgency signals are provided above, directly reference them in the email body. Generate a compelling, personalized email that feels human and not spammy. Keep it concise (under 150 words). Reference something specific about their company or role if possible.

Output JSON with "subject" and "body" fields.`,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" }
        },
        required: ["subject", "body"]
      }
    });

    setSubject(result.subject);
    setBody(result.body);
    } catch (err) {
      toast({ title: "Could not generate email", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const sendEmail = () => {
    if (!subject || !body) return;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    setPendingEmail({ subject, body });
  };

  const confirmSent = async () => {
    // Idempotency guard: prevent duplicate EmailLog + double-increment on repeat clicks
    if (!pendingEmail || logging) return;
    setLogging(true);
    try {
      // Fetch fresh lead to avoid stale counter race condition
      const fresh = await base44.entities.Lead.filter({ id: lead.id }, "-created_date", 1).catch(() => [lead]);
      const current = fresh[0] || lead;
      await base44.entities.EmailLog.create({
        workspace_id: workspace?.id,
        lead_id: lead.id,
        lead_name: lead.name,
        lead_email: lead.email,
        subject: pendingEmail.subject,
        body: pendingEmail.body,
        status: "Sent",
        sent_at: new Date().toISOString(),
        ai_generated: true,
      });
      await base44.entities.Lead.update(lead.id, {
        status: current.status === "New" ? "Contacted" : current.status,
        last_contacted: new Date().toISOString(),
        total_emails_sent: (current.total_emails_sent || 0) + 1,
      });
      toast({ title: "Email logged as sent" });
      setPendingEmail(null);
      setSubject(""); setBody("");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: "Could not log email", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLogging(false);
    }
  };

  const cancelSent = () => {
    setPendingEmail(null);
    toast({ title: "Email not logged — no record created" });
  };

  const remindLater = () => {
    setPendingEmail(prev => ({ ...prev, snoozed: true }));
    toast({ title: "Reminder set — we'll ask again in 5 minutes" });
    setSubject(""); setBody("");
    onClose();
  };

  const handleClose = () => {
    if (generating || logging) return;
    setSubject("");
    setBody("");
    onClose();
  };

  const hasContent = subject || body;

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <div className="h-7 w-7 rounded-md flex items-center justify-center bg-accent/15 border border-accent/25">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
            </div>
            AI Email to {lead?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Context chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {profile?.business_name && <ContextChip icon={Building} label="From" value={profile.business_name} color="primary" />}
          {profile?.tone && <ContextChip icon={User} label="Tone" value={profile.tone} color="primary" />}
          {profile?.sales_goal && <ContextChip icon={Target} label="Goal" value={profile.sales_goal} color="green" />}
          {intentScore?.urgency_level && <ContextChip icon={Zap} label="Urgency" value={intentScore.urgency_level} color="amber" />}
          {intentScore?.pain_point && <ContextChip icon={Sparkles} label="Pain" value={intentScore.pain_point.slice(0, 40)} color="accent" />}
        </div>

        <div className="space-y-4">
          {!hasContent ? (
            <div className="flex flex-col items-center py-8 px-4 text-center">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 bg-accent/10 border border-accent/20">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <p className="text-[14px] font-semibold text-white">Generate a personalized email</p>
              <p className="text-[12px] text-muted-foreground mt-1 max-w-sm leading-relaxed">
                AI will write on-brand outreach using your business profile and this lead's intent signals.
              </p>
              <Button onClick={generateEmail} disabled={generating} className="gap-1.5 mt-5 h-9 text-[13px]">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Generating…" : "Generate email"}
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label className="text-[12px] text-muted-foreground">Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1.5 h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] text-muted-foreground">Body</Label>
                <Textarea value={body} onChange={e => setBody(e.target.value)} rows={10} className="mt-1.5 resize-none text-[13px] leading-relaxed" />
                <p className="text-[11px] text-muted-foreground mt-1">{body.length} chars · {body.split(/\s+/).filter(Boolean).length} words</p>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <Button variant="outline" onClick={generateEmail} disabled={generating} className="h-9 text-[12px] gap-1.5">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerate
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleClose} className="h-9 text-[12px]">Cancel</Button>
                  <Button onClick={sendEmail} className="h-9 text-[13px] gap-1.5 font-semibold">
                    <Send className="h-4 w-4" /> Send via Gmail
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <SendConfirmModal
      open={!!(pendingEmail && !pendingEmail.snoozed)}
      leadName={lead?.name}
      onConfirm={confirmSent}
      onCancel={cancelSent}
      onRemindLater={remindLater}
    />
    </>
  );
}