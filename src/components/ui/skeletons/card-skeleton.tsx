import { Skeleton } from "@/components/ui/skeleton"

interface CardSkeletonProps {
  lines?: number
}

export function CardSkeleton({ lines = 3 }: CardSkeletonProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  )
}
