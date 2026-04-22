import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CTASection({ onGetStarted, onSignIn, isAuthenticated }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-10 lg:p-14 text-center">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.45]"
          style={{
            background:
              "radial-gradient(55% 75% at 50% 0%, hsl(217 91% 60% / 0.18) 0%, transparent 70%)",
          }}
        />
        {/* top hairline */}
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-muted-foreground tracking-wide mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Ready in 5 minutes
          </span>
          <h2 className="text-[30px] sm:text-[38px] font-semibold tracking-tight text-white leading-[1.1]">
            Stop losing inbound to slow replies.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Connect Gmail, seed a demo workspace, and see BeaconIQ qualify and reply
            to a real inbound lead in the next five minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={onGetStarted}
              className="h-11 px-6 text-[14px] bg-primary hover:bg-primary/90 gap-2"
            >
              {isAuthenticated ? "Go to app" : "Get started free"}
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
        </div>
      </div>
    </section>
  );
}