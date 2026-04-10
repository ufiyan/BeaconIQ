import { cn } from "@/lib/utils";

const statusStyles = {
  "New":           { bg: "rgba(59,130,246,0.15)",  color: "#3B82F6" },
  "Contacted":     { bg: "rgba(99,102,241,0.15)",  color: "#818CF8" },
  "Replied":       { bg: "rgba(20,184,166,0.15)",  color: "#2DD4BF" },
  "Interested":    { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B" },
  "Meeting Booked":{ bg: "rgba(16,185,129,0.15)",  color: "#10B981" },
  "Closed":        { bg: "rgba(239,68,68,0.15)",   color: "#EF4444" },
  "Unresponsive":  { bg: "rgba(148,163,184,0.1)",  color: "#94A3B8" },
  "Opted Out":     { bg: "rgba(239,68,68,0.1)",    color: "#EF4444" },
  "Draft":         { bg: "rgba(148,163,184,0.1)",  color: "#94A3B8" },
  "Active":        { bg: "rgba(16,185,129,0.15)",  color: "#10B981" },
  "Paused":        { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B" },
  "Completed":     { bg: "rgba(59,130,246,0.15)",  color: "#3B82F6" },
  "Sent":          { bg: "rgba(16,185,129,0.15)",  color: "#10B981" },
  "Delivered":     { bg: "rgba(59,130,246,0.15)",  color: "#3B82F6" },
  "Opened":        { bg: "rgba(139,92,246,0.15)",  color: "#A78BFA" },
  "Bounced":       { bg: "rgba(239,68,68,0.15)",   color: "#EF4444" },
  "Failed":        { bg: "rgba(239,68,68,0.15)",   color: "#EF4444" },
  "High":          { bg: "rgba(239,68,68,0.15)",   color: "#EF4444" },
  "Medium":        { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B" },
  "Low":           { bg: "rgba(148,163,184,0.1)",  color: "#94A3B8" },
};

export default function StatusBadge({ status }) {
  const s = statusStyles[status] || { bg: "rgba(148,163,184,0.1)", color: "#94A3B8" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}