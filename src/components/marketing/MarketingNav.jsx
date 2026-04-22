import { Button } from "@/components/ui/button";
import { Waves } from "lucide-react";

export default function MarketingNav({ onSignIn, onGetStarted }) {
  const links = [
    { label: "Product", href: "#product" },
    { label: "How it works", href: "#how" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Waves className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-white">BeaconIQ</span>
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
        </div>
      </div>
    </header>
  );
}