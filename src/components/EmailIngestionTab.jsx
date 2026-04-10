import { useState, useEffect } from "react";
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

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [statusRes, settingsList] = await Promise.all([
      base44.functions.invoke('gmailStatus', {}).catch(() => ({ data: { connected: false, email: null } })),
      base44.entities.EmailIngestionSettings.list('-created_date', 1).catch(() => []),
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
    if (!form.leads_inbox.trim()) {
      toast({ title: "Please enter your leads inbox address", variant: "destructive" });
      return;
    }
    setSaving(true);
    const data = { ...form, is_active: !!(gmailStatus?.connected && form.leads_inbox) };
    if (settings) {
      await base44.entities.EmailIngestionSettings.update(settings.id, data);
    } else {
      const created = await base44.entities.EmailIngestionSettings.create(data);
      setSettings(created);
    }
    toast({ title: "Ingestion settings saved!" });
    setSaving(false);
    loadAll();
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const res = await base44.functions.invoke('gmailSync', {}).catch(e => ({ data: { error: e.message } }));
    if (res?.data?.error) {
      toast({ title: "Sync failed: " + res.data.error, variant: "destructive" });
    } else {
      const s = res?.data?.stats;
      toast({ title: `Sync complete — ${s?.scanned || 0} scanned · ${s?.created || 0} created · ${s?.reviewed || 0} reviewed · ${s?.skipped || 0} skipped` });
    }
    setSyncing(false);
    loadAll();
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
                <p className="text-xs" style={{ color: "#94A3B8" }}>No sync run yet · click "Sync Now" to start</p>
              )}
            </div>
            <Button size="sm" onClick={handleSyncNow} disabled={syncing} className="gap-2">
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync Now
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
            <div>
              <p className="text-sm font-medium text-white">{gmailStatus.email}</p>
              <p className="text-xs" style={{ color: "#94A3B8" }}>Connected · Gmail is authorized</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#EF4444" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "#EF4444" }}>Gmail not connected</p>
              <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Ask the BeaconIQ AI assistant to "connect Gmail" to authorize your account.</p>
            </div>
          </div>
        )}
      </div>

      {/* Step 2 */}
      <div className="rounded-xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(59,130,246,0.2)", color: "#3B82F6" }}>2</span>
          <h3 className="text-sm font-semibold text-white">Enter your leads inbox address</h3>
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
              <Label>Confidence threshold</Label>
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

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}