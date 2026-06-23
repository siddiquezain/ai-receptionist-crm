import { TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function CustomersLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-36 rounded-[6px]" />
      </div>
      <Skeleton className="h-8 w-64 rounded-[6px]" />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
