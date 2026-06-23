import { StatCardSkeleton, ChartSkeleton, TableSkeleton, ConversationSkeleton } from "@/components/ui/skeletons"

export default function DashboardLoading() {
  return (
    <div className="space-y-5 p-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <ChartSkeleton height={200} />
        </div>
        <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <ConversationSkeleton key={i} />
          ))}
        </div>
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  )
}
