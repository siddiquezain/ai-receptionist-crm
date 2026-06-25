import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <SkeletonText width={120} size="base" />
        <SkeletonText width={180} className="h-9 rounded-[var(--radius-md)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] p-5"
            style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
          >
            <SkeletonText width={140} size="base" className="mb-4" />
            <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
