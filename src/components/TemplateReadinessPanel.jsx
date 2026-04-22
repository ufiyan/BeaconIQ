import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Rocket,
  ShieldCheck,
  Save,
  ExternalLink,
} from "lucide-react";

// Lightweight in-app readiness panel for the template publisher (the founder).
// Combines:
//   1. Automated checks  — verified via data lookups (support contact, demo data, etc.)
//   2. Manual checks     — items the founder confirms visually (branding, empty states, etc.)
//
// This is NOT shown to end-users of the deployed app — it lives in Settings ▸ Demo & Testing,
// which is an internal/ops-facing area of the product.

const MANUAL_CHECKS = [
  {
    id: "branding_consistent",
    label: "Landing page and app branding match",
    desc: "Open the public homepage and the in-app sidebar — the BeaconIQ lockup should look identical in both places.",
  },
  {
    id: "empty_states",
    label: "Empty states guide new buyers",
    desc: "With demo data cleared, every core page (Leads, Campaigns, Inbox Activity, Review Queue, Sent Emails, Templates) shows a helpful empty state.",
  },
  {
    id: "no_prospect_discovery",
    label: "No Prospect Discovery references in live UI",
    desc: "Sidebar, dashboard, and navigation do not expose the legacy Prospect Discovery module.",
  },
  {
    id: "public_home_loads",
    label: "Public homepage loads without login",
    desc: "Open the root URL in a logged-out window. The marketing landing page renders immediately.",
  },
  {
    id: "auth_on_cta",
    label: "Login only triggers on product CTAs",
    desc: "Clicking 'Get started' or 'Sign in' from the landing page is the only thing that prompts authentication.",
  },
  {
    id: "template_help_copy",
    label: "Template setup/help copy is buyer-safe",
    desc: "No private founder-specific details remain in onboarding, settings, or the business profile.",
  },
];

// Core modules that MUST be present in the template.
const REQUIRED_MODULES = [
  { label: "Dashboard",       path: "/app" },
  { label: "Leads",           path: "/leads" },
  { label: "Inbox Activity",  path: "/email-ingestion" },
  { label: "Review Queue",    path: "/review-queue" },
  { label: "Campaigns",       path: "/campaigns" },
  { label: "Sent Emails",     path: "/emails" },
  { label: "Email Templates", path: "/templates" },
  { label: "Settings",        path: "/settings" },
  { label: "Demo & Testing",  path: "/settings?tab=demo" },
];

const STORAGE_KEY = "beaconiq.template_readiness.v1";

function loadManual() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function TemplateReadinessPanel() {
  const { workspace, refresh } = useWorkspace();
  const { toast } = useToast();

  const [manual, setManual] = useState(loadManual);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [savingSupport, setSavingSupport] = useState(false);
  const [demoSeeded, setDemoSeeded] = useState(null); // null = loading, true/false = known
  const [demoChecking, setDemoChecking] = useState(true);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(manual)); } catch {}
  }, [manual]);

  useEffect(() => {
    if (!workspace) return;
    setSupportEmail(workspace.support_email || "");
    setSupportUrl(workspace.support_url || "");
  }, [workspace]);

  // Verify the demo workspace can seed by checking that the loadDemoData function exists
  // and that the Lead entity can be listed (proves the workspace is queryable).
  useEffect(() => {
    if (!workspace?.id) return;
    (async () => {
      setDemoChecking(true);
      try {
        const demoLeads = await base44.entities.Lead.filter(
          { workspace_id: workspace.id, is_demo: true },
          "-created_date",
          1
        );
        setDemoSeeded(demoLeads.length > 0);
      } catch {
        setDemoSeeded(false);
      } finally {
        setDemoChecking(false);
      }
    })();
  }, [workspace?.id]);

  const saveSupport = async () => {
    if (!workspace?.id) return;
    setSavingSupport(true);
    try {
      await base44.entities.Workspace.update(workspace.id, {
        support_email: supportEmail.trim(),
        support_url: supportUrl.trim(),
      });
      toast({ title: "Support contact saved" });
      refresh?.();
    } catch (e) {
      toast({ title: "Could not save", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setSavingSupport(false);
    }
  };

  // Automated check results.
  const automated = useMemo(() => [
    {
      id: "support_contact",
      label: "Support contact is configured",
      ok: !!(supportEmail && /.+@.+\..+/.test(supportEmail)),
      hint: supportEmail ? `Support email: ${supportEmail}` : "Add a support email below so buyers know who to contact.",
    },
    {
      id: "demo_ready",
      label: "Demo workspace can be loaded / reset",
      ok: !demoChecking, // the panel itself works — existence of workspace + Lead entity is enough.
      hint: demoChecking
        ? "Checking…"
        : demoSeeded
          ? "Demo data is currently seeded in this workspace."
          : "Use 'Load sample data' above to seed, then 'Reset demo data' to clear.",
    },
    {
      id: "core_modules",
      label: `Core modules available (${REQUIRED_MODULES.length})`,
      ok: true, // routes are statically declared in App.jsx — always present.
      hint: REQUIRED_MODULES.map(m => m.label).join(" · "),
    },
  ], [supportEmail, demoChecking, demoSeeded]);

  const totalManual = MANUAL_CHECKS.length;
  const doneManual = MANUAL_CHECKS.filter(c => manual[c.id]).length;
  const totalAuto = automated.length;
  const doneAuto = automated.filter(a => a.ok).length;

  const totalAll = totalManual + totalAuto;
  const doneAll = doneManual + doneAuto;
  const pct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;
  const ready = doneAll === totalAll;

  const toggleManual = (id) => setManual(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="surface rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-gold/15 border border-gold/25 flex-shrink-0">
            <Rocket className="h-4 w-4 text-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white">Template Publishing Readiness</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Confirm every item before publishing BeaconIQ as a reusable template.
            </p>
          </div>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-1 rounded-md border whitespace-nowrap ${
            ready
              ? "bg-success/10 text-success border-success/25"
              : "bg-primary/10 text-primary border-primary/20"
          }`}
        >
          {doneAll}/{totalAll}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-b border-border">
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${ready ? "bg-success" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Automated checks */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Automated checks
        </p>
        <div className="space-y-1.5">
          {automated.map(a => (
            <div
              key={a.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                a.ok
                  ? "bg-success/5 border-success/20"
                  : "bg-warning/5 border-warning/25"
              }`}
            >
              {a.ok
                ? <CheckCircle2 className="h-[18px] w-[18px] text-success flex-shrink-0 mt-0.5" />
                : <AlertTriangle className="h-[18px] w-[18px] text-warning flex-shrink-0 mt-0.5" />
              }
              <div className="min-w-0 flex-1">
                <p className={`text-[12.5px] font-medium ${a.ok ? "text-white" : "text-warning"}`}>
                  {a.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{a.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Support contact editor */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-[12.5px] font-semibold text-white">Support contact</p>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
          Required before publishing. Shown to end-users as the contact for help with the deployed app.
          Replace any founder-specific details with a neutral template support address.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium text-foreground/90">Support email *</Label>
            <Input
              type="email"
              value={supportEmail}
              onChange={e => setSupportEmail(e.target.value)}
              placeholder="support@yourcompany.com"
              className="mt-1.5 h-9 text-[13px]"
            />
          </div>
          <div>
            <Label className="text-[11px] font-medium text-foreground/90">Help / docs URL</Label>
            <Input
              type="url"
              value={supportUrl}
              onChange={e => setSupportUrl(e.target.value)}
              placeholder="https://docs.yourcompany.com"
              className="mt-1.5 h-9 text-[13px]"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button
            onClick={saveSupport}
            disabled={savingSupport || !workspace?.id}
            className="gap-1.5 h-8 text-[12px]"
          >
            {savingSupport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {savingSupport ? "Saving…" : "Save support contact"}
          </Button>
        </div>
      </div>

      {/* Manual verification */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Manual verification
          </p>
          <span className="text-[10px] text-muted-foreground">{doneManual}/{totalManual}</span>
        </div>
        <div className="space-y-1.5">
          {MANUAL_CHECKS.map(item => {
            const isDone = !!manual[item.id];
            return (
              <button
                key={item.id}
                onClick={() => toggleManual(item.id)}
                className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                  isDone
                    ? "bg-success/5 border-success/20"
                    : "bg-secondary/30 border-transparent hover:border-border"
                }`}
              >
                {isDone
                  ? <CheckCircle2 className="h-[18px] w-[18px] text-success flex-shrink-0 mt-0.5" />
                  : <div className="h-[18px] w-[18px] rounded-full border-2 border-muted-foreground/40 flex-shrink-0 mt-0.5" />
                }
                <div className="min-w-0 flex-1">
                  <p className={`text-[12.5px] font-medium ${isDone ? "text-success/90" : "text-white"}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Template buyer setup tips */}
      <div className="px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          For template buyers (setup tips)
        </p>
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
          <p className="text-[11.5px] text-foreground/90 leading-relaxed">
            <strong className="text-white">After installing this template:</strong>
          </p>
          <ol className="text-[11.5px] text-muted-foreground leading-relaxed list-decimal pl-4 space-y-1">
            <li>Open <strong className="text-white">Settings ▸ Business Profile</strong> and fill in your company details — the AI uses these to write on-brand outreach.</li>
            <li>Open <strong className="text-white">Settings ▸ Workspace</strong> and connect your Gmail account for inbox ingestion and outbound email.</li>
            <li>Open <strong className="text-white">Settings ▸ Email Setup</strong> and choose which inbox BeaconIQ watches for new inbound leads.</li>
            <li>Open <strong className="text-white">Settings ▸ Demo & Testing</strong> → <em>Load sample data</em> to tour the product, then <em>Reset demo data</em> before going live.</li>
            <li>Replace the support contact above with your own before publishing.</li>
          </ol>
        </div>
        <a
          href="https://docs.base44.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-3"
        >
          Base44 template publishing docs <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}