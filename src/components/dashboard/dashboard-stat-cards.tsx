import { getStatCards } from "@/lib/dashboard-queries"
import { StatCard } from "./stat-card"

export async function DashboardStatCards({ tenantId }: { tenantId: string }) {
  const stats = await getStatCards(tenantId)
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard {...stats.appointmentsToday} />
      <StatCard {...stats.pendingConfirmations} />
      <StatCard {...stats.openConversations} />
      <StatCard {...stats.conversionRate} />
    </div>
  )
}
