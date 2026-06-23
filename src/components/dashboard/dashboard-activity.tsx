import { getUpcomingAppointments } from "@/lib/dashboard-queries"
import { UpcomingAppointments } from "./upcoming-appointments"

interface DashboardActivityProps {
  tenantId: string
  timezone: string
}

export async function DashboardActivity({ tenantId, timezone }: DashboardActivityProps) {
  const appointments = await getUpcomingAppointments(tenantId)
  return <UpcomingAppointments appointments={appointments} timezone={timezone} />
}
