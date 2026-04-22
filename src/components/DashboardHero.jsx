import { Link } from "react-router-dom";
import { FlaskConical, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import moment from "moment";

export default function DashboardHero({ userName, isEmpty }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = userName?.split(" ")?.[0]?.replace(/'s.*$/, "") || "";

  return (
    <div className="relative mb-7 rounded-2xl overflow-hidden surface-elevated">
      {/* subtle gradient wash */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 600px 200px at 0% 0%, rgba(59,130,246,0.08), transparent 70%), radial-gradient(ellipse 500px 180px at 100% 100%, rgba(139,92,246,0.06), transparent 70%)",
        }}
      />
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 px-6 py-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            {moment().format("dddd, MMMM D")}
          </p>
          <h1 className="text-[22px] lg:text-[26px] font-semibold tracking-tight text-white">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Here's what needs your attention today.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search leads…"
              className="h-9 pl-8 w-56 bg-secondary/60 border-border text-[13px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  window.location.href = `/leads?q=${encodeURIComponent(e.currentTarget.value.trim())}`;
                }
              }}
            />
          </div>
          {isEmpty ? (
            <Link
              to="/settings?tab=demo"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium bg-accent/10 text-accent border border-accent/25 hover:bg-accent/15 transition-colors"
            >
              <FlaskConical className="h-3.5 w-3.5" /> Load demo data
            </Link>
          ) : (
            <Link
              to="/leads"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New lead
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}