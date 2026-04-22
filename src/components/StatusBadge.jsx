const statusStyles = {
  "New":            { bg: "rgba(59,130,246,0.12)",  color: "#60A5FA", border: "rgba(59,130,246,0.25)" },
  "Contacted":      { bg: "rgba(139,92,246,0.12)",  color: "#A78BFA", border: "rgba(139,92,246,0.25)" },
  "Replied":        { bg: "rgba(16,185,129,0.12)",  color: "#34D399", border: "rgba(16,185,129,0.25)" },
  "Interested":     { bg: "rgba(245,158,11,0.12)",  color: "#FBBF24", border: "rgba(245,158,11,0.25)" },
  "Meeting Booked": { bg: "rgba(16,185,129,0.15)",  color: "#10B981", border: "rgba(16,185,129,0.3)" },
  "Closed":         { bg: "rgba(148,163,184,0.1)",  color: "#94A3B8", border: "rgba(148,163,184,0.2)" },
  "Unresponsive":   { bg: "rgba(148,163,184,0.1)",  color: "#94A3B8", border: "rgba(148,163,184,0.2)" },
  "Opted Out":      { bg: "rgba(239,68,68,0.1)",    color: "#F87171", border: "rgba(239,68,68,0.2)" },
  "Draft":          { bg: "rgba(148,163,184,0.1)",  color: "#94A3B8", border: "rgba(148,163,184,0.2)" },
  "Active":         { bg: "rgba(16,185,129,0.12)",  color: "#34D399", border: "rgba(16,185,129,0.25)" },
  "Paused":         { bg: "rgba(245,158,11,0.12)",  color: "#FBBF24", border: "rgba(245,158,11,0.25)" },
  "Completed":      { bg: "rgba(59,130,246,0.12)",  color: "#60A5FA", border: "rgba(59,130,246,0.25)" },
  "Sent":           { bg: "rgba(16,185,129,0.12)",  color: "#34D399", border: "rgba(16,185,129,0.25)" },
  "Delivered":      { bg: "rgba(59,130,246,0.12)",  color: "#60A5FA", border: "rgba(59,130,246,0.25)" },
  "Opened":         { bg: "rgba(139,92,246,0.12)",  color: "#A78BFA", border: "rgba(139,92,246,0.25)" },
  "Bounced":        { bg: "rgba(239,68,68,0.1)",    color: "#F87171", border: "rgba(239,68,68,0.2)" },
  "Failed":         { bg: "rgba(239,68,68,0.1)",    color: "#F87171", border: "rgba(239,68,68,0.2)" },
  "High":           { bg: "rgba(239,68,68,0.1)",    color: "#F87171", border: "rgba(239,68,68,0.2)" },
  "Medium":         { bg: "rgba(245,158,11,0.12)",  color: "#FBBF24", border: "rgba(245,158,11,0.25)" },
  "Low":            { bg: "rgba(148,163,184,0.1)",  color: "#94A3B8", border: "rgba(148,163,184,0.2)" },
};

export default function StatusBadge({ status }) {
  const s = statusStyles[status] || { bg: "rgba(148,163,184,0.1)", color: "#94A3B8", border: "rgba(148,163,184,0.2)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  );
}