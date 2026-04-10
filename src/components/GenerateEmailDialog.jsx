import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SendConfirmModal from "./SendConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function GenerateEmailDialog({ open, onClose, lead, onSuccess }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState(null);
  const [pendingEmail, setPendingEmail] = useState(null); // waiting for send confirmation
  const [remindTimer, setRemindTimer] = useState(null);

  useEffect(() => {
    if (open) {
      base44.entities.BusinessProfile.list("-created_date", 1).then(p => {
        if (p.length > 0) setProfile(p[0]);
      });
    }
  }, [open]);

  const generateEmail = async () => {
    setGenerating(true);
    const context = profile
      ? `Business: ${profile.business_name}. Description: ${profile.description}. Target audience: ${profile.target_audience}. Tone: ${profile.tone}. Goal: ${profile.sales_goal}. Products/Services: ${profile.products_services || 'N/A'}.`
      : "A professional business reaching out to potential clients.";

    // Fetch intent score for richer email context
    let intentContext = "";
    let decisionAuthority = null;
    try {
      const scores = await base44.entities.IntentScore.filter({ lead_id: lead.id }, "-scored_at", 1);
      if (scores[0]) {
        const s = scores[0];
        if (s.pain_point) intentContext += `\nThe lead specifically mentioned this problem: "${s.pain_point}". Reference this directly in the email.`;
        if (s.urgency_signals) intentContext += `\nThe lead showed these urgency signals: "${s.urgency_signals}". Acknowledge their timeline.`;
        if (s.urgency_level) intentContext += `\nUrgency level: ${s.urgency_level}.`;
        decisionAuthority = s.decision_authority;
        if (decisionAuthority === 'High') intentContext += `\nTone instruction: Write peer-to-peer as one executive to another — confident, direct, no fluff.`;
        else if (decisionAuthority === 'Low') intentContext += `\nTone instruction: Write as educational and helpful — explain value clearly, no pressure.`;
      }
    } catch (_) {}

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
    setGenerating(false);
  };

  const sendEmail = () => {
    if (!subject || !body) return;
    // Open Gmail but don't log yet — wait for confirmation
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    setPendingEmail({ subject, body });
  };

  const confirmSent = async () => {
    if (!pendingEmail) return;
    await base44.entities.EmailLog.create({
      lead_id: lead.id,
      lead_name: lead.name,
      lead_email: lead.email,
      subject: pendingEmail.subject,
      body: pendingEmail.body,
      status: "Sent",
      sent_at: new Date().toISOString(),
      ai_generated: true
    });
    await base44.entities.Lead.update(lead.id, {
      status: lead.status === "New" ? "Contacted" : lead.status,
      last_contacted: new Date().toISOString(),
      total_emails_sent: (lead.total_emails_sent || 0) + 1
    });
    toast({ title: "Email logged as sent!" });
    setPendingEmail(null);
    setSubject(""); setBody("");
    onSuccess(); onClose();
  };

  const cancelSent = () => {
    setPendingEmail(null);
    toast({ title: "Email not logged — no record created" });
  };

  const remindLater = () => {
    const timer = setTimeout(() => {
      setPendingEmail(prev => prev); // re-show by keeping pendingEmail set
    }, 5 * 60 * 1000);
    setRemindTimer(timer);
    setPendingEmail(prev => ({ ...prev, snoozed: true }));
    toast({ title: "Reminder set — we'll ask again in 5 minutes" });
    setSubject(""); setBody("");
    onClose();
  };

  const handleClose = () => {
    setSubject("");
    setBody("");
    if (!pendingEmail) onClose();
    else onClose();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Email to {lead?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!subject && !body ? (
            <div className="flex flex-col items-center py-8">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center mb-4">
                AI will generate a personalized email based on your business profile and lead details
              </p>
              <Button onClick={generateEmail} disabled={generating} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Generating..." : "Generate Email"}
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="resize-none" />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={generateEmail} disabled={generating} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Regenerate
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button onClick={sendEmail} disabled={sending} className="gap-2">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? "Sending..." : "Send Email"}
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
  </>;
}