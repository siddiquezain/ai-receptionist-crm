import { BarChart2 } from "lucide-react"
import {
  getBookingOverview,
  getRevenueData,
  getAIPerformance,
  getPeakHours,
} from "@/lib/analytics-queries"
import { BookingOverviewChart } from "./booking-overview-chart"
import { RevenueChart } from "./revenue-chart"
import { AIPerformance } from "./ai-performance"
import { PeakHoursHeatmap } from "./peak-hours-heatmap"

interface AnalyticsChartsProps {
  tenantId: string
  tenantSlug: string
  from: Date
  to: Date
}

export async function AnalyticsCharts({ tenantId, tenantSlug, from, to }: AnalyticsChartsProps) {
  const [bookingData, revenueData, aiData, peakData] = await Promise.all([
    getBookingOverview(tenantId, from, to),
    getRevenueData(tenantId, from, to),
    getAIPerformance(tenantId, from, to),
    getPeakHours(tenantId, from, to),
  ])

  if (bookingData.length === 0) {
    const now = new Date()
    const toStr = now.toISOString().slice(0, 10)
    const last30From = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29))
      .toISOString()
      .slice(0, 10)
    const last90From = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89))
      .toISOString()
      .slice(0, 10)
    const base = `/${tenantSlug}/analytics`

    return (
      <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-8 flex flex-col items-center gap-3 text-center">
        <BarChart2 className="h-8 w-8 text-[var(--text-muted)]" />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">No data in this period</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Try a wider date range</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`${base}?from=${last30From}&to=${toStr}`}
            className="rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            Last 30 days
          </a>
          <a
            href={`${base}?from=${last90From}&to=${toStr}`}
            className="rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            Last 90 days
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <BookingOverviewChart data={bookingData} />
        <RevenueChart data={revenueData} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AIPerformance data={aiData} />
        <PeakHoursHeatmap data={peakData} />
      </div>
    </div>
  )
}
