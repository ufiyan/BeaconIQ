import { Link } from "react-router-dom";
import { Sparkles, Clock, GitPullRequest, ArrowRight, CheckCircle2 } from "lucide-react";

function initials(name) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function NextBestAction({ highIntentLeads = [], reminders = [], reviewCount = 0, scoreMap = {} }) {
  // Priority: high-intent leads → review queue → follow-up reminders → all caught up
  if (highIntentLeads.length > 0) {
    const top = highIntentLeads.slice(0, 3);
    return (
      <Panel
        icon={Sparkles}
        accent="#F59E0B"
        label="High-intent leads need outreach"
        sub={`${highIntentLeads.length} lead${highIntentLeads.length !== 1 ? 's' : ''} with intent score 70+`}
      >
        <div className="divide-y divide-border">
          {top.map(lead => (
            <Link
              key={lead.id}
              to={`/leads/${lead.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {initials(lead.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white truncate">{lead.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{lead.company || lead.email}</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/20 flex-shrink-0">
                {scoreMap[lead.id]}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>
      </Panel>
    );
  }

  if (reviewCount > 0) {
    return (
      <Panel
        icon={GitPullRequest}
        accent="#60A5FA"
        label="Review queue"
        sub={`${reviewCount} email${reviewCount !== 1 ? 's' : ''} awaiting your approval`}
      >
        <div className="p-4">
          <Link
            to="/review-queue"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
          >
            Open review queue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Panel>
    );
  }

  if (reminders.length > 0) {
    const top = reminders.slice(0, 3);
    return (
      <Panel
        icon={Clock}
        accent="#F59E0B"
        label="Follow-up reminders"
        sub={`${reminders.length} lead${reminders.length !== 1 ? 's' : ''} need attention`}
      >
        <div className="divide-y divide-border">
          {top.map(r => (
            <Link
              key={r.id}
              to={`/leads/${r.lead_id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-warning/10 text-warning border border-warning/20">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white truncate">{r.lead_name || "Lead"}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {r.lead_company ? `${r.lead_company} · ` : ""}
                  {r.days_since_contact != null ? `${r.days_since_contact}d since last contact` : "needs follow-up"}
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      icon={CheckCircle2}
      accent="#10B981"
      label="You're all caught up"
      sub="No urgent actions right now. BeaconIQ will surface new leads and reminders here as they come in."
    />
  );
}

function Panel({ icon: Icon, accent, label, sub, children }) {
  return (
    <div className="surface rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next best action</p>
          <p className="text-[13px] font-semibold text-white mt-0.5">{label}</p>
          {sub && <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}