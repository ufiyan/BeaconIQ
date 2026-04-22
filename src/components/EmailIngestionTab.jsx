import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import moment from "moment";
import OAuthTroubleshootingPanel from "@/components/OAuthTroubleshootingPanel";
import { buildGmailOAuthUrl } from "@/lib/oauthRedirect";

const DEFAULT_KEYWORDS = "inquiry, contact, demo, interested, question, pricing, quote, proposal, meeting, call, help";

export default function EmailIngestionTab() {
  const [gmailStatus, setGmailStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    leads_inbox: "",
    sync_time: "08:00",
    keywords: DEFAULT_KEYWORDS,
    confidence_threshold: 60,
    auto_create: true,
    lookback_window: "7",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const pollIntervalRef = useRef(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const workspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1).catch(() => []);
    const workspaceId = workspaces[0]?.id;
    const settingsFilter = workspaceId ? { workspace_id: workspaceId } : { created_by: user.email };
    const [statusRes, settingsList] = await Promise.all([
      base44.functions.invoke('gmailStatus', {}).catch(() => ({ data: { connected: false, email: null } })),
      base44.entities.EmailIngestionSettings.filter(settingsFilter, '-created_date', 1).catch(() => []),
    ]);
    setGmailStatus(statusRes?.data || { connected: false, email: null });
    if (settingsList.length > 0) {
      const s = settingsList[0];
      setSettings(s);
      setForm({
        leads_inbox: s.leads_inbox || "",
        sync_time: s.sync_time || "08:00",
        keywords: s.keywords ?? DEFAULT_KEYWORDS,
        confidence_threshold: s.confidence_threshold ?? 60,
        auto_create: s.auto_create !== false,
        lookback_window: s.lookback_window || "7",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.leads_inbox.trim()) {
      toast({ title: "Please enter your leads inbox address", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const workspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1).catch(() => []);
      const workspaceId = workspaces[0]?.id;
      const data = {
        ...form,
        leads_inbox: form.leads_inbox.trim(),
        workspace_id: workspaceId,
        is_active: !!(gmailStatus?.connected && form.leads_inbox.trim()),
      };
      if (settings) {
        await base44.entities.EmailIngestionSettings.update(settings.id, data);
        // Optimistic — no need for full reload
        setSettings(prev => ({ ...prev, ...data }));
      } else {
        const created = await base44.entities.EmailIngestionSettings.create(data);
        setSettings(created);
      }
      toast({ title: "Ingestion settings saved" });
    } catch (err) {
      toast({ title: "Could not save settings", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Clean up polling on unmount
  useEffect(() => () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); }, []);

  const handleConnectGmail = async () => {
    const user = await base44.auth.me();
    const workspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1).catch(() => []);
    const workspaceId = workspaces[0]?.id;
    if (!workspaceId) {
      toast({ title: "No workspace found. Please complete onboarding first.", variant: "destructive" });
      return;
    }
    const url = buildGmailOAuthUrl(workspaceId);
    if (!url) {
      toast({ title: "VITE_GOOGLE_CLIENT_ID is not set. Check environment variables.", variant: "destructive" });
      return;
    }
    setConnecting(true);
    const popup = window.open(url, "_blank", "width=500,height=650");

    // Listen for postMessage (fast path)
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GMAIL_CONNECTED") {
        window.removeEventListener("message", onMessage);
        clearInterval(pollIntervalRef.current);
        setConnecting(false);
        loadAll();
        toast({ title: `Gmail connected: ${event.data.gmail_email || ""}` });
      }
    };
    window.addEventListener("message", onMessage);

    // Fallback: poll DB every 3s in case popup was blocked
    pollIntervalRef.current = setInterval(async () => {
      if (popup && popup.closed) {
        clearInterval(pollIntervalRef.current);
        window.removeEventListener("message", onMessage);
        setConnecting(false);
        loadAll();
      }
    }, 3000);
  };

  const handleSyncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('gmailSync', {});
      const err = res?.data?.error;
      if (err) {
        toast({ title: "Sync failed", description: err, variant: "destructive" });
      } else {
        const s = res?.data?.stats;
        toast({ title: `Sync complete — ${s?.scanned || 0} scanned · ${s?.created || 0} created · ${s?.reviewed || 0} reviewed · ${s?.skipped || 0} skipped` });
      }
    } catch (err) {
      toast({ title: "Sync failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSyncing(false);
      loadAll();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const isFullyConfigured = settings?.leads_inbox && gmailStatus?.connected;
  const lastSyncStats = settings?.last_sync_stats ? (() => { try { return JSON.parse(settings.last_sync_stats); } catch (_) { return null; } })() : null;

  return (
    <div className="space-y-6">
      {/* Status summary */}
      {isFullyConfigured && (
        <div className="rounded-xl p-4 border" style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#10B981" }} />
                <span className="text-sm font-medium text-white">Active — syncing daily at {form.sync_time} from {form.leads_inbox}</span>
              </div>
              {settings.last_sync_at ? (
                <p className="text-xs" style={{ color: "#94A3B8" }}>
                  Last sync: {moment(settings.last_sync_at).fromNow()}
                  {lastSyncStats && ` · ${lastSyncStats.created} created · ${lastSyncStats.reviewed} reviewed · ${lastSyncStats.skipped} skipped`}
                </p>
              ) : (
                <p className="text-xs" style={{ color: "#94A3B8" }}>No sync run yet · click "Check for new leads now" to start</p>
              )}
            </div>
            <Button size="sm" onClick={handleSyncNow} disabled={syncing} className="gap-2">
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Check for new leads now
            </Button>
          </div>
        </div>
      )}

      {/* Step 1 */}
      <div className="rounded-xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(59,130,246,0.2)", color: "#3B82F6" }}>1</span>
          <h3 className="text-sm font-semibold text-white">Connect your Gmail account</h3>
        </div>
        {gmailStatus?.connected ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.15)" }}>
              <CheckCircle className="h-5 w-5" style={{ color: "#10B981" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{gmailStatus.email}</p>
              <p className="text-xs" style={{ color: "#94A3B8" }}>Connected · Gmail is authorized</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleConnectGmail} disabled={connecting}>
              {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reconnect"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#EF4444" }} />
              <p className="text-sm" style={{ color: "#EF4444" }}>Gmail not connected</p>
            </div>
            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
                <p className="text-xs" style={{ color: "#EF4444" }}>
                  <strong>VITE_GOOGLE_CLIENT_ID is not set.</strong> Gmail connect will not work until this environment variable is configured.
                </p>
              </div>
            )}
            <button
              onClick={handleConnectGmail}
              disabled={connecting || !import.meta.env.VITE_GOOGLE_CLIENT_ID}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin text-gray-600" /> : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {connecting ? "Waiting for authorization..." : "Sign in with Google"}
            </button>
          </div>
        )}
      </div>

      {/* Step 2 */}
      <div className="rounded-xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(59,130,246,0.2)", color: "#3B82F6" }}>2</span>
          <h3 className="text-sm font-semibold text-white">Enter your leads inbox address</h3>
        </div>
        <div className="mb-3 flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <span className="text-blue-400 text-sm mt-0.5">ℹ</span>
          <p className="text-xs text-muted-foreground">
            Step 1 above connects BeaconIQ to read a Gmail account. Step 2 tells BeaconIQ which specific email address within that account your customers write to. These can be different — for example you might connect your Google Workspace account but your leads write to info@yourcompany.com.
          </p>
        </div>
        <Label>Your leads inbox address</Label>
        <Input
          className="mt-1"
          value={form.leads_inbox}
          onChange={e => setForm({ ...form, leads_inbox: e.target.value })}
          placeholder="leads@yourcompany.com"
        />
        <p className="text-xs mt-2" style={{ color: "#94A3B8" }}>
          This is the email address your website contact form, ads, or customers write to. BeaconIQ will only read emails sent TO this address. Example: leads@yourcompany.com or info@youragency.com
        </p>
        {!form.leads_inbox && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: "#F59E0B" }}>⚠ Please enter your leads inbox address to start ingestion.</p>
        )}
      </div>

      {/* Step 3 */}
      <div className="rounded-xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2 mb-5">
          <span className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(59,130,246,0.2)", color: "#3B82F6" }}>3</span>
          <h3 className="text-sm font-semibold text-white">Configure sync settings</h3>
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Daily sync time</Label>
              <Input type="time" className="mt-1" value={form.sync_time} onChange={e => setForm({ ...form, sync_time: e.target.value })} />
            </div>
            <div>
              <Label>Lookback window (first sync only)</Label>
              <Select value={form.lookback_window} onValueChange={v => setForm({ ...form, lookback_window: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["1","1 day"],["3","3 days"],["7","7 days"],["14","14 days"],["30","30 days"]].map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Keyword filters (comma-separated, leave empty to process all emails)</Label>
            <Textarea
              className="mt-1 resize-none"
              rows={2}
              value={form.keywords}
              onChange={e => setForm({ ...form, keywords: e.target.value })}
              placeholder="inquiry, contact, demo, interested..."
            />
            <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Only process emails whose subject or body contains at least one of these words.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>AI Confidence threshold</Label>
              <span className="text-sm font-semibold text-white">{form.confidence_threshold}%</span>
            </div>
            <input
              type="range" min={0} max={100}
              value={form.confidence_threshold}
              onChange={e => setForm({ ...form, confidence_threshold: parseInt(e.target.value) })}
              className="w-full accent-blue-500"
            />
            <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Emails below this score go to Review Queue instead of auto-creating leads.</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Auto-create leads</p>
              <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>When OFF, all emails go to Review Queue for manual approval</p>
            </div>
            <Switch checked={form.auto_create} onCheckedChange={v => setForm({ ...form, auto_create: v })} />
          </div>
        </div>
      </div>

      <OAuthTroubleshootingPanel gmailStatus={gmailStatus} />

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}