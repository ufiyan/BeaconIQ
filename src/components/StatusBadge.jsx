import { cn } from "@/lib/utils";

const statusColors = {
  "New": "bg-blue-50 text-blue-700 border-blue-200",
  "Contacted": "bg-amber-50 text-amber-700 border-amber-200",
  "Replied": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Interested": "bg-violet-50 text-violet-700 border-violet-200",
  "Meeting Booked": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Closed": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Unresponsive": "bg-slate-50 text-slate-500 border-slate-200",
  "Opted Out": "bg-red-50 text-red-600 border-red-200",
  "Draft": "bg-slate-50 text-slate-600 border-slate-200",
  "Active": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Paused": "bg-amber-50 text-amber-700 border-amber-200",
  "Completed": "bg-blue-50 text-blue-700 border-blue-200",
  "Sent": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Delivered": "bg-blue-50 text-blue-700 border-blue-200",
  "Opened": "bg-violet-50 text-violet-700 border-violet-200",
  "Bounced": "bg-red-50 text-red-600 border-red-200",
  "Failed": "bg-red-50 text-red-600 border-red-200",
  "High": "bg-red-50 text-red-600 border-red-200",
  "Medium": "bg-amber-50 text-amber-700 border-amber-200",
  "Low": "bg-slate-50 text-slate-500 border-slate-200",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      statusColors[status] || "bg-slate-50 text-slate-600 border-slate-200"
    )}>
      {status}
    </span>
  );
}