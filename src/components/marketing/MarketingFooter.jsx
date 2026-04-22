import { Waves } from "lucide-react";

export default function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Waves className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-[13px] text-white tracking-tight">BeaconIQ</span>
          <span className="text-[12px] text-muted-foreground ml-2">
            Inbound lead intelligence for B2B teams.
          </span>
        </div>

        <div className="flex items-center gap-6 text-[12px] text-muted-foreground">
          <a href="#product" className="hover:text-white transition-colors">Product</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <span>© {year} BeaconIQ</span>
        </div>
      </div>
    </footer>
  );
}