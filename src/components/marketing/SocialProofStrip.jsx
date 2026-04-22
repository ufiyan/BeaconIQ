// Industry research stats — cited directionally, not as BeaconIQ traction.
const STATS = [
  {
    value: "7×",
    label: "higher qualification odds",
    sub: "when leads are responded to within 5 minutes (HBR)",
  },
  {
    value: "6×",
    label: "more replies",
    sub: "with personalized outreach vs. generic emails (industry)",
  },
  {
    value: "35%",
    label: "of rep time lost",
    sub: "to manual CRM & data entry work (research)",
  },
  {
    value: "< 1%",
    label: "of companies",
    sub: "reply to inbound leads within 5 minutes (Drift)",
  },
];

export default function SocialProofStrip() {
  return (
    <section className="relative border-y border-border bg-card/30">
      {/* top hairline gradient — subtle section separation */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-center text-[11px] uppercase tracking-widest text-muted-foreground mb-10">
          Why speed + personalization win inbound
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`text-center px-4 ${i > 0 ? "md:border-l md:border-border/60" : ""}`}
            >
              <div className="text-[32px] md:text-[36px] font-semibold tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-[13px] font-medium text-white mt-1">{s.label}</div>
              <div className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed max-w-[220px] mx-auto">
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}