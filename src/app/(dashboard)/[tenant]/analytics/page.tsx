import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getBookingOverview,
  getRevenueData,
  getAIPerformance,
  getPeakHours,
  getServicesBreakdown,
  getStaffPerformance,
} from "@/lib/analytics-queries";
import { BookingOverviewChart } from "@/components/analytics/booking-overview-chart";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { AIPerformance } from "@/components/analytics/ai-performance";
import { PeakHoursHeatmap } from "@/components/analytics/peak-hours-heatmap";
import { ServicesBreakdown } from "@/components/analytics/services-breakdown";
import { StaffPerformance } from "@/components/analytics/staff-performance";
import { DateRangePicker } from "@/components/analytics/date-range-picker";

export const metadata: Metadata = { title: "Analytics" };

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AnalyticsPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, timezone: true },
  });
  if (!tenant) redirect("/login");

  // Default: last 30 days
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

  const fromParam = typeof sp.from === "string" ? sp.from : null;
  const toParam = typeof sp.to === "string" ? sp.to : null;

  const from = fromParam ? new Date(fromParam + "T00:00:00Z") : defaultFrom;
  const to = toParam ? new Date(toParam + "T23:59:59Z") : defaultTo;

  const [bookingData, revenueData, aiData, peakData, servicesData, staffData] =
    await Promise.all([
      getBookingOverview(tenant.id, from, to),
      getRevenueData(tenant.id, from, to),
      getAIPerformance(tenant.id, from, to),
      getPeakHours(tenant.id, from, to),
      getServicesBreakdown(tenant.id, from, to),
      getStaffPerformance(tenant.id, from, to),
    ]);

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-sm text-[var(--text-muted)]">Business performance overview</p>
        </div>
        <DateRangePicker from={fromStr} to={toStr} />
      </div>

      {/* Top row: Booking overview + Revenue */}
      <div className="grid grid-cols-2 gap-4">
        <BookingOverviewChart data={bookingData} />
        <RevenueChart data={revenueData} />
      </div>

      {/* AI performance + Peak hours */}
      <div className="grid grid-cols-2 gap-4">
        <AIPerformance data={aiData} />
        <PeakHoursHeatmap data={peakData} />
      </div>

      {/* Services breakdown + Staff performance */}
      <div className="grid grid-cols-2 gap-4">
        <ServicesBreakdown data={servicesData} />
        <StaffPerformance data={staffData} />
      </div>
    </div>
  );
}
