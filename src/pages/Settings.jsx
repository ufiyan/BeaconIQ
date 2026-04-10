import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Loader2 } from "lucide-react";
import EmailIngestionTab from "../components/EmailIngestionTab";
import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    business_name: "",
    description: "",
    industry: "",
    target_audience: "",
    products_services: "",
    tone: "",
    sales_goal: "",
    website: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || 'profile');
  const [followupForm, setFollowupForm] = useState({ followup_enabled: true, no_contact_days: 3, no_reply_days: 5, stale_interested_days: 7 });
  const [savingFollowup, setSavingFollowup] = useState(false);

  useEffect(() => {
    base44.entities.BusinessProfile.list("-created_date", 1).then(data => {
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
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (profile) {
      await base44.entities.BusinessProfile.update(profile.id, { ...form, onboarding_complete: true });
    } else {
      const created = await base44.entities.BusinessProfile.create({ ...form, onboarding_complete: true });
      setProfile(created);
    }
    toast({ title: "Business profile saved!" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="Settings" description="Configure BeaconIQ for your business" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {[['profile','Business Profile'],['ingestion','Email Ingestion'],['followup','Follow-up Reminders']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeTab === id ? '#3B82F6' : '#94A3B8',
              borderBottom: activeTab === id ? '2px solid #3B82F6' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >{label}</button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Business Name *</Label>
              <Input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} placeholder="Acme Agency" />
            </div>
            <div>
              <Label>Industry *</Label>
              <Select value={form.industry} onValueChange={v => setForm({...form, industry: v})}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {["Marketing Agency", "Lead Generation", "SaaS", "Consulting", "E-commerce", "Real Estate", "Financial Services", "Other"].map(i => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Business Description *</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Describe what your business does, who you serve, and what makes you unique..."
              rows={3}
            />
          </div>

          <div>
            <Label>Target Audience *</Label>
            <Textarea
              value={form.target_audience}
              onChange={e => setForm({...form, target_audience: e.target.value})}
              placeholder="E.g., B2B SaaS founders, e-commerce brands doing $1M+ revenue..."
              rows={2}
            />
          </div>

          <div>
            <Label>Products / Services</Label>
            <Textarea
              value={form.products_services}
              onChange={e => setForm({...form, products_services: e.target.value})}
              placeholder="List your main offerings..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Communication Tone *</Label>
              <Select value={form.tone} onValueChange={v => setForm({...form, tone: v})}>
                <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
                <SelectContent>
                  {["Professional", "Friendly", "Casual", "Formal", "Persuasive"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Primary Sales Goal *</Label>
              <Select value={form.sales_goal} onValueChange={v => setForm({...form, sales_goal: v})}>
                <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                <SelectContent>
                  {["Book a Meeting", "Schedule a Demo", "Close a Deal", "Get a Response", "Drive Traffic"].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Website URL</Label>
            <Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://yourcompany.com" />
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'ingestion' && <EmailIngestionTab />}

      {activeTab === 'followup' && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Enable follow-up reminders</p>
              <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>Automatically remind you when leads go cold</p>
            </div>
            <input
              type="checkbox"
              checked={followupForm.followup_enabled}
              onChange={e => setFollowupForm({ ...followupForm, followup_enabled: e.target.checked })}
              className="h-4 w-4 accent-blue-500"
            />
          </div>
          {followupForm.followup_enabled && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>No-contact threshold (days)</Label>
                  <Input type="number" min={1} max={30} className="mt-1" value={followupForm.no_contact_days}
                    onChange={e => setFollowupForm({ ...followupForm, no_contact_days: parseInt(e.target.value) || 3 })} />
                  <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Lead in "New" with no email sent</p>
                </div>
                <div>
                  <Label>No-reply threshold (days)</Label>
                  <Input type="number" min={1} max={30} className="mt-1" value={followupForm.no_reply_days}
                    onChange={e => setFollowupForm({ ...followupForm, no_reply_days: parseInt(e.target.value) || 5 })} />
                  <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Email sent but lead still "Contacted"</p>
                </div>
                <div>
                  <Label>Stale interested threshold (days)</Label>
                  <Input type="number" min={1} max={30} className="mt-1" value={followupForm.stale_interested_days}
                    onChange={e => setFollowupForm({ ...followupForm, stale_interested_days: parseInt(e.target.value) || 7 })} />
                  <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Lead is "Interested" with no activity</p>
                </div>
              </div>
            </>
          )}
          <Button
            onClick={async () => {
              setSavingFollowup(true);
              if (profile) {
                await base44.entities.BusinessProfile.update(profile.id, followupForm);
              }
              toast({ title: "Follow-up settings saved!" });
              setSavingFollowup(false);
            }}
            disabled={savingFollowup}
            className="gap-2"
          >
            {savingFollowup && <Loader2 className="h-4 w-4 animate-spin" />}
            {savingFollowup ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}