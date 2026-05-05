import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
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
import StripeReturnHandler from "@/components/StripeReturnHandler";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Explicit entry into the app. If the visitor is already authed, go straight
  // to the dashboard. Otherwise, trigger login and return them to /app after.
  const goToApp = () => {
    if (isAuthenticated) {
      navigate("/app");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    base44.auth.redirectToLogin(origin + "/app");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      <StripeReturnHandler />
      <MarketingNav
        onSignIn={goToApp}
        onGetStarted={goToApp}
        isAuthenticated={isAuthenticated}
      />
      <main>
        <HeroSection onGetStarted={goToApp} onSignIn={goToApp} isAuthenticated={isAuthenticated} />
        <SocialProofStrip />
        <ProblemSection />
        <HowItWorks />
        <FeaturesSection />
        <WhyBeaconIQ />
        <PricingSection onGetStarted={goToApp} />
        <CTASection onGetStarted={goToApp} onSignIn={goToApp} isAuthenticated={isAuthenticated} />
      </main>
      <MarketingFooter />
    </div>
  );
}