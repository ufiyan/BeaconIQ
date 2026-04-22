import { MailSearch, Gauge, PenLine, LineChart } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: MailSearch,
    title: "Capture",
    body: "BeaconIQ monitors your Gmail inbox and extracts context from every inbound lead — name, company, industry, and intent signals — automatically.",
  },
  {
    n: "02",
    icon: Gauge,
    title: "Qualify",
    body: "Our AI scores intent, urgency, and decision authority, so your team knows which conversations to prioritize first.",
  },
  {
    n: "03",
    icon: PenLine,
    title: "Respond",
    body: "Generate personalized first replies grounded in your business profile and the lead's actual message — in one click.",
  },
  {
    n: "04",
    icon: LineChart,
    title: "Track",
    body: "Manage pipeline, follow-ups, and campaign performance in a clean workspace built specifically for inbound.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="bg-card/30 border-y border-border">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-[12px] uppercase tracking-widest text-primary mb-3">How it works</p>
          <h2 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-tight text-white">
            From inbox to qualified conversation, in minutes.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            A focused flow designed for B2B inbound — no bloated CRM, no manual triage.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="relative rounded-xl border border-border bg-background p-6"
            >
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{s.n}</span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}