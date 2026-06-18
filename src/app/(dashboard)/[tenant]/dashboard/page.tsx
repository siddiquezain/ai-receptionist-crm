import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getStatCards,
  getTrendData,
  getUpcomingAppointments,
  getInboxSnapshot,
} from "@/lib/dashboard-queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments";
import { InboxSnapshot } from "@/components/dashboard/inbox-snapshot";

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

  const [stats, trendData, upcomingAppointments, inboxConversations] =
    await Promise.all([
      getStatCards(tenant.id),
      getTrendData(tenant.id),
      getUpcomingAppointments(tenant.id),
      getInboxSnapshot(tenant.id),
    ]);

  return (
    <div className="space-y-5 p-6">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard {...stats.appointmentsToday} />
        <StatCard {...stats.pendingConfirmations} />
        <StatCard {...stats.openConversations} />
        <StatCard {...stats.conversionRate} />
      </div>

      {/* Trend chart (2/3) + Inbox snapshot (1/3) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <TrendChart data={trendData} />
        </div>
        <InboxSnapshot
          conversations={inboxConversations}
          tenantSlug={tenant.slug}
        />
      </div>

      {/* Upcoming appointments — full width */}
      <UpcomingAppointments
        appointments={upcomingAppointments}
        timezone={tenant.timezone}
      />
    </div>
  );
}
