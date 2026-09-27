import { SkeletonText } from "@/components/ui/skeleton";

function SettingsSectionSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border)]"
      style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="border-b border-[var(--border)] px-6 py-5 space-y-1.5">
        <SkeletonText width={140} size="base" />
        <SkeletonText width={240} />
      </div>
      <div className="space-y-4 px-6 py-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonText width={80} />
            <SkeletonText width="100%" className="h-10 rounded-[var(--radius-md)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="space-y-4 p-6">
      <SkeletonText width={100} size="base" />
      <SettingsSectionSkeleton />
      <SettingsSectionSkeleton />
    </div>
  );
}
