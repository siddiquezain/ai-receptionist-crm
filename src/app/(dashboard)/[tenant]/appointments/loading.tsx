import { TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function AppointmentsLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-8 w-36 rounded-[6px]" />
      </div>
      {/* filter bar skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-64 rounded-[6px]" />
        <Skeleton className="h-8 w-36 rounded-[6px]" />
        <Skeleton className="h-8 w-36 rounded-[6px]" />
        <Skeleton className="h-8 w-32 rounded-[6px]" />
      </div>
      <TableSkeleton rows={8} cols={6} />
    </div>
  )
}
