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
    <section className="border-y border-border bg-card/30">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-center text-[11px] uppercase tracking-widest text-muted-foreground mb-8">
          Why speed + personalization win inbound
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[30px] md:text-[34px] font-semibold text-white tracking-tight">
                {s.value}
              </div>
              <div className="text-[13px] text-white mt-0.5">{s.label}</div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}