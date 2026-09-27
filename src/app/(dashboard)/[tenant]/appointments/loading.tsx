import { SkeletonText, SkeletonTableRow } from "@/components/ui/skeleton";

export default function AppointmentsLoading() {
  return (
    <div className="space-y-4 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <SkeletonText width={160} size="base" />
        <SkeletonText width={128} size="base" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonText key={i} width={80} className="h-8 rounded-full" />
        ))}
      </div>

      {/* Table shell */}
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
        style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
      >
        {/* Table header */}
        <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
          <div className="flex gap-8">
            {[140, 100, 80, 110, 70].map((w, i) => (
              <SkeletonText key={i} width={w} className="h-3" />
            ))}
          </div>
        </div>
        {/* Table rows */}
        <table className="w-full border-collapse">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
