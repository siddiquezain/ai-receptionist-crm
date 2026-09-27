import { SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Lower panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-sm)]">
          <SkeletonText width={120} size="base" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonText key={i} width={`${70 + i * 5}%`} />
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-sm)]">
          <SkeletonText width={100} size="base" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonText key={i} width={`${80 - i * 7}%`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
