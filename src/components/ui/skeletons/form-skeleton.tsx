import { Skeleton } from "@/components/ui/skeleton"

interface FormSkeletonProps {
  fields?: number
}

export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <div className="space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full rounded-[6px]" />
        </div>
      ))}
      <Skeleton className="h-9 w-28 rounded-[6px]" />
    </div>
  )
}
