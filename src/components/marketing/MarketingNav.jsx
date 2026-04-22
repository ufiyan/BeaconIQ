import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";

export default function MarketingNav({ onSignIn, onGetStarted, isAuthenticated }) {
  const links = [
    { label: "Product", href: "#product" },
    { label: "How it works", href: "#how" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-[68px] flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5 group">
          <BrandMark size={32} />
          <span className="font-semibold text-[15px] tracking-tight text-white" style={{ letterSpacing: "-0.01em" }}>
            BeaconIQ
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-7">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-muted-foreground hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button
              onClick={onGetStarted}
              className="h-9 text-[13px] bg-primary hover:bg-primary/90"
            >
              Go to app
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={onSignIn}
                className="h-9 text-[13px] text-muted-foreground hover:text-white"
              >
                Sign in
              </Button>
              <Button
                onClick={onGetStarted}
                className="h-9 text-[13px] bg-primary hover:bg-primary/90"
              >
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}