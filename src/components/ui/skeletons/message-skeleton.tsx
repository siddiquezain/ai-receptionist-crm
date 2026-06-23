import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MessageSkeletonProps {
  align?: "left" | "right"
}

export function MessageSkeleton({ align = "left" }: MessageSkeletonProps) {
  return (
    <div className={cn("flex gap-2 px-4 py-2", align === "right" && "flex-row-reverse")}>
      {align === "left" && <Skeleton className="h-7 w-7 shrink-0 rounded-full" />}
      <div className={cn("space-y-1.5 max-w-xs", align === "right" && "items-end flex flex-col")}>
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-10 w-56 rounded-[6px]" />
      </div>
    </div>
  )
}
