import { getServicesBreakdown, getStaffPerformance } from "@/lib/analytics-queries"
import { ServicesBreakdown } from "./services-breakdown"
import { StaffPerformance } from "./staff-performance"

interface AnalyticsTablesProps {
  tenantId: string
  from: Date
  to: Date
}

export async function AnalyticsTables({ tenantId, from, to }: AnalyticsTablesProps) {
  const [servicesData, staffData] = await Promise.all([
    getServicesBreakdown(tenantId, from, to),
    getStaffPerformance(tenantId, from, to),
  ])
  return (
    <div className="grid grid-cols-2 gap-4">
      <ServicesBreakdown data={servicesData} />
      <StaffPerformance data={staffData} />
    </div>
  )
}
