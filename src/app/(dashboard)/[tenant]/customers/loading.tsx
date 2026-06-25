import { SkeletonText, SkeletonTableRow } from "@/components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <SkeletonText width={120} size="base" />
        <SkeletonText width={100} size="base" />
      </div>
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
        style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
          <div className="flex gap-8">
            {[140, 120, 100, 110].map((w, i) => (
              <SkeletonText key={i} width={w} className="h-3" />
            ))}
          </div>
        </div>
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
