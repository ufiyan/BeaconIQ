import BrandLockup from "@/components/BrandLockup";
import { Link } from "react-router-dom";

export default function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <BrandLockup size={24} />
          <span className="text-[12px] text-muted-foreground">
            Inbound lead intelligence for B2B teams.
          </span>
        </div>

        <div className="flex items-center gap-6 text-[12px] text-muted-foreground flex-wrap">
          <a href="/#product" className="hover:text-white transition-colors">Product</a>
          <a href="/#features" className="hover:text-white transition-colors">Features</a>
          <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
          <Link to="/about" className="hover:text-white transition-colors">About</Link>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          <span>© {year} BeaconIQ</span>
        </div>
      </div>
    </footer>
  );
}