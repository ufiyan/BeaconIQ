import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert sales copywriter. Generate a personalized cold outreach email.

${context}

Lead info:
- Name: ${lead.name}
- Email: ${lead.email}
- Company: ${lead.company || 'Unknown'}
- Title: ${lead.title || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}

Generate a compelling, personalized email that feels human and not spammy. Keep it concise (under 150 words). Reference something specific about their company or role if possible.

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

  const sendEmail = async () => {
    if (!subject || !body) return;
    setSending(true);

    // Open pre-filled Gmail compose window
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');

    // Log the email in the app
    await base44.entities.EmailLog.create({
      lead_id: lead.id,
      lead_name: lead.name,
      lead_email: lead.email,
      subject,
      body,
      status: "Sent",
      sent_at: new Date().toISOString(),
      ai_generated: true
    });

    await base44.entities.Lead.update(lead.id, {
      status: lead.status === "New" ? "Contacted" : lead.status,
      last_contacted: new Date().toISOString(),
      total_emails_sent: (lead.total_emails_sent || 0) + 1
    });

    toast({ title: "Gmail opened! Email logged in app." });
    setSending(false);
    setSubject("");
    setBody("");
    onSuccess();
    onClose();
  };

  const handleClose = () => {
    setSubject("");
    setBody("");
    onClose();
  };

  return (
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
  );
}