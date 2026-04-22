import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import moment from "moment";

export default function DashboardHero({ userName, isEmpty }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
          {moment().format("dddd, MMMM D")}
        </p>
        <h1 className="text-[24px] lg:text-[28px] font-semibold tracking-tight text-white">
          {greeting}{userName ? `, ${userName}` : ""}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Here's what needs your attention today.
        </p>
      </div>

      {isEmpty && (
        <Link
          to="/settings?tab=demo"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium bg-accent/10 text-accent border border-accent/25 hover:bg-accent/15 transition-colors flex-shrink-0"
        >
          <FlaskConical className="h-3.5 w-3.5" /> Load demo data
        </Link>
      )}
    </div>
  );
}