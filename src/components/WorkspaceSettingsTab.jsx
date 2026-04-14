import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle2, Loader2, Save, Users, Mail, Bell } from "lucide-react";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

function StatCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <div className="bg-secondary/40 rounded-xl p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg bg-primary/10`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function WorkspaceSettingsTab() {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [saving, setSaving] = useState(false);

  const [aiProvider, setAiProvider] = useState("base44");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  const [stats, setStats] = useState({ leads: 0, emails: 0, reminders: 0 });

  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const workspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, "-created_date", 1);
    if (workspaces.length > 0) {
      const ws = workspaces[0];
      setWorkspace(ws);
      setAiProvider(ws.ai_provider || "base44");
      setAiApiKey(ws.ai_api_key || "");
      setAiModel(ws.ai_model || "");
      setWorkspaceName(ws.name || "");
    }

    // Load stats in parallel
    const [leads, emails, reminders] = await Promise.all([
      base44.entities.Lead.filter({ created_by: user.email }, "-created_date", 1000),
      base44.entities.EmailLog.filter({ created_by: user.email }, "-created_date", 1000),
      base44.entities.FollowUpReminder.filter({ created_by: user.email }, "-created_date", 1000),
    ]);
    setStats({ leads: leads.length, emails: emails.length, reminders: reminders.length });
    setLoading(false);
  };

  const handleReconnectGmail = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    const redirectUri = `${window.location.origin}/settings`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GMAIL_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: "reconnect",
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const popup = window.open(url, "_blank", "width=500,height=650");
    setConnectingGmail(true);

    const timer = setInterval(async () => {
      try {
        if (!popup || popup.closed) { clearInterval(timer); setConnectingGmail(false); return; }
        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.includes("code=")) {
          clearInterval(timer);
          popup.close();
          const code = new URL(popupUrl).searchParams.get("code");
          if (code) {
            const res = await base44.functions.invoke("connectGmail", { code, redirect_uri: redirectUri });
            if (res.data?.success) {
              toast({ title: "Gmail reconnected", description: res.data.gmail_email });
              loadWorkspace();
            }
          }
          setConnectingGmail(false);
        }
      } catch (_e) { /* cross-origin expected */ }
    }, 500);
  };

  const handleSaveAI = async () => {
    if (!workspace) return;
    setSaving(true);
    const update = { ai_provider: aiProvider, name: workspaceName };
    if (aiProvider !== "base44") {
      if (aiApiKey.trim()) update.ai_api_key = aiApiKey.trim();
      if (aiModel.trim()) update.ai_model = aiModel.trim();
    } else {
      // Clear custom key if switching back to base44
      update.ai_api_key = "";
      update.ai_model = "";
    }
    await base44.entities.Workspace.update(workspace.id, update);
    toast({ title: "Workspace settings saved!" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Usage Stats */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Workspace Usage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={Users} label="Total Leads" value={stats.leads} />
          <StatCard icon={Mail} label="Emails Processed" value={stats.emails} color="text-amber-400" />
          <StatCard icon={Bell} label="Follow-ups Sent" value={stats.reminders} color="text-green-400" />
        </div>
      </div>

      {/* Workspace Name */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Workspace</h3>
        <div>
          <Label className="mb-1.5 block">Workspace Name</Label>
          <Input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="My Workspace" />
        </div>
      </div>

      {/* Gmail */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Gmail Connection</h3>
        {workspace?.gmail_connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <div>
                <p className="text-sm font-medium text-white">Connected</p>
                {workspace.gmail_email && (
                  <p className="text-xs text-muted-foreground">{workspace.gmail_email}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleReconnectGmail} disabled={connectingGmail} className="gap-2">
              {connectingGmail && <Loader2 className="h-3 w-3 animate-spin" />}
              Reconnect
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <p className="text-sm text-muted-foreground">Not connected</p>
            </div>
            <button
              onClick={handleReconnectGmail}
              disabled={connectingGmail}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {connectingGmail ? <Loader2 className="h-4 w-4 animate-spin text-gray-600" /> : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Connect Gmail
            </button>
          </div>
        )}
      </div>

      {/* AI Config */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">AI Configuration</h3>
        <div>
          <Label className="mb-1.5 block">AI Provider</Label>
          <Select value={aiProvider} onValueChange={setAiProvider}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base44">Base44 (built-in, no key needed)</SelectItem>
              <SelectItem value="openai">OpenAI (your key)</SelectItem>
              <SelectItem value="anthropic">Anthropic (your key)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {aiProvider !== "base44" && (
          <>
            <div>
              <Label className="mb-1.5 block">API Key</Label>
              <Input
                type="password"
                value={aiApiKey}
                onChange={e => setAiApiKey(e.target.value)}
                placeholder={aiProvider === "openai" ? "sk-..." : "sk-ant-..."}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Model <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder={aiProvider === "openai" ? "gpt-4o" : "claude-3-5-sonnet-20241022"}
              />
            </div>
          </>
        )}
        {aiProvider === "base44" && (
          <p className="text-xs text-muted-foreground p-3 bg-secondary/40 rounded-lg">
            Using BeaconIQ's built-in AI (GPT-4o-mini). No API key required.
          </p>
        )}
        <Button onClick={handleSaveAI} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}