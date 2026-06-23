import { ChartSkeleton, TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-72 rounded-[6px]" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ChartSkeleton height={220} />
        <ChartSkeleton height={220} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TableSkeleton rows={5} cols={4} />
        <TableSkeleton rows={5} cols={3} />
      </div>
      <ChartSkeleton height={160} />
    </div>
  )
}
