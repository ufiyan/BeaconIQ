import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  CheckCircle2, Loader2, Save, Users, Mail, Zap, Copy, Check,
  AlertTriangle, BrainCircuit, RefreshCw, WifiOff
} from "lucide-react";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

const REDIRECT_URI = "https://app.base44.com/oauth/callback";

function getOAuthUrl(workspaceId) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: workspaceId || "settings",
  })}`;
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <div className="bg-secondary/40 rounded-xl p-4 flex items-center gap-3">
      <div className="p-2.5 rounded-lg bg-primary/10">
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function WorkspaceSettingsTab() {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [copied, setCopied] = useState(false);

  const [connectingGmail, setConnectingGmail] = useState(false);
  const [disconnectingGmail, setDisconnectingGmail] = useState(false);

  const [aiProvider, setAiProvider] = useState("base44");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [savingAi, setSavingAi] = useState(false);

  const [usage, setUsage] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const workspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, "-created_date", 1);
    if (workspaces.length > 0) {
      const ws = workspaces[0];
      setWorkspace(ws);
      setWorkspaceName(ws.name || "");
      setAiProvider(ws.ai_provider || "base44");
      setAiApiKey(ws.ai_api_key || "");
      setAiModel(ws.ai_model || "");
    }
    try {
      const usageRes = await base44.functions.invoke("getUsage", { workspace_id: workspaces[0]?.id });
      setUsage(usageRes?.data || {});
    } catch (_) {
      setUsage({});
    }
    setLoading(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(workspace.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = async () => {
    if (!workspace || !workspaceName.trim()) return;
    setSavingName(true);
    await base44.entities.Workspace.update(workspace.id, { name: workspaceName.trim() });
    setWorkspace(prev => ({ ...prev, name: workspaceName.trim() }));
    toast({ title: "Workspace name updated!" });
    setSavingName(false);
  };

  const handleConnectGmail = () => {
    if (!workspace) return;
    setConnectingGmail(true);
    window.open(getOAuthUrl(workspace.id), "_blank", "width=500,height=650");
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GMAIL_CONNECTED") {
        window.removeEventListener("message", onMessage);
        setConnectingGmail(false);
        toast({ title: "Gmail connected!", description: event.data.gmail_email });
        loadAll();
      }
    };
    window.addEventListener("message", onMessage);
  };

  const handleDisconnectGmail = async () => {
    if (!workspace) return;
    setDisconnectingGmail(true);
    await base44.entities.Workspace.update(workspace.id, {
      gmail_connected: false,
      gmail_access_token: "",
      gmail_refresh_token: "",
      gmail_email: "",
      gmail_token_expiry: null,
    });
    setWorkspace(prev => ({ ...prev, gmail_connected: false, gmail_email: "" }));
    toast({ title: "Gmail disconnected" });
    setDisconnectingGmail(false);
  };

  const handleSaveAi = async () => {
    if (!workspace) return;
    setSavingAi(true);
    const update = { ai_provider: aiProvider };
    if (aiProvider !== "base44") {
      if (aiApiKey.trim()) update.ai_api_key = aiApiKey.trim();
      if (aiModel.trim()) update.ai_model = aiModel.trim();
    } else {
      update.ai_api_key = "";
      update.ai_model = "";
    }
    await base44.entities.Workspace.update(workspace.id, update);
    toast({ title: "AI settings saved!" });
    setSavingAi(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const plan = workspace?.plan || "free";
  const limit = workspace?.monthly_email_limit ?? (plan === "starter" ? 1000 : plan === "pro" ? Infinity : 100);
  const used = usage?.emails_processed || 0;
  const isPro = plan === "pro";
  const pct = isPro ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isWarning = !isPro && pct >= 80;
  const isOver = !isPro && used >= limit;

  const planBadgeClass = plan === "pro"
    ? "bg-primary/20 text-primary"
    : plan === "starter"
    ? "bg-amber-500/20 text-amber-400"
    : "bg-secondary text-muted-foreground";

  return (
    <div className="space-y-6">

      {/* 1. Workspace */}
      <SectionCard title="Workspace">
        <div>
          <Label className="mb-1.5 block">Workspace Name</Label>
          <div className="flex gap-2">
            <Input
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              placeholder="My Workspace"
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
            />
            <Button onClick={handleSaveName} disabled={savingName || !workspaceName.trim()} className="shrink-0 gap-1.5">
              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
        {workspace?.id && (
          <div>
            <Label className="mb-1.5 block">Workspace ID</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs px-3 py-2 rounded-lg bg-secondary/60 text-muted-foreground font-mono truncate select-all">
                {workspace.id}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopyId} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 2. Gmail */}
      <SectionCard title="Gmail Connection">
        {workspace?.gmail_connected ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-xs font-medium text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
              <span className="text-sm text-muted-foreground">{workspace.gmail_email}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleConnectGmail} disabled={connectingGmail} className="gap-1.5">
                {connectingGmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Reconnect
              </Button>
              <Button variant="outline" size="sm" onClick={handleDisconnectGmail} disabled={disconnectingGmail}
                className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10">
                {disconnectingGmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <WifiOff className="h-3 w-3" />}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">No Gmail account connected.</p>
            <button
              onClick={handleConnectGmail}
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
      </SectionCard>

      {/* 3. AI Provider */}
      <SectionCard title="AI Provider">
        <div>
          <Label className="mb-1.5 block">Provider</Label>
          <Select value={aiProvider} onValueChange={setAiProvider}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base44">BeaconIQ AI (built-in, no key needed)</SelectItem>
              <SelectItem value="openai">OpenAI (your key)</SelectItem>
              <SelectItem value="anthropic">Anthropic (your key)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {aiProvider === "base44" && (
          <p className="text-xs text-muted-foreground p-3 bg-secondary/40 rounded-lg">
            Using BeaconIQ's built-in AI (GPT-4o-mini). No API key required.
          </p>
        )}

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
              <Label className="mb-1.5 block">
                Model <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder={aiProvider === "openai" ? "gpt-4o" : "claude-3-5-sonnet-20241022"}
              />
            </div>
          </>
        )}

        <Button onClick={handleSaveAi} disabled={savingAi} className="gap-2">
          {savingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
          {savingAi ? "Saving..." : "Save Changes"}
        </Button>
      </SectionCard>

      {/* 4. Usage & Plan */}
      <SectionCard title="Usage & Plan">
        {/* Plan badge + Upgrade */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planBadgeClass}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
            </span>
          </div>
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
            <Zap className="h-3 w-3" /> Upgrade Plan
          </Button>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isWarning ? <AlertTriangle className="h-3 w-3 text-amber-400" /> : <Mail className="h-3 w-3" />}
              Emails processed this month
            </div>
            <span className="text-xs text-muted-foreground">
              {isPro ? "Unlimited" : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
            </span>
          </div>
          {!isPro && (
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {isOver && (
            <p className="text-xs text-red-400 mt-1.5">Limit reached — email syncs are paused until next month or you upgrade.</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <StatBox icon={Users} label="Leads Created" value={usage?.leads_created ?? 0} />
          <StatBox icon={Mail} label="Emails Sent" value={usage?.emails_sent ?? 0} color="text-amber-400" />
          <StatBox icon={BrainCircuit} label="AI Calls Made" value={usage?.ai_calls_made ?? 0} color="text-purple-400" />
        </div>
      </SectionCard>

    </div>
  );
}