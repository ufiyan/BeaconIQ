import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ClipboardCheck, ArrowRight } from "lucide-react";

const STORAGE_KEY = "beaconiq.launch_qa_checklist.v1";

const SECTIONS = [
  {
    id: "setup",
    title: "Setup & sample data",
    items: [
      { id: "seed",     label: "Load Sample Workspace",                 expected: "Toast confirms creation. Dashboard reloads with seeded data.", path: "/settings?tab=demo" },
      { id: "metrics",  label: "Verify Dashboard metrics populate",     expected: "KPI cards, pipeline overview, and next-best-action all show seeded values.", path: "/" },
    ],
  },
  {
    id: "leads",
    title: "Leads",
    items: [
      { id: "add_lead",     label: "Add a lead manually",              expected: "New lead appears at the top of the Leads list with status = New.", path: "/leads" },
      { id: "import_csv",   label: "Import leads from CSV",            expected: "Import dialog runs to completion and rows appear in the list.",    path: "/leads" },
      { id: "open_lead",    label: "Open a lead detail page",          expected: "Lead profile, intent score, email history, and actions render.",   path: "/leads" },
    ],
  },
  {
    id: "inbox",
    title: "Inbox & review",
    items: [
      { id: "inbox_logs",   label: "Inbox Activity shows logs",         expected: "Activity feed lists sender, subject, and result pill for each entry.", path: "/email-ingestion" },
      { id: "review",       label: "Approve or dismiss a review item",  expected: "Item leaves the queue and status toast appears.",                     path: "/review-queue" },
    ],
  },
  {
    id: "ai",
    title: "AI email",
    items: [
      { id: "generate",     label: "Generate an AI email draft",        expected: "Modal produces subject + body using business profile context.", path: "/leads" },
      { id: "email_log",    label: "Sent Emails renders",               expected: "Table shows recipient, subject, status, and timestamp.",         path: "/emails" },
    ],
  },
  {
    id: "campaigns",
    title: "Campaigns",
    items: [
      { id: "campaign_metrics", label: "Campaigns list shows metrics",  expected: "Each card shows leads, sent, and reply rate.", path: "/campaigns" },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    items: [
      { id: "save_setting", label: "Update and save a setting",          expected: "Save button triggers success toast. Value persists on refresh.", path: "/settings" },
      { id: "reset",        label: "Reset demo data",                    expected: "Toast confirms clear. Workspace returns to empty state.",        path: "/settings?tab=demo" },
    ],
  },
];

const ALL_ITEM_IDS = SECTIONS.flatMap(s => s.items.map(i => i.id));

function loadChecks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function LaunchQAPanel() {
  const [checked, setChecked] = useState(loadChecks);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const resetAll = () => setChecked({});

  const total = ALL_ITEM_IDS.length;
  const done = ALL_ITEM_IDS.filter(id => checked[id]).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="surface rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/15 border border-primary/25 flex-shrink-0">
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white">Launch QA checklist</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Step through each flow before go-live.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
            {done}/{total}
          </span>
          {done > 0 && (
            <button
              onClick={resetAll}
              className="text-[11px] font-medium text-muted-foreground hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-b border-border">
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border">
        {SECTIONS.map(section => (
          <div key={section.id} className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              {section.title}
            </p>
            <div className="space-y-1.5">
              {section.items.map(item => {
                const isDone = !!checked[item.id];
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-colors ${
                      isDone ? "bg-success/5 border border-success/20" : "bg-secondary/30 border border-transparent hover:border-border"
                    }`}
                  >
                    <button
                      onClick={() => toggle(item.id)}
                      className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-white transition-colors"
                      aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
                    >
                      {isDone
                        ? <CheckCircle2 className="h-[18px] w-[18px] text-success" />
                        : <Circle className="h-[18px] w-[18px]" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] font-medium ${isDone ? "text-success/90 line-through decoration-success/30" : "text-white"}`}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Expected: {item.expected}
                      </p>
                    </div>
                    {item.path && (
                      <Link
                        to={item.path}
                        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline whitespace-nowrap flex-shrink-0 mt-0.5"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}