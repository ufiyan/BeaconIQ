import { Inbox, Clock, MessageSquareDashed, ClipboardList } from "lucide-react";

const PROBLEMS = [
  {
    icon: Inbox,
    title: "Leads arrive as chaos",
    body: "Contact forms, referrals, replies, inbound emails — scattered across inboxes and tools with no single view.",
  },
  {
    icon: Clock,
    title: "Follow-up is too slow",
    body: "By the time a rep sees a hot inquiry, the buyer has already moved on or shortlisted a competitor.",
  },
  {
    icon: MessageSquareDashed,
    title: "Outreach feels generic",
    body: "Teams rely on rushed templates that ignore the actual context of the request, so reply rates stay low.",
  },
  {
    icon: ClipboardList,
    title: "CRM becomes a second job",
    body: "Manual data entry, tagging, and follow-up reminders eat hours that should be spent on actual conversations.",
  },
];

export default function ProblemSection() {
  return (
    <section id="product" className="max-w-6xl mx-auto px-6 py-24">
      <div className="max-w-2xl">
        <p className="text-[12px] uppercase tracking-widest text-primary mb-3">The problem</p>
        <h2 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-tight text-white">
          Inbound is your fastest channel — but your stack wasn't built for it.
        </h2>
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
          B2B teams lose revenue not because they lack leads, but because signals get
          buried and responses are too slow or too generic to convert.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROBLEMS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl border border-border bg-card p-6 hover:border-border/80 transition-colors"
          >
            <div className="h-9 w-9 rounded-lg bg-secondary border border-border flex items-center justify-center">
              <p.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-white">{p.title}</h3>
            <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}