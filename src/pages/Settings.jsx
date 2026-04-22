import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Loader2, Briefcase, Inbox, Clock, FlaskConical, Settings as SettingsIcon } from "lucide-react";
import EmailIngestionTab from "../components/EmailIngestionTab";
import WorkspaceSettingsTab from "../components/WorkspaceSettingsTab";
import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import DemoDataPanel from "@/components/DemoDataPanel";

const TABS = [
  { id: "profile",   label: "Business Profile", icon: Briefcase, desc: "Tell BeaconIQ about your business so AI can write on-brand outreach." },
  { id: "workspace", label: "Workspace",        icon: SettingsIcon, desc: "Gmail connection and workspace-level settings." },
  { id: "ingestion", label: "Email Setup",      icon: Inbox, desc: "Configure which inbox BeaconIQ watches for inbound leads." },
  { id: "followup",  label: "Follow-up Rules",  icon: Clock, desc: "Auto-remind yourself when leads go cold." },
  { id: "demo",      label: "Demo & Testing",   icon: FlaskConical, desc: "Load sample data and work through the launch QA checklist before go-live." },
];

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    business_name: "", description: "", industry: "", target_audience: "",
    products_services: "", tone: "", sales_goal: "", website: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || 'profile');
  const [followupForm, setFollowupForm] = useState({ followup_enabled: true, no_contact_days: 3, no_reply_days: 5, stale_interested_days: 7 });
  const [savingFollowup, setSavingFollowup] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async user => {
      const workspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1).catch(() => []);
      const workspaceId = workspaces[0]?.id;
      const profileFilter = workspaceId ? { workspace_id: workspaceId } : { created_by: user.email };
      base44.entities.BusinessProfile.filter(profileFilter, "-created_date", 1).then(data => {
        if (data.length > 0) {
          setProfile(data[0]);
          setForm({
            business_name: data[0].business_name || "",
            description: data[0].description || "",
            industry: data[0].industry || "",
            target_audience: data[0].target_audience || "",
            products_services: data[0].products_services || "",
            tone: data[0].tone || "",
            sales_goal: data[0].sales_goal || "",
            website: data[0].website || "",
          });
          setFollowupForm({
            followup_enabled: data[0].followup_enabled !== false,
            no_contact_days: data[0].no_contact_days ?? 3,
            no_reply_days: data[0].no_reply_days ?? 5,
            stale_interested_days: data[0].stale_interested_days ?? 7,
          });
        }
        setLoading(false);
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    const workspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1).catch(() => []);
    const workspaceId = workspaces[0]?.id;
    if (profile) {
      await base44.entities.BusinessProfile.update(profile.id, { ...form, onboarding_complete: true });
    } else {
      const created = await base44.entities.BusinessProfile.create({ ...form, workspace_id: workspaceId, onboarding_complete: true });
      setProfile(created);
    }
    toast({ title: "Business profile saved" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader title="Settings" description="Configure BeaconIQ for your business" />

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-1 px-1 md:mx-0 md:px-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap text-left ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-white hover:bg-secondary border border-transparent"
              }`}
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          <div className="mb-5">
            <h2 className="text-[16px] font-semibold text-white">{currentTab.label}</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">{currentTab.desc}</p>
          </div>

          {activeTab === 'profile' && (
            <div className="surface rounded-xl p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Business Name" required>
                  <Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="Acme Agency" />
                </Field>
                <Field label="Industry" required>
                  <Select value={form.industry} onValueChange={v => setForm({ ...form, industry: v })}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {["Marketing Agency", "Lead Generation", "SaaS", "Consulting", "E-commerce", "Real Estate", "Financial Services", "Other"].map(i => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Business Description" required hint="Used by AI to write personalized outreach">
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what your business does, who you serve, and what makes you unique…" rows={3} />
              </Field>
              <Field label="Target Audience" required>
                <Textarea value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} placeholder="E.g., B2B SaaS founders, e-commerce brands doing $1M+ revenue…" rows={2} />
              </Field>
              <Field label="Products / Services">
                <Textarea value={form.products_services} onChange={e => setForm({ ...form, products_services: e.target.value })} placeholder="List your main offerings…" rows={2} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Communication Tone" required>
                  <Select value={form.tone} onValueChange={v => setForm({ ...form, tone: v })}>
                    <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
                    <SelectContent>
                      {["Professional", "Friendly", "Casual", "Formal", "Persuasive"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Primary Sales Goal" required>
                  <Select value={form.sales_goal} onValueChange={v => setForm({ ...form, sales_goal: v })}>
                    <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                    <SelectContent>
                      {["Book a Meeting", "Schedule a Demo", "Close a Deal", "Get a Response", "Drive Traffic"].map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Website URL">
                <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://yourcompany.com" />
              </Field>
              <div className="pt-2">
                <Button onClick={handleSave} disabled={saving} className="gap-1.5 h-9 text-[13px]">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'workspace' && <WorkspaceSettingsTab />}
          {activeTab === 'ingestion' && <EmailIngestionTab />}
          {activeTab === 'demo' && <DemoDataPanel />}

          {activeTab === 'followup' && (
            <div className="surface rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-5 border-b border-border">
                <div>
                  <p className="text-[14px] font-medium text-white">Enable follow-up reminders</p>
                  <p className="text-[12px] mt-0.5 text-muted-foreground">Automatically notify you when leads go cold</p>
                </div>
                <Switch
                  checked={followupForm.followup_enabled}
                  onCheckedChange={v => setFollowupForm({ ...followupForm, followup_enabled: v })}
                />
              </div>
              {followupForm.followup_enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="No-contact threshold" hint='Lead in "New" with no email sent'>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={1} max={30} value={followupForm.no_contact_days} onChange={e => setFollowupForm({ ...followupForm, no_contact_days: parseInt(e.target.value) || 3 })} />
                      <span className="text-[12px] text-muted-foreground">days</span>
                    </div>
                  </Field>
                  <Field label="No-reply threshold" hint='Email sent but lead still "Contacted"'>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={1} max={30} value={followupForm.no_reply_days} onChange={e => setFollowupForm({ ...followupForm, no_reply_days: parseInt(e.target.value) || 5 })} />
                      <span className="text-[12px] text-muted-foreground">days</span>
                    </div>
                  </Field>
                  <Field label="Stale interested" hint='Lead is "Interested" with no activity'>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={1} max={30} value={followupForm.stale_interested_days} onChange={e => setFollowupForm({ ...followupForm, stale_interested_days: parseInt(e.target.value) || 7 })} />
                      <span className="text-[12px] text-muted-foreground">days</span>
                    </div>
                  </Field>
                </div>
              )}
              <Button
                onClick={async () => {
                  setSavingFollowup(true);
                  if (profile) await base44.entities.BusinessProfile.update(profile.id, followupForm);
                  toast({ title: "Follow-up settings saved" });
                  setSavingFollowup(false);
                }}
                disabled={savingFollowup}
                className="gap-1.5 h-9 text-[13px]"
              >
                {savingFollowup && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingFollowup ? "Saving…" : "Save settings"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <Label className="flex items-center gap-1 text-[12px] font-medium text-foreground/90">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-[11px] mt-1 text-muted-foreground">{hint}</p>}
    </div>
  );
}