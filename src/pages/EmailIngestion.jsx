import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle, XCircle, User, Mail, Building, Phone, Briefcase } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

export default function EmailIngestion() {
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [creating, setCreating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const data = await base44.entities.EmailIngestionLog.list("-created_date", 10);
    setLogs(data);
    setLoadingLogs(false);
  };

  const extractLead = async () => {
    if (!senderEmail || !body) {
      toast({ title: "Please fill in at least sender email and email body", variant: "destructive" });
      return;
    }
    setExtracting(true);
    setExtracted(null);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a lead extraction assistant for a B2B sales tool. Analyze the following email and extract any potential lead information. A lead is any person or organization that has shown interest in a product or service. Return ONLY a valid JSON object with these fields: is_lead (boolean), name (string or null), email (string or null — extract from email body or use sender email if clearly a personal/business address), company (string or null), title (string or null), phone (string or null), industry (string or null), source (always set to 'Email Ingestion'), priority ('High' if C-suite or Director+ title or enterprise company signals, 'Medium' if manager-level or SMB, 'Low' otherwise), ai_summary (one sentence: why this is or isn't a promising lead), confidence_score (0-100 integer: how confident you are this is a real lead). Do not include any text outside the JSON object.

Sender Name: ${senderName || "Unknown"}
Sender Email: ${senderEmail}
Subject: ${subject || "(no subject)"}
Body:
${body}`,
      response_json_schema: {
        type: "object",
        properties: {
          is_lead: { type: "boolean" },
          name: { type: "string" },
          email: { type: "string" },
          company: { type: "string" },
          title: { type: "string" },
          phone: { type: "string" },
          industry: { type: "string" },
          source: { type: "string" },
          priority: { type: "string" },
          ai_summary: { type: "string" },
          confidence_score: { type: "number" }
        }
      }
    });

    setExtracted(result);
    setExtracting(false);
  };

  const createLead = async () => {
    if (!extracted) return;
    setCreating(true);

    const isQualified = extracted.is_lead && extracted.confidence_score >= 60;

    if (!isQualified) {
      await base44.entities.EmailIngestionLog.create({
        sender_name: senderName,
        sender_email: senderEmail,
        subject,
        result: "skipped",
        ai_summary: extracted.ai_summary,
        confidence_score: extracted.confidence_score
      });
      toast({ title: "Email logged as skipped — not a qualified lead" });
      resetForm();
      await loadLogs();
      setCreating(false);
      return;
    }

    // Check for duplicate lead
    const existing = await base44.entities.Lead.filter({ email: extracted.email || senderEmail });

    if (existing.length > 0) {
      const lead = existing[0];
      const note = `${lead.notes ? lead.notes + "\n\n" : ""}Follow-up email received on ${format(new Date(), "MMM d, yyyy")}: ${extracted.ai_summary}`;
      await base44.entities.Lead.update(lead.id, {
        notes: note,
        ...(lead.status === "New" ? {} : {})
      });
      await base44.entities.EmailIngestionLog.create({
        sender_name: senderName,
        sender_email: senderEmail,
        subject,
        result: "lead_updated",
        ai_summary: extracted.ai_summary,
        confidence_score: extracted.confidence_score,
        lead_id: lead.id
      });
      toast({ title: "Existing lead updated with follow-up note" });
    } else {
      const newLead = await base44.entities.Lead.create({
        name: extracted.name || senderName || senderEmail,
        email: extracted.email || senderEmail,
        company: extracted.company || "",
        title: extracted.title || "",
        phone: extracted.phone || "",
        industry: extracted.industry || "",
        source: "Email Ingestion",
        status: "New",
        priority: extracted.priority || "Medium",
        notes: extracted.ai_summary || ""
      });
      await base44.entities.EmailIngestionLog.create({
        sender_name: senderName,
        sender_email: senderEmail,
        subject,
        result: "lead_created",
        ai_summary: extracted.ai_summary,
        confidence_score: extracted.confidence_score,
        lead_id: newLead.id
      });
      toast({ title: "New lead created successfully!" });
    }

    resetForm();
    await loadLogs();
    setCreating(false);
  };

  const resetForm = () => {
    setSenderName("");
    setSenderEmail("");
    setSubject("");
    setBody("");
    setExtracted(null);
  };

  const confidenceColor = (score) => {
    if (score >= 75) return "bg-emerald-100 text-emerald-700";
    if (score >= 50) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const resultColor = (result) => {
    if (result === "lead_created") return "bg-emerald-100 text-emerald-700";
    if (result === "lead_updated") return "bg-blue-100 text-blue-700";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email Lead Ingestion</h1>
        <p className="text-muted-foreground mt-1">Paste an email and let AI extract lead information automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Paste Email Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sender Name</Label>
              <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="John Smith" className="mt-1" />
            </div>
            <div>
              <Label>Sender Email *</Label>
              <Input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="john@company.com" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Re: Demo Request" className="mt-1" />
          </div>
          <div>
            <Label>Email Body *</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Paste the full email body here..."
              rows={8}
              className="mt-1 resize-none"
            />
          </div>
          <Button onClick={extractLead} disabled={extracting || !senderEmail || !body} className="w-full gap-2">
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {extracting ? "Analyzing with AI..." : "Extract Lead with AI"}
          </Button>
        </div>

        {/* Result Panel */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">AI Extraction Result</h2>
          {!extracted && !extracting && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">Fill in the email details and click "Extract Lead with AI"</p>
            </div>
          )}
          {extracting && (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-muted-foreground text-sm">AI is analyzing the email...</p>
            </div>
          )}
          {extracted && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {extracted.is_lead ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium text-sm">{extracted.is_lead ? "Lead Detected" : "Not a Lead"}</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${confidenceColor(extracted.confidence_score)}`}>
                  {extracted.confidence_score}% confidence
                </span>
              </div>

              <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-lg">{extracted.ai_summary}</p>

              <div className="space-y-2">
                {[
                  { icon: User, label: "Name", value: extracted.name },
                  { icon: Mail, label: "Email", value: extracted.email },
                  { icon: Building, label: "Company", value: extracted.company },
                  { icon: Briefcase, label: "Title", value: extracted.title },
                  { icon: Phone, label: "Phone", value: extracted.phone },
                ].map(({ icon: Icon, label, value }) => value ? (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ) : null)}
                {extracted.priority && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Priority:</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      extracted.priority === "High" ? "bg-red-100 text-red-700" :
                      extracted.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{extracted.priority}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">Clear</Button>
                <Button onClick={createLead} disabled={creating} className="flex-1 gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {creating ? "Saving..." : extracted.is_lead && extracted.confidence_score >= 60 ? "Save Lead" : "Log as Skipped"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Recent Ingestion Log</h2>
        {loadingLogs ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emails processed yet</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{log.sender_email}</p>
                  <p className="text-xs text-muted-foreground truncate">{log.ai_summary || log.subject || "—"}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {log.confidence_score != null && (
                    <span className="text-xs text-muted-foreground">{log.confidence_score}%</span>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${resultColor(log.result)}`}>
                    {log.result?.replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {log.created_date ? format(new Date(log.created_date), "MMM d") : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}