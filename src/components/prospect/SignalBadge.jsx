import { TrendingUp, Users, UserCheck, Rocket, DollarSign, Cpu, Newspaper } from "lucide-react";

const SIGNAL_CONFIG = {
  funding: { label: "Funding", icon: DollarSign, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  hiring: { label: "Hiring", icon: Users, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  leadership_change: { label: "New Leadership", icon: UserCheck, color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  product_launch: { label: "Product Launch", icon: Rocket, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  pricing_page: { label: "Pricing Signal", icon: TrendingUp, color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  tech_stack: { label: "Tech Change", icon: Cpu, color: "#06B6D4", bg: "rgba(6,182,212,0.12)" },
  news: { label: "In The News", icon: Newspaper, color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
};

export default function SignalBadge({ type, size = "sm" }) {
  const cfg = SIGNAL_CONFIG[type] || SIGNAL_CONFIG.news;
  const Icon = cfg.icon;
  const isSmall = size === "sm";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-medium"
      style={{
        background: cfg.bg,
        color: cfg.color,
        padding: isSmall ? "2px 8px" : "4px 10px",
        fontSize: isSmall ? "11px" : "12px",
      }}
    >
      <Icon style={{ width: isSmall ? 10 : 12, height: isSmall ? 10 : 12 }} />
      {cfg.label}
    </span>
  );
}