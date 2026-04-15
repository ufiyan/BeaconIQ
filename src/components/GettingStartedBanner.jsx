import { CheckCircle2, Circle } from "lucide-react";
import { Link } from "react-router-dom";

export default function GettingStartedBanner({ workspace, ingestionSettings }) {
  const step1Done = true;
  const step2Done = !!workspace?.gmail_connected;
  const step3Done = !!ingestionSettings?.leads_inbox;

  const steps = [
    { label: "Create your workspace", done: step1Done },
    { label: "Connect your Gmail inbox", done: step2Done },
    { label: "Set your leads email address", done: step3Done },
  ];

  return (
    <div className="rounded-xl p-5 mb-6" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(245,158,11,0.06) 100%)", border: "1px solid rgba(59,130,246,0.3)" }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-3">You're almost ready 🚀</p>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {step.done
                  ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "#10B981" }} />
                  : <Circle className="h-4 w-4 flex-shrink-0" style={{ color: "#475569" }} />}
                <span className="text-sm" style={{ color: step.done ? "#E2E8F0" : "#94A3B8" }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        {!step3Done && (
          <div className="flex-shrink-0">
            <Link
              to="/settings?tab=ingestion"
              style={{ display: "inline-flex", alignItems: "center", padding: "0 12px", height: "32px", borderRadius: "6px", fontSize: "12px", fontWeight: "500", background: "#F59E0B", color: "#000", textDecoration: "none" }}
            >
              Complete setup →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}