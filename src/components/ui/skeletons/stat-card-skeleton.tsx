import { Skeleton } from "@/components/ui/skeleton"

export function StatCardSkeleton() {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-8 rounded-[6px]" />
      </div>
      <Skeleton className="mb-2 h-8 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  )
}
