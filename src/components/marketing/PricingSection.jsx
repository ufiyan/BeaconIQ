import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    description: "For solo founders testing inbound flows.",
    features: [
      "100 emails / month",
      "Gmail ingestion",
      "AI intent scoring",
      "Review queue",
      "Demo workspace",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$29",
    cadence: "per month",
    description: "For small B2B teams handling steady inbound.",
    features: [
      "1,000 emails / month",
      "AI email generation",
      "Campaigns & follow-ups",
      "Custom templates",
      "Priority email support",
    ],
    cta: "Start Starter",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$79",
    cadence: "per month",
    description: "For agencies and SaaS teams at scale.",
    features: [
      "Unlimited emails",
      "Advanced intent models",
      "Multi-seat workspace",
      "Higher AI limits",
      "Premium support",
    ],
    cta: "Start Pro",
    highlight: false,
  },
];

export default function PricingSection({ onGetStarted }) {
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-[12px] uppercase tracking-widest text-primary mb-3">Pricing</p>
        <h2 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-tight text-white">
          Simple, honest pricing.
        </h2>
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
          Start free. Upgrade when inbound volume grows. Cancel anytime.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-2xl border p-6 flex flex-col ${
              p.highlight
                ? "border-primary/40 bg-gradient-to-b from-primary/5 to-card"
                : "border-border bg-card"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-2.5 left-6 text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-2.5 py-0.5">
                Most popular
              </span>
            )}
            <h3 className="text-[14px] font-semibold text-white">{p.name}</h3>
            <p className="text-[12.5px] text-muted-foreground mt-1">{p.description}</p>

            <div className="mt-5 flex items-end gap-1.5">
              <span className="text-[36px] font-semibold text-white tracking-tight">{p.price}</span>
              <span className="text-[12px] text-muted-foreground pb-2">{p.cadence}</span>
            </div>

            <ul className="mt-6 space-y-2.5 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={onGetStarted}
              className={`mt-6 h-10 w-full text-[13px] ${
                p.highlight ? "bg-primary hover:bg-primary/90" : "bg-secondary hover:bg-secondary/80"
              }`}
              variant={p.highlight ? "default" : "secondary"}
            >
              {p.cta}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}