import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, CheckCircle, Target, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";

const INDUSTRY_OPTIONS = ["SaaS", "Technology", "Marketing Agency", "E-commerce", "Fintech", "Healthcare", "Real Estate", "Consulting", "Manufacturing", "Retail", "Education", "Media"];
const LOCATION_OPTIONS = ["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Netherlands", "Singapore", "India"];
const ROLE_OPTIONS = ["CEO", "CTO", "CMO", "VP Sales", "VP Marketing", "Head of Growth", "Founder", "Director of Operations", "Product Manager", "Engineering Manager"];
const SIGNAL_OPTIONS = [
  { value: "funding", label: "Funding Rounds" },
  { value: "hiring", label: "Active Hiring" },
  { value: "leadership_change", label: "Leadership Changes" },
  { value: "product_launch", label: "Product Launches" },
  { value: "pricing_page", label: "Pricing Page Activity" },
  { value: "tech_stack", label: "Tech Stack Changes" },
  { value: "news", label: "News & Press" },
];

function TagInput({ values, onChange, placeholder, suggestions = [] }) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const add = (val) => {
    const v = val.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
    setShowSuggestions(false);
  };

  const remove = (idx) => onChange(values.filter((_, i) => i !== idx));
  const filtered = suggestions.filter(s => !values.includes(s) && s.toLowerCase().includes(input.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>
            {v}
            <button onClick={() => remove(i)} className="hover:opacity-70"><Trash2 className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add(input))}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="text-sm"
          />
          <Button type="button" size="sm" onClick={() => add(input)} variant="outline"><Plus className="h-3.5 w-3.5" /></Button>
        </div>
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 rounded-lg shadow-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            {filtered.slice(0, 6).map(s => (
              <button key={s} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors" style={{ color: "#94A3B8" }} onClick={() => add(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SignalToggle({ value, enabled, onToggle }) {
  const sig = SIGNAL_OPTIONS.find(s => s.value === value);
  return (
    <button
      onClick={() => onToggle(value)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
      style={{
        background: enabled ? "rgba(59,130,246,0.15)" : "hsl(var(--background))",
        border: `1px solid ${enabled ? "rgba(59,130,246,0.4)" : "hsl(var(--border))"}`,
        color: enabled ? "#3B82F6" : "#94A3B8",
      }}
    >
      {enabled && <CheckCircle className="h-3.5 w-3.5" />}
      {sig?.label || value}
    </button>
  );
}

export default function ICPSettings() {
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [icps, setIcps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingIcp, setEditingIcp] = useState(null);

  const defaultForm = {
    name: "",
    industries: [],
    company_size_min: 50,
    company_size_max: 500,
    locations: [],
    target_roles: [],
    keywords: [],
    negative_keywords: [],
    signals_enabled: ["funding", "hiring", "product_launch"],
    is_active: true,
  };
  const [form, setForm] = useState(defaultForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadICPs();
  }, []);

  const loadICPs = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const data = await base44.entities.IdealCustomerProfile.filter({ created_by: user.email }, "-created_date", 20);
      setIcps(data);
    } catch (e) {
      toast({ title: "Error loading ICPs", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: "Profile name is required" });
    if (!workspace?.id) return toast({ title: "No workspace found" });
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspace.id,
        name: form.name,
        industries: JSON.stringify(form.industries),
        company_size_min: Number(form.company_size_min),
        company_size_max: Number(form.company_size_max),
        locations: JSON.stringify(form.locations),
        target_roles: JSON.stringify(form.target_roles),
        keywords: JSON.stringify(form.keywords),
        negative_keywords: JSON.stringify(form.negative_keywords),
        signals_enabled: JSON.stringify(form.signals_enabled),
        is_active: form.is_active,
      };
      if (editingIcp) {
        await base44.entities.IdealCustomerProfile.update(editingIcp.id, payload);
        toast({ title: "ICP updated!" });
      } else {
        await base44.entities.IdealCustomerProfile.create(payload);
        toast({ title: "ICP profile created!" });
      }
      setShowForm(false);
      setEditingIcp(null);
      setForm(defaultForm);
      loadICPs();
    } catch (e) {
      toast({ title: "Error saving ICP", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (icp) => {
    setEditingIcp(icp);
    setForm({
      name: icp.name || "",
      industries: safeJson(icp.industries, []),
      company_size_min: icp.company_size_min || 50,
      company_size_max: icp.company_size_max || 500,
      locations: safeJson(icp.locations, []),
      target_roles: safeJson(icp.target_roles, []),
      keywords: safeJson(icp.keywords, []),
      negative_keywords: safeJson(icp.negative_keywords, []),
      signals_enabled: safeJson(icp.signals_enabled, ["funding", "hiring"]),
      is_active: icp.is_active !== false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.IdealCustomerProfile.delete(id);
    toast({ title: "ICP deleted" });
    loadICPs();
  };

  const toggleSignal = (sig) => {
    setForm(f => ({
      ...f,
      signals_enabled: f.signals_enabled.includes(sig)
        ? f.signals_enabled.filter(s => s !== sig)
        : [...f.signals_enabled, sig]
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="h-6 w-6" style={{ color: "#3B82F6" }} />
            ICP Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>Define your Ideal Customer Profile to power prospect discovery.</p>
        </div>
        <Button onClick={() => { setEditingIcp(null); setForm(defaultForm); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Profile
        </Button>
      </div>

      {/* Existing ICPs */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#3B82F6" }} /></div>
      ) : icps.length === 0 && !showForm ? (
        <div className="text-center py-16 rounded-xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <Target className="h-10 w-10 mx-auto mb-3" style={{ color: "#64748B" }} />
          <p className="text-white font-medium mb-1">No ICP profiles yet</p>
          <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>Create your first profile to start discovering prospects</p>
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" /> Create ICP</Button>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {icps.map(icp => (
            <div key={icp.id} className="rounded-xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer" onClick={() => setExpandedId(expandedId === icp.id ? null : icp.id)}>
                <div>
                  <p className="font-semibold text-white">{icp.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                    {safeJson(icp.industries, []).join(", ") || "All industries"} · {icp.company_size_min || 0}–{icp.company_size_max || "∞"} employees
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {icp.is_active && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>Active</span>}
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); handleEdit(icp); }} style={{ color: "#94A3B8" }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); handleDelete(icp.id); }} style={{ color: "#EF4444" }}><Trash2 className="h-4 w-4" /></Button>
                  {expandedId === icp.id ? <ChevronUp className="h-4 w-4" style={{ color: "#64748B" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "#64748B" }} />}
                </div>
              </div>
              {expandedId === icp.id && (
                <div className="px-5 pb-4 grid grid-cols-2 gap-4 text-xs" style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: "12px" }}>
                  <div><span style={{ color: "#64748B" }}>Locations:</span> <span className="text-white">{safeJson(icp.locations, []).join(", ") || "—"}</span></div>
                  <div><span style={{ color: "#64748B" }}>Target Roles:</span> <span className="text-white">{safeJson(icp.target_roles, []).join(", ") || "—"}</span></div>
                  <div><span style={{ color: "#64748B" }}>Keywords:</span> <span className="text-white">{safeJson(icp.keywords, []).join(", ") || "—"}</span></div>
                  <div><span style={{ color: "#64748B" }}>Signals:</span> <span className="text-white">{safeJson(icp.signals_enabled, []).join(", ") || "—"}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl p-6 space-y-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <h2 className="font-bold text-white">{editingIcp ? "Edit ICP Profile" : "New ICP Profile"}</h2>

          <div className="space-y-2">
            <Label>Profile Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mid-Market SaaS Companies" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Employees</Label>
              <Input type="number" value={form.company_size_min} onChange={e => setForm(f => ({ ...f, company_size_min: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Max Employees</Label>
              <Input type="number" value={form.company_size_max} onChange={e => setForm(f => ({ ...f, company_size_max: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Industries</Label>
            <TagInput values={form.industries} onChange={v => setForm(f => ({ ...f, industries: v }))} placeholder="Add industry..." suggestions={INDUSTRY_OPTIONS} />
          </div>

          <div className="space-y-2">
            <Label>Target Locations</Label>
            <TagInput values={form.locations} onChange={v => setForm(f => ({ ...f, locations: v }))} placeholder="Add location..." suggestions={LOCATION_OPTIONS} />
          </div>

          <div className="space-y-2">
            <Label>Target Buyer Personas / Roles</Label>
            <TagInput values={form.target_roles} onChange={v => setForm(f => ({ ...f, target_roles: v }))} placeholder="Add role..." suggestions={ROLE_OPTIONS} />
          </div>

          <div className="space-y-2">
            <Label>Include Keywords</Label>
            <TagInput values={form.keywords} onChange={v => setForm(f => ({ ...f, keywords: v }))} placeholder="e.g. growth, scale, enterprise..." />
          </div>

          <div className="space-y-2">
            <Label>Exclude Keywords</Label>
            <TagInput values={form.negative_keywords} onChange={v => setForm(f => ({ ...f, negative_keywords: v }))} placeholder="e.g. student, personal, nonprofit..." />
          </div>

          <div className="space-y-3">
            <Label>Buying Signals to Track</Label>
            <div className="flex flex-wrap gap-2">
              {SIGNAL_OPTIONS.map(sig => (
                <SignalToggle key={sig.value} value={sig.value} enabled={form.signals_enabled.includes(sig.value)} onToggle={toggleSignal} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Profile"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingIcp(null); setForm(defaultForm); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function safeJson(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch (_) { return fallback; }
}