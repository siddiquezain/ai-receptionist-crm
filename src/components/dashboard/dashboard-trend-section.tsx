import { getTrendData, getInboxSnapshot } from "@/lib/dashboard-queries"
import { TrendChart } from "./trend-chart"
import { InboxSnapshot } from "./inbox-snapshot"

interface DashboardTrendSectionProps {
  tenantId: string
  tenantSlug: string
}

export async function DashboardTrendSection({ tenantId, tenantSlug }: DashboardTrendSectionProps) {
  const [trendData, inboxConversations] = await Promise.all([
    getTrendData(tenantId),
    getInboxSnapshot(tenantId),
  ])
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <TrendChart data={trendData} />
      </div>
      <InboxSnapshot conversations={inboxConversations} tenantSlug={tenantSlug} />
    </div>
  )
}
