import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-72 shrink-0 border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] p-3">
          <SkeletonText width="100%" className="h-8 rounded-[var(--radius-md)]" />
        </div>
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-3.5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonText width="60%" />
                <SkeletonText width="85%" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thread area */}
      <div className="flex flex-1 flex-col">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <SkeletonText width={160} size="base" />
        </div>
        <div className="flex-1 space-y-4 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              <Skeleton
                className="rounded-[var(--radius-lg)]"
                style={{ height: 48, width: `${40 + (i % 3) * 15}%` }}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] p-3">
          <SkeletonText width="100%" className="h-10 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  );
}
