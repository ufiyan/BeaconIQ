import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, Mail, Sparkles, Building2, ArrowRight } from "lucide-react";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

const GMAIL_REDIRECT_URI = "https://app.base44.com/oauth/callback";

function getGmailOAuthUrl(workspaceId) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: workspaceId || "onboarding",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

const STEPS = [
  { id: 1, label: "Workspace", icon: Building2 },
  { id: 2, label: "Gmail", icon: Mail },
  { id: 3, label: "AI Setup", icon: Sparkles },
  { id: 4, label: "Done", icon: CheckCircle2 },
];

export default function WorkspaceOnboardingModal({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState(user?.full_name ? `${user.full_name}'s Workspace` : "My Workspace");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState(null);
  const [polling, setPolling] = useState(false);
  const [aiProvider, setAiProvider] = useState("base44");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const pollIntervalRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPolling(false);
  };

  const startPollingForGmail = (wsId) => {
    setPolling(true);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const workspaces = await base44.entities.Workspace.filter({ id: wsId }, '-created_date', 1);
        const ws = workspaces[0];
        if (ws?.gmail_connected) {
          stopPolling();
          setGmailConnected(true);
          setGmailEmail(ws.gmail_email || null);
          setWorkspace(ws);
        }
      } catch (_) {}
    }, 3000);
  };

  // Step 1: Create or reuse workspace
  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setLoading(true);
    const existing = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1).catch(() => []);
    let ws;
    if (existing.length > 0) {
      await base44.entities.Workspace.update(existing[0].id, { name: workspaceName.trim() });
      ws = { ...existing[0], name: workspaceName.trim() };
    } else {
      ws = await base44.entities.Workspace.create({
        owner_user_id: user.id,
        name: workspaceName.trim(),
        gmail_connected: false,
        ai_provider: "base44",
      });
    }
    setWorkspace(ws);
    setLoading(false);
    setStep(2);
  };

  // Step 2: Trigger Gmail OAuth — opens popup, starts postMessage listener + polling
  const handleConnectGmail = () => {
    if (!workspace) return;
    const url = getGmailOAuthUrl(workspace.id);
    window.open(url, "_blank", "width=500,height=650");

    // Listen for postMessage (fast path)
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GMAIL_CONNECTED") {
        window.removeEventListener("message", onMessage);
        stopPolling();
        setGmailEmail(event.data.gmail_email || null);
        setGmailConnected(true);
      }
    };
    window.addEventListener("message", onMessage);

    // Also start DB polling (reliable fallback)
    startPollingForGmail(workspace.id);
  };

  // Step 3: Save AI config
  const handleSaveAI = async () => {
    setLoading(true);
    const update = { ai_provider: aiProvider };
    if (aiProvider !== "base44" && aiApiKey.trim()) update.ai_api_key = aiApiKey.trim();
    if (aiModel.trim()) update.ai_model = aiModel.trim();
    await base44.entities.Workspace.update(workspace.id, update);
    setLoading(false);
    setStep(4);
  };

  // Step 4: Mark onboarding complete
  const handleFinish = async () => {
    setLoading(true);
    await base44.entities.Workspace.update(workspace.id, { onboarding_complete: true });
    setLoading(false);
    onComplete(workspace);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-bold text-white">Beacon</span>
            <span className="text-xl font-bold text-amber-400">IQ</span>
          </div>
          <p className="text-sm text-muted-foreground">Let's set up your workspace in just a few steps.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center px-8 pb-6 gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${isDone ? "bg-green-500 text-white" : isActive ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-white" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-4 ${isDone ? "bg-green-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="px-8 pb-8 space-y-5">

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Name your workspace</h2>
                <p className="text-sm text-muted-foreground">This helps you identify your account and can be changed later.</p>
              </div>
              <div>
                <Label className="mb-1.5 block">Workspace Name</Label>
                <Input
                  value={workspaceName}
                  onChange={e => setWorkspaceName(e.target.value)}
                  placeholder="Acme Agency"
                  className="text-base"
                  onKeyDown={e => e.key === "Enter" && workspaceName.trim() && handleCreateWorkspace()}
                  autoFocus
                />
              </div>
              <Button onClick={handleCreateWorkspace} disabled={!workspaceName.trim() || loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {loading ? "Creating..." : "Continue"}
              </Button>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Connect Gmail</h2>
                <p className="text-sm text-muted-foreground">BeaconIQ will read your inbox to automatically capture leads from inbound emails.</p>
              </div>
              {gmailConnected ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Gmail Connected</p>
                    {gmailEmail && <p className="text-xs text-muted-foreground">{gmailEmail}</p>}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleConnectGmail}
                    disabled={loading || polling}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {(loading || polling) ? <Loader2 className="h-4 w-4 animate-spin text-gray-600" /> : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {polling ? "Waiting for authorization..." : "Sign in with Google"}
                  </button>
                  {polling && (
                    <p className="text-xs text-center text-muted-foreground">
                      Complete sign-in in the popup window — this page will update automatically.
                    </p>
                  )}
                </>
              )}
              <div className="flex gap-3">
                {!gmailConnected && (
                  <Button variant="ghost" onClick={() => { stopPolling(); setStep(3); }} className="flex-1 text-muted-foreground">
                    Skip for now
                  </Button>
                )}
                <Button
                  onClick={() => { stopPolling(); setStep(3); }}
                  disabled={!gmailConnected && polling}
                  className={gmailConnected ? "w-full gap-2" : "flex-1 gap-2"}
                >
                  {polling && !gmailConnected
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <ArrowRight className="h-4 w-4" />}
                  Continue
                </Button>
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">AI Configuration</h2>
                <p className="text-sm text-muted-foreground">Use BeaconIQ's built-in AI, or bring your own API key for full control.</p>
              </div>
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
                  BeaconIQ's built-in AI is powered by GPT-4o-mini. No setup required — usage is included in your plan.
                </p>
              )}
              <Button onClick={handleSaveAI} disabled={loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {loading ? "Saving..." : "Continue"}
              </Button>
            </>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <>
              <div className="text-center pt-2">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">You're all set!</h2>
                <p className="text-sm text-muted-foreground mb-6">Your workspace is configured and ready to go.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-sm text-white">Workspace <strong>{workspaceName}</strong> created</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg">
                  {gmailConnected
                    ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    : <div className="h-4 w-4 rounded-full border border-muted-foreground shrink-0" />}
                  <span className="text-sm text-white">
                    {gmailConnected ? `Gmail connected — ${gmailEmail}` : "Gmail not connected (can set up in Settings)"}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-sm text-white">
                    AI: {aiProvider === "base44" ? "Base44 built-in" : `${aiProvider} (custom key)`}
                  </span>
                </div>
              </div>
              <Button onClick={handleFinish} disabled={loading} className="w-full gap-2 mt-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {loading ? "Finishing..." : "Go to Dashboard"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}