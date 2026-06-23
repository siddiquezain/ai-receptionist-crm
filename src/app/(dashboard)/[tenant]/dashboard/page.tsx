import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardStatCards } from "@/components/dashboard/dashboard-stat-cards";
import { DashboardTrendSection } from "@/components/dashboard/dashboard-trend-section";
import { DashboardActivity } from "@/components/dashboard/dashboard-activity";
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export const metadata: Metadata = { title: "Dashboard" };

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { tenant: slug } = await params;

  // Layout already verified auth + membership.
  // Just resolve tenantId for data queries.
  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, timezone: true },
  });

  if (!tenant) redirect("/login");

  return (
    <div className="space-y-5 p-6" id="main-content">
      <Suspense
        fallback={
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <DashboardStatCards tenantId={tenant.id} />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <ChartSkeleton height={200} />
            </div>
            <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] h-[232px]" />
          </div>
        }
      >
        <DashboardTrendSection tenantId={tenant.id} tenantSlug={tenant.slug} />
      </Suspense>

      <Suspense fallback={<TableSkeleton rows={5} cols={5} />}>
        <DashboardActivity tenantId={tenant.id} timezone={tenant.timezone} />
      </Suspense>
    </div>
  );
}
