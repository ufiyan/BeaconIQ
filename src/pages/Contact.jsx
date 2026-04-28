import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { useAuth } from "@/lib/AuthContext";
import { Mail, MessageSquare, Linkedin } from "lucide-react";

export default function Contact() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNav isAuthenticated={isAuthenticated} />

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Contact us
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Questions, feedback, or partnership ideas? We&apos;d love to hear from you.
            Reach out through any of the channels below and we&apos;ll get back to you
            within one business day.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href="mailto:hello@beaconiq.app"
              className="surface-elevated rounded-xl p-5 hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-white">Email</h2>
              </div>
              <p className="text-sm text-muted-foreground group-hover:text-foreground/90 transition-colors">
                hello@beaconiq.app
              </p>
            </a>

            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
              className="surface-elevated rounded-xl p-5 hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Linkedin className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-white">LinkedIn</h2>
              </div>
              <p className="text-sm text-muted-foreground group-hover:text-foreground/90 transition-colors">
                Follow us & DM the team
              </p>
            </a>

            <a
              href="mailto:support@beaconiq.app"
              className="surface-elevated rounded-xl p-5 hover:border-primary/40 transition-colors group sm:col-span-2"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-white">Support</h2>
              </div>
              <p className="text-sm text-muted-foreground group-hover:text-foreground/90 transition-colors">
                support@beaconiq.app — for product questions, billing, and bug reports.
              </p>
            </a>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}