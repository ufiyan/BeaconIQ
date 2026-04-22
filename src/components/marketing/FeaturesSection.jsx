import {
  Mail,
  Sparkles,
  GitPullRequest,
  Users,
  PenLine,
  Target,
  Bell,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Mail,
    title: "Gmail ingestion",
    body: "Connect your inbox once. BeaconIQ watches for inbound leads and extracts structured context automatically.",
  },
  {
    icon: Sparkles,
    title: "AI intent scoring",
    body: "Every lead gets an intent score, urgency level, and decision-authority signal — so you know who to reply to first.",
  },
  {
    icon: GitPullRequest,
    title: "Review queue",
    body: "Low-confidence extractions land in a human-in-the-loop queue. Approve, edit, or dismiss in seconds.",
  },
  {
    icon: Users,
    title: "Lead management",
    body: "A clean list and Kanban view tuned for inbound. Filter, prioritize, and move leads through the pipeline.",
  },
  {
    icon: PenLine,
    title: "AI email generation",
    body: "Draft personalized first replies grounded in your business profile and the lead's actual message.",
  },
  {
    icon: Target,
    title: "Campaigns",
    body: "Build multi-step follow-up sequences for the leads that don't convert on the first touch.",
  },
  {
    icon: Bell,
    title: "Follow-up reminders",
    body: "Smart reminders surface stale conversations before they go cold. Never lose a warm lead again.",
  },
  {
    icon: Zap,
    title: "Demo-ready",
    body: "Seed a complete demo workspace in one click to test flows without connecting external accounts.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24">
      <div className="max-w-2xl">
        <p className="text-[12px] uppercase tracking-widest text-primary mb-3">Features</p>
        <h2 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-tight text-white">
          Everything you need for inbound — nothing you don't.
        </h2>
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
          A focused toolkit that replaces three bloated tools with one elegant workspace.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <f.icon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="mt-4 text-[14px] font-semibold text-white">{f.title}</h3>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}