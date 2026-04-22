import { base44 } from "@/api/base44Client";
import MarketingNav from "@/components/marketing/MarketingNav";
import HeroSection from "@/components/marketing/HeroSection";
import SocialProofStrip from "@/components/marketing/SocialProofStrip";
import ProblemSection from "@/components/marketing/ProblemSection";
import HowItWorks from "@/components/marketing/HowItWorks";
import FeaturesSection from "@/components/marketing/FeaturesSection";
import WhyBeaconIQ from "@/components/marketing/WhyBeaconIQ";
import PricingSection from "@/components/marketing/PricingSection";
import CTASection from "@/components/marketing/CTASection";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function Landing() {
  // After sign-in, the SDK redirects back to the current URL — we want users
  // to land on the app root, which is where the authed Dashboard renders.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const goToApp = () => base44.auth.redirectToLogin(origin + "/");

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      <MarketingNav onSignIn={goToApp} onGetStarted={goToApp} />
      <main>
        <HeroSection onGetStarted={goToApp} onSignIn={goToApp} />
        <SocialProofStrip />
        <ProblemSection />
        <HowItWorks />
        <FeaturesSection />
        <WhyBeaconIQ />
        <PricingSection onGetStarted={goToApp} />
        <CTASection onGetStarted={goToApp} onSignIn={goToApp} />
      </main>
      <MarketingFooter />
    </div>
  );
}