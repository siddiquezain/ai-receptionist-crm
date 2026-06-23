import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export function TableSkeleton({ rows = 6, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* header */}
      <div
        className="grid gap-4 border-b border-[var(--border)] px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 border-b border-[var(--border)] last:border-0 px-4 py-3.5"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3.5" style={{ width: `${60 + ((r * cols + c) % 3) * 15}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
