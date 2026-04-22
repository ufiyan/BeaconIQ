import { Check } from "lucide-react";

const POINTS = [
  {
    title: "Built for B2B inbound, not everything",
    body: "We don't try to replace your entire CRM. BeaconIQ owns the first 24 hours of every lead — where deals are won or lost.",
  },
  {
    title: "AI that respects your voice",
    body: "Every draft is grounded in your business profile, tone, and goals. The result reads like your best SDR wrote it.",
  },
  {
    title: "Transparent, human-in-the-loop",
    body: "You stay in control. Low-confidence AI extractions route to a review queue; every email is approved before it sends.",
  },
  {
    title: "Works with what you already use",
    body: "Connect Gmail in a minute. No new inbox, no migrations, no training your team on another dashboard.",
  },
];

export default function WhyBeaconIQ() {
  return (
    <section className="bg-card/30 border-y border-border">
      <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
        <div>
          <p className="text-[12px] uppercase tracking-widest text-primary mb-3">Why BeaconIQ</p>
          <h2 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-tight text-white">
            A focused product for the teams that live or die by response time.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            BeaconIQ is purpose-built for B2B marketing agencies, SaaS teams, and
            consulting/service businesses — where a single warm inbound lead can be
            worth tens of thousands in pipeline.
          </p>
          <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
            We believe speed and personalization are no longer optional. They are the
            product.
          </p>
        </div>

        <div className="space-y-4">
          {POINTS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-border bg-background p-5 flex gap-4"
            >
              <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-white">{p.title}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}