import { Skeleton } from "@/components/ui/skeleton"

export function ConversationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border)]">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}
