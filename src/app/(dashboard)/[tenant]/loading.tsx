import { SkeletonCard } from "@/components/ui/skeleton";

export default function TenantLoading() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
