import { Skeleton } from "@/components/ui/skeleton"

interface ChartSkeletonProps {
  height?: number
}

export function ChartSkeleton({ height = 200 }: ChartSkeletonProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-24 rounded-[6px]" />
      </div>
      <Skeleton className="w-full rounded-[6px]" style={{ height }} />
    </div>
  )
}
