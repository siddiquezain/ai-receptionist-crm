import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import { AnalyticsCharts } from "@/components/analytics/analytics-charts"
import { AnalyticsTables } from "@/components/analytics/analytics-tables"
import { ChartSkeleton, TableSkeleton } from "@/components/ui/skeletons"

export const metadata: Metadata = { title: "Analytics" }

interface Props {
  params: Promise<{ tenant: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AnalyticsPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params
  const sp = await searchParams

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, timezone: true },
  })
  if (!tenant) redirect("/login")

  const now = new Date()
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29))
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59))

  const fromParam = typeof sp.from === "string" ? sp.from : null
  const toParam = typeof sp.to === "string" ? sp.to : null
  const from = fromParam ? new Date(fromParam + "T00:00:00Z") : defaultFrom
  const to = toParam ? new Date(toParam + "T23:59:59Z") : defaultTo
  const fromStr = from.toISOString().slice(0, 10)
  const toStr = to.toISOString().slice(0, 10)

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-sm text-[var(--text-muted)]">Business performance overview</p>
        </div>
        <DateRangePicker from={fromStr} to={toStr} />
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ChartSkeleton height={220} />
              <ChartSkeleton height={220} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ChartSkeleton height={160} />
              <ChartSkeleton height={160} />
            </div>
          </div>
        }
      >
        <AnalyticsCharts tenantId={tenant.id} tenantSlug={tenant.slug} from={from} to={to} />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4">
            <TableSkeleton rows={5} cols={4} />
            <TableSkeleton rows={5} cols={3} />
          </div>
        }
      >
        <AnalyticsTables tenantId={tenant.id} from={from} to={to} />
      </Suspense>
    </div>
  )
}
