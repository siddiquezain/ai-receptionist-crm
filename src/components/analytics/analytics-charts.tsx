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
  from: Date
  to: Date
}

export async function AnalyticsCharts({ tenantId, from, to }: AnalyticsChartsProps) {
  const [bookingData, revenueData, aiData, peakData] = await Promise.all([
    getBookingOverview(tenantId, from, to),
    getRevenueData(tenantId, from, to),
    getAIPerformance(tenantId, from, to),
    getPeakHours(tenantId, from, to),
  ])
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
