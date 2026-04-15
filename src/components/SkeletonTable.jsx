import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <Skeleton className={c === 0 ? "h-3 w-32" : c === cols - 1 ? "h-3 w-16" : "h-3 w-24"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map((i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>
      {/* Pipeline */}
      <div className="rounded-xl p-5" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
        <Skeleton className="h-3 w-24 mb-4" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[0,1,2,3,4,5].map((i) => (
            <div key={i} className="rounded-lg p-3 flex flex-col items-center gap-2" style={{ background: "hsl(var(--secondary))" }}>
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          ))}
        </div>
      </div>
      {/* Table skeleton */}
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}