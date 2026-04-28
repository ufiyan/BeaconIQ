import { Link } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { useAuth } from "@/lib/AuthContext";

export default function About() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNav isAuthenticated={isAuthenticated} />

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-6">
            About BeaconIQ
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            BeaconIQ is an inbound lead intelligence platform built for B2B sales and
            marketing teams that want to turn every email reply, web inquiry, and prospect
            signal into a prioritized opportunity. We combine AI-powered intent scoring,
            automated lead capture from your inbox, and follow-up workflows in one focused
            workspace — so revenue teams stop losing warm leads in cluttered inboxes and
            spreadsheets.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-10 mb-3">What we do</h2>
          <p className="text-base text-foreground/85 leading-relaxed mb-6">
            BeaconIQ ingests inbound messages, extracts the people and companies behind
            them, and scores each lead on intent and decision authority. From there, your
            team gets a clean pipeline view, smart follow-up reminders, prospect discovery
            against your Ideal Customer Profile, and AI-generated outreach drafts grounded
            in your business context. Everything runs inside a single workspace you fully
            control.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-10 mb-3">Who it&apos;s for</h2>
          <p className="text-base text-foreground/85 leading-relaxed mb-6">
            BeaconIQ is designed for founders, account executives, sales development
            representatives, and growth marketers at B2B SaaS, agencies, and consulting
            firms. If your team relies on email-driven inbound, demo requests, partner
            referrals, or outbound prospecting against a defined ICP, BeaconIQ helps you
            move faster without bolting together five separate tools.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-10 mb-3">Who builds it</h2>
          <p className="text-base text-foreground/85 leading-relaxed mb-6">
            BeaconIQ is built by a small, independent product team obsessed with revenue
            workflow automation and applied AI. We ship quickly, listen to operators, and
            care about a clean, dependable UI that respects your data. We&apos;d love to
            hear from you — visit our{" "}
            <Link to="/contact" className="text-primary hover:underline">
              contact page
            </Link>{" "}
            to get in touch.
          </p>
        </article>
      </main>

      <MarketingFooter />
    </div>
  );
}