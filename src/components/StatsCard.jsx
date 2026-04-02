import { cn } from "@/lib/utils";

export default function StatsCard({ icon: Icon, label, value, change, className }) {
  const isPositive = change && change > 0;
  
  return (
    <div className={cn("bg-card rounded-2xl border border-border p-5 transition-shadow hover:shadow-md", className)}>
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {change !== undefined && (
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded-full",
            isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            {isPositive ? "+" : ""}{change}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}