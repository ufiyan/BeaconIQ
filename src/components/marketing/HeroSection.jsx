import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HeroSection({ onGetStarted, onSignIn, isAuthenticated }) {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(217 91% 60% / 0.18) 0%, transparent 60%)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 lg:pt-32 lg:pb-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          <span className="text-[12px] text-muted-foreground tracking-wide">
            AI-native inbound lead intelligence
          </span>
        </div>

        <h1 className="text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.05] font-semibold tracking-tight text-white max-w-4xl mx-auto">
          Turn inbound noise into
          <span className="block bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent">
            qualified conversations.
          </span>
        </h1>

        <p className="mt-6 text-[16px] sm:text-[17px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          BeaconIQ captures every inbound lead, scores intent with AI, and drafts
          the first reply — so your team responds in minutes, not days.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={onGetStarted}
            className="h-11 px-6 text-[14px] bg-primary hover:bg-primary/90 gap-2"
          >
            {isAuthenticated ? "Go to app" : "Try BeaconIQ"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {!isAuthenticated && (
            <Button
              onClick={onSignIn}
              variant="outline"
              className="h-11 px-6 text-[14px] border-border bg-secondary/40 hover:bg-secondary"
            >
              Sign in
            </Button>
          )}
        </div>

        <p className="mt-4 text-[12px] text-muted-foreground">
          Free to try · Connect Gmail in under a minute · No credit card required
        </p>

        {/* Product preview card */}
        <div className="mt-16 relative max-w-5xl mx-auto">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-60 blur-xl pointer-events-none" />
          <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur p-2 shadow-2xl">
            <div className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="h-9 border-b border-border bg-secondary/40 flex items-center gap-1.5 px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ml-3 text-[11px] text-muted-foreground font-mono">
                  app.beaconiq.io/dashboard
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 p-5 text-left">
                {[
                  { label: "New leads this week", value: "47", hint: "+12 from last week" },
                  { label: "Avg. response time", value: "4m 12s", hint: "-68% vs industry" },
                  { label: "High-intent signals", value: "14", hint: "Awaiting review" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {s.label}
                    </div>
                    <div className="mt-1.5 text-[22px] font-semibold text-white">{s.value}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5 space-y-2">
                {[
                  { name: "Acme Corp · Sarah Lin", intent: 92, tag: "Immediate" },
                  { name: "Northwind SaaS · David K.", intent: 78, tag: "High" },
                  { name: "Helios Agency · Marco T.", intent: 64, tag: "Medium" },
                ].map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-2.5"
                  >
                    <span className="text-[13px] text-white">{r.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">Intent</span>
                      <span className="text-[13px] font-semibold text-white tabular-nums">
                        {r.intent}
                      </span>
                      <span className="text-[10px] rounded-full px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                        {r.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}