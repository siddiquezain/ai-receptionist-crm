import { CardSkeleton, TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function CustomerDetailLoading() {
  return (
    <div className="grid grid-cols-3 gap-6 p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <CardSkeleton lines={4} />
      </div>
      <div className="col-span-2 space-y-4">
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={4} cols={4} />
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={3} cols={3} />
      </div>
    </div>
  )
}
