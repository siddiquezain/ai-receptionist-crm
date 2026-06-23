import { ConversationSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function InboxLoading() {
  return (
    <div className="flex h-dvh overflow-hidden">
      {/* conversation list */}
      <div className="w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="p-3 border-b border-[var(--border)]">
          <Skeleton className="h-8 w-full rounded-[6px]" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
      {/* thread pane */}
      <div className="flex flex-1 items-center justify-center bg-[var(--bg)]">
        <Skeleton className="h-5 w-48" />
      </div>
    </div>
  )
}
