# Phase 3B – Product Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the appointment SaaS dashboard to production-ready quality across loading states, error handling, search, filtering, sorting, accessibility, responsiveness, and visual consistency — before n8n/WhatsApp integration begins.

**Architecture:** Three layers delivered in order: (1) Foundation — shared skeleton library, route-level loading/error files, design system unification; (2) Core features — global command palette, Inbox filters, sorting, Appointments search; (3) Polish — accessibility, responsive, performance, empty state upgrades. All data fetching remains server-side (no TanStack Query adoption). Suspense is used selectively on data-heavy pages.

**Tech Stack:** Next.js App Router (server components + server actions), Prisma ORM, shadcn/ui (base-nova, @base-ui/react), cmdk, Tailwind CSS v4 (CSS-variable tokens), Supabase Realtime, lucide-react, TypeScript.

## Global Constraints

- Never expose raw error messages or stack traces to users
- All search queries use server-side Prisma with `take: 5` (command palette) or `take: 20` (list pages) — never fetch the full dataset into the browser
- Follow the existing URL-param pattern for filters/sort (`router.replace(pathname + '?' + params)`)
- CSS tokens use `var(--surface)`, `var(--border)`, `var(--text-primary)`, `var(--text-muted)`, `var(--accent)`, `var(--danger)` — no hardcoded colors in new components
- Border radius is `rounded-[6px]` throughout (not Tailwind `rounded`)
- `params` in page components is `Promise<{ tenant: string }>` — always `await params`
- `searchParams` in page components is `Promise<Record<string, string | undefined>>` — always `await searchParams`
- Do NOT modify: n8n config, Evolution API, Supabase schema, auth flow, seed scripts

---

## Layer 1: Foundation

### Task 1: Shared Skeleton Component Library

**Files:**
- Create: `src/components/ui/skeletons/index.ts`
- Create: `src/components/ui/skeletons/stat-card-skeleton.tsx`
- Create: `src/components/ui/skeletons/chart-skeleton.tsx`
- Create: `src/components/ui/skeletons/table-skeleton.tsx`
- Create: `src/components/ui/skeletons/conversation-skeleton.tsx`
- Create: `src/components/ui/skeletons/message-skeleton.tsx`
- Create: `src/components/ui/skeletons/card-skeleton.tsx`
- Create: `src/components/ui/skeletons/form-skeleton.tsx`

**Interfaces:**
- Produces: named exports for use in loading.tsx files (Task 2) and Suspense fallbacks (Tasks 6–8)

- [ ] **Step 1: Create stat-card-skeleton.tsx**

```tsx
// src/components/ui/skeletons/stat-card-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export function StatCardSkeleton() {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-8 rounded-[6px]" />
      </div>
      <Skeleton className="mb-2 h-8 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  )
}
```

- [ ] **Step 2: Create chart-skeleton.tsx**

```tsx
// src/components/ui/skeletons/chart-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

interface ChartSkeletonProps {
  height?: number
}

export function ChartSkeleton({ height = 200 }: ChartSkeletonProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-24 rounded-[6px]" />
      </div>
      <Skeleton className="w-full rounded-[6px]" style={{ height }} />
    </div>
  )
}
```

- [ ] **Step 3: Create table-skeleton.tsx**

```tsx
// src/components/ui/skeletons/table-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export function TableSkeleton({ rows = 6, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* header */}
      <div
        className="grid gap-4 border-b border-[var(--border)] px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 border-b border-[var(--border)] last:border-0 px-4 py-3.5"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3.5" style={{ width: `${60 + ((r * cols + c) % 3) * 15}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create conversation-skeleton.tsx**

```tsx
// src/components/ui/skeletons/conversation-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export function ConversationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border)]">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create message-skeleton.tsx**

```tsx
// src/components/ui/skeletons/message-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MessageSkeletonProps {
  align?: "left" | "right"
}

export function MessageSkeleton({ align = "left" }: MessageSkeletonProps) {
  return (
    <div className={cn("flex gap-2 px-4 py-2", align === "right" && "flex-row-reverse")}>
      {align === "left" && <Skeleton className="h-7 w-7 shrink-0 rounded-full" />}
      <div className={cn("space-y-1.5 max-w-xs", align === "right" && "items-end flex flex-col")}>
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-10 w-56 rounded-[6px]" />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create card-skeleton.tsx**

```tsx
// src/components/ui/skeletons/card-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

interface CardSkeletonProps {
  lines?: number
}

export function CardSkeleton({ lines = 3 }: CardSkeletonProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Create form-skeleton.tsx**

```tsx
// src/components/ui/skeletons/form-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

interface FormSkeletonProps {
  fields?: number
}

export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <div className="space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full rounded-[6px]" />
        </div>
      ))}
      <Skeleton className="h-9 w-28 rounded-[6px]" />
    </div>
  )
}
```

- [ ] **Step 8: Create index barrel**

```ts
// src/components/ui/skeletons/index.ts
export { StatCardSkeleton } from "./stat-card-skeleton"
export { ChartSkeleton } from "./chart-skeleton"
export { TableSkeleton } from "./table-skeleton"
export { ConversationSkeleton } from "./conversation-skeleton"
export { MessageSkeleton } from "./message-skeleton"
export { CardSkeleton } from "./card-skeleton"
export { FormSkeleton } from "./form-skeleton"
```

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/skeletons/
git commit -m "feat: add shared skeleton component library"
```

---

### Task 2: Route-Level loading.tsx Files

**Files:**
- Create: `src/app/(dashboard)/[tenant]/dashboard/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/appointments/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/customers/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/customers/[id]/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/inbox/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/analytics/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/settings/profile/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/settings/working-hours/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/settings/team/loading.tsx`
- Create: `src/app/(dashboard)/[tenant]/settings/ai/loading.tsx`

**Interfaces:**
- Consumes: all skeleton components from `@/components/ui/skeletons`

- [ ] **Step 1: Create dashboard loading.tsx**

```tsx
// src/app/(dashboard)/[tenant]/dashboard/loading.tsx
import { StatCardSkeleton, ChartSkeleton, TableSkeleton, ConversationSkeleton } from "@/components/ui/skeletons"

export default function DashboardLoading() {
  return (
    <div className="space-y-5 p-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <ChartSkeleton height={200} />
        </div>
        <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <ConversationSkeleton key={i} />
          ))}
        </div>
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  )
}
```

- [ ] **Step 2: Create appointments loading.tsx**

```tsx
// src/app/(dashboard)/[tenant]/appointments/loading.tsx
import { TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function AppointmentsLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-8 w-36 rounded-[6px]" />
      </div>
      {/* filter bar skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-64 rounded-[6px]" />
        <Skeleton className="h-8 w-36 rounded-[6px]" />
        <Skeleton className="h-8 w-36 rounded-[6px]" />
        <Skeleton className="h-8 w-32 rounded-[6px]" />
      </div>
      <TableSkeleton rows={8} cols={6} />
    </div>
  )
}
```

- [ ] **Step 3: Create customers loading.tsx**

```tsx
// src/app/(dashboard)/[tenant]/customers/loading.tsx
import { TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function CustomersLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-36 rounded-[6px]" />
      </div>
      <Skeleton className="h-8 w-64 rounded-[6px]" />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
```

- [ ] **Step 4: Create customers/[id] loading.tsx**

```tsx
// src/app/(dashboard)/[tenant]/customers/[id]/loading.tsx
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function CustomerDetailLoading() {
  return (
    <div className="grid grid-cols-3 gap-6 p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <CardSkeleton lines={4} />
      </div>
      <div className="col-span-2 space-y-4">
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={4} cols={4} />
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={3} cols={3} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create inbox loading.tsx**

```tsx
// src/app/(dashboard)/[tenant]/inbox/loading.tsx
import { ConversationSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function InboxLoading() {
  return (
    <div className="flex h-dvh overflow-hidden">
      {/* conversation list */}
      <div className="w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="p-3 border-b border-[var(--border)]">
          <Skeleton className="h-8 w-full rounded-[6px]" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
      {/* thread pane */}
      <div className="flex flex-1 items-center justify-center bg-[var(--bg)]">
        <Skeleton className="h-5 w-48" />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create analytics loading.tsx**

```tsx
// src/app/(dashboard)/[tenant]/analytics/loading.tsx
import { ChartSkeleton, TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-72 rounded-[6px]" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ChartSkeleton height={220} />
        <ChartSkeleton height={220} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TableSkeleton rows={5} cols={4} />
        <TableSkeleton rows={5} cols={3} />
      </div>
      <ChartSkeleton height={160} />
    </div>
  )
}
```

- [ ] **Step 7: Create settings loading.tsx files (one pattern, four files)**

```tsx
// src/app/(dashboard)/[tenant]/settings/profile/loading.tsx
import { FormSkeleton } from "@/components/ui/skeletons"
export default function ProfileLoading() {
  return <div className="max-w-2xl p-6"><FormSkeleton fields={5} /></div>
}
```

```tsx
// src/app/(dashboard)/[tenant]/settings/working-hours/loading.tsx
import { FormSkeleton } from "@/components/ui/skeletons"
export default function WorkingHoursLoading() {
  return <div className="max-w-2xl p-6"><FormSkeleton fields={7} /></div>
}
```

```tsx
// src/app/(dashboard)/[tenant]/settings/team/loading.tsx
import { TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
export default function TeamLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-8 w-32 rounded-[6px]" />
      </div>
      <TableSkeleton rows={3} cols={4} />
    </div>
  )
}
```

```tsx
// src/app/(dashboard)/[tenant]/settings/ai/loading.tsx
import { FormSkeleton } from "@/components/ui/skeletons"
export default function AISettingsLoading() {
  return <div className="max-w-2xl p-6"><FormSkeleton fields={6} /></div>
}
```

- [ ] **Step 8: Verify locally — throttle Network to "Slow 3G" in browser devtools, navigate to /[tenant]/dashboard and confirm the skeleton renders before content**

- [ ] **Step 9: Commit**

```bash
git add src/app/\(dashboard\)/
git commit -m "feat: add route-level loading.tsx skeleton screens for all pages"
```

---

### Task 3: ErrorPage Component + Route-Level error.tsx Files

**Files:**
- Create: `src/components/ui/error-page.tsx`
- Create: `src/app/(dashboard)/[tenant]/dashboard/error.tsx`
- Create: `src/app/(dashboard)/[tenant]/appointments/error.tsx`
- Create: `src/app/(dashboard)/[tenant]/customers/error.tsx`
- Create: `src/app/(dashboard)/[tenant]/customers/[id]/error.tsx`
- Create: `src/app/(dashboard)/[tenant]/inbox/error.tsx`
- Create: `src/app/(dashboard)/[tenant]/analytics/error.tsx`
- Create: `src/app/(dashboard)/[tenant]/settings/profile/error.tsx`
- Create: `src/app/(dashboard)/[tenant]/settings/working-hours/error.tsx`
- Create: `src/app/(dashboard)/[tenant]/settings/team/error.tsx`
- Create: `src/app/(dashboard)/[tenant]/settings/ai/error.tsx`
- Create: `src/app/global-error.tsx`

**Interfaces:**
- Produces: `ErrorPage` used by every `error.tsx`; Next.js `reset` prop passed through

- [ ] **Step 1: Create the shared ErrorPage component**

```tsx
// src/components/ui/error-page.tsx
"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}

export function ErrorPage({
  error,
  reset,
  title = "Something went wrong",
  description = "This page couldn't load. Try again or return to the dashboard.",
  backHref,
  backLabel = "Go to dashboard",
}: ErrorPageProps) {
  useEffect(() => {
    console.error("[ErrorPage]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger)]/10">
        <AlertTriangle className="h-6 w-6 text-[var(--danger)]" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link href={backHref ?? "/"}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create dashboard/error.tsx (template — all route error.tsx files follow this exact pattern)**

```tsx
// src/app/(dashboard)/[tenant]/dashboard/error.tsx
"use client"
import { ErrorPage } from "@/components/ui/error-page"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorPage error={error} reset={reset} />
}
```

Create the same file content for every other route:
- `appointments/error.tsx`
- `customers/error.tsx`
- `customers/[id]/error.tsx`
- `inbox/error.tsx`
- `analytics/error.tsx`
- `settings/profile/error.tsx`
- `settings/working-hours/error.tsx`
- `settings/team/error.tsx`
- `settings/ai/error.tsx`

Each file is identical except the function name (e.g., `AppointmentsError`, `CustomersError`, etc.).

- [ ] **Step 3: Create global-error.tsx**

```tsx
// src/app/global-error.tsx
"use client"
import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center font-sans">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <h1 className="text-lg font-semibold">Application error</h1>
          <p className="text-sm text-gray-500">Something went wrong. Please reload the page.</p>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify — temporarily add `throw new Error("test")` to dashboard/page.tsx, navigate to the dashboard, confirm the friendly ErrorPage renders without a stack trace. Remove the test throw.**

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/error-page.tsx src/app/
git commit -m "feat: add shared ErrorPage component and route-level error.tsx files"
```

---

### Task 4: Design System Unification

**Files:**
- Create: `src/lib/appointment-status.ts`
- Modify: `src/components/appointments/appointment-status-badge.tsx`
- Modify: `src/components/dashboard/upcoming-appointments.tsx`
- Modify: `src/components/appointments/appointments-table.tsx`
- Modify: `src/components/customers/customers-table.tsx`

**Interfaces:**
- Produces: `APPOINTMENT_STATUS_CONFIG` and `getStatusConfig(status)` used by badge and dashboard widget
- Consumes: `AppointmentStatus` enum from `@prisma/client`; shadcn `Table` components from `@/components/ui/table`

- [ ] **Step 1: Create shared appointment-status.ts**

```ts
// src/lib/appointment-status.ts
import { AppointmentStatus } from "@prisma/client"

export const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  },
  NO_SHOW: {
    label: "No Show",
    className: "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  },
}

export function getStatusConfig(status: AppointmentStatus) {
  return APPOINTMENT_STATUS_CONFIG[status]
}
```

- [ ] **Step 2: Update AppointmentStatusBadge to use the shared config**

Open `src/components/appointments/appointment-status-badge.tsx`. Replace whatever local STATUS_CONFIG map exists with an import from the shared module:

```tsx
// src/components/appointments/appointment-status-badge.tsx
import { AppointmentStatus } from "@prisma/client"
import { getStatusConfig } from "@/lib/appointment-status"

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus
  className?: string
}

export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  const config = getStatusConfig(status)
  return (
    <span
      aria-label={`Status: ${config.label}`}
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium ${config.className} ${className ?? ""}`}
    >
      {config.label}
    </span>
  )
}
```

- [ ] **Step 3: Update UpcomingAppointments to use shared config and shadcn Table**

Read `src/components/dashboard/upcoming-appointments.tsx`. Remove its local STATUS map. Import `getStatusConfig` from `@/lib/appointment-status` and the shadcn Table components. Replace the raw `<table>` markup:

```tsx
// src/components/dashboard/upcoming-appointments.tsx
import { Calendar } from "lucide-react"
import { getStatusConfig } from "@/lib/appointment-status"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { UpcomingAppointment } from "@/lib/dashboard-queries"

interface UpcomingAppointmentsProps {
  appointments: UpcomingAppointment[]
  timezone: string
}

export function UpcomingAppointments({ appointments, timezone }: UpcomingAppointmentsProps) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-8 flex flex-col items-center gap-2 text-center">
        <Calendar className="h-8 w-8 text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">No upcoming appointments</p>
      </div>
    )
  }

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Upcoming Appointments</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appt) => {
            const config = getStatusConfig(appt.status)
            return (
              <TableRow key={appt.id}>
                <TableCell className="font-medium">{appt.customer?.name ?? "—"}</TableCell>
                <TableCell>{appt.service.name}</TableCell>
                <TableCell className="text-[var(--text-muted)]">
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone: timezone,
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(appt.startAt))}
                </TableCell>
                <TableCell>{appt.teamMember?.name ?? "—"}</TableCell>
                <TableCell>
                  <span
                    aria-label={`Status: ${config.label}`}
                    className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium ${config.className}`}
                  >
                    {config.label}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 4: Migrate AppointmentsTable to shadcn Table**

Read `src/components/appointments/appointments-table.tsx`. Replace the raw `<table>/<thead>/<tr>/<td>` markup with shadcn Table components, preserving all existing cell content, click handlers, and status badges. The import block should include:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
```

Wrap the entire table in `<div className="overflow-x-auto">` to allow horizontal scroll on small viewports.

- [ ] **Step 5: Migrate CustomersTable to shadcn Table**

Read `src/components/customers/customers-table.tsx`. Apply the same migration: replace raw table markup with shadcn Table components. Preserve all inline-edit, tag-management, and delete-confirmation logic. Wrap in `<div className="overflow-x-auto">`.

- [ ] **Step 6: Verify — load /[tenant]/appointments and /[tenant]/customers in browser. Confirm tables render correctly with correct styles. Confirm AppointmentStatusBadge still shows correct colors.**

- [ ] **Step 7: Commit**

```bash
git add src/lib/appointment-status.ts src/components/
git commit -m "refactor: unify appointment status config and migrate tables to shadcn Table"
```

---

### Task 5: Sidebar, Inbox, and Code Quality Fixes

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/(dashboard)/[tenant]/inbox/page.tsx` or the component that sets the Inbox height

**Interfaces:**
- Produces: clean Sidebar without dead code; correct Inbox height calculation; skip-to-content link

- [ ] **Step 1: Read sidebar.tsx** to see current implementation, workspace stub, and NavItem structure.

- [ ] **Step 2: Remove _workspaces stub from Sidebar**

Delete the `_workspaces` destructured prop and any workspace-switcher rendering code. Keep the rest of the Sidebar intact.

- [ ] **Step 3: Add skip-to-content link**

In the Sidebar (or root dashboard layout), add a visually-hidden skip link as the first element inside `<body>`:

```tsx
{/* In src/app/(dashboard)/[tenant]/layout.tsx, as first child of the layout */}
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-[6px] focus:text-sm focus:font-medium"
>
  Skip to content
</a>
```

Also add `id="main-content"` to the `<main>` element in the layout.

- [ ] **Step 4: Read the Inbox page/component** that sets the height. Find `var(--navbar-height)` usage.

- [ ] **Step 5: Fix Inbox height**

Replace any `h-[calc(100vh-var(--navbar-height,56px))]` with `h-dvh` in the Inbox wrapper. This layout has no top navbar — the sidebar-only pattern means the full viewport height is correct.

```tsx
// Before
<div className="h-[calc(100vh-var(--navbar-height,56px))] flex overflow-hidden">

// After
<div className="h-dvh flex overflow-hidden">
```

- [ ] **Step 6: Verify** — Open Inbox in browser. Confirm the three-pane layout fills the full viewport without overflow or cut-off at the bottom.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/sidebar.tsx src/app/globals.css src/app/
git commit -m "fix: remove workspace stub, fix inbox height, add skip-to-content link"
```

---

### Task 6: Dashboard — Suspense-Wrapped Async Sub-Components

**Files:**
- Create: `src/components/dashboard/dashboard-stat-cards.tsx`
- Create: `src/components/dashboard/dashboard-trend-section.tsx`
- Create: `src/components/dashboard/dashboard-activity.tsx`
- Modify: `src/app/(dashboard)/[tenant]/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getStatCards`, `getTrendData`, `getUpcomingAppointments`, `getInboxSnapshot` from `@/lib/dashboard-queries`; tenant shape `{ id: string; slug: string; timezone: string }`
- Produces: three independently-streaming dashboard sections

- [ ] **Step 1: Create DashboardStatCards async server component**

```tsx
// src/components/dashboard/dashboard-stat-cards.tsx
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
```

- [ ] **Step 2: Create DashboardTrendSection async server component**

```tsx
// src/components/dashboard/dashboard-trend-section.tsx
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
```

- [ ] **Step 3: Create DashboardActivity async server component**

```tsx
// src/components/dashboard/dashboard-activity.tsx
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
```

- [ ] **Step 4: Update dashboard/page.tsx to use Suspense**

```tsx
// src/app/(dashboard)/[tenant]/dashboard/page.tsx
import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardStatCards } from "@/components/dashboard/dashboard-stat-cards"
import { DashboardTrendSection } from "@/components/dashboard/dashboard-trend-section"
import { DashboardActivity } from "@/components/dashboard/dashboard-activity"
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeletons"

export const metadata: Metadata = { title: "Dashboard" }

interface Props {
  params: Promise<{ tenant: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { tenant: slug } = await params

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, timezone: true },
  })

  if (!tenant) redirect("/login")

  return (
    <div className="space-y-5 p-6" id="main-content">
      <Suspense
        fallback={
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        }
      >
        <DashboardStatCards tenantId={tenant.id} />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><ChartSkeleton height={200} /></div>
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
  )
}
```

- [ ] **Step 5: Verify — throttle to Slow 3G. Navigate to /[tenant]/dashboard. Confirm the three sections stream in independently (stat cards appear first if fastest, etc.). No blank white flash.**

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/dashboard-stat-cards.tsx src/components/dashboard/dashboard-trend-section.tsx src/components/dashboard/dashboard-activity.tsx src/app/\(dashboard\)/\[tenant\]/dashboard/page.tsx
git commit -m "feat: add Suspense streaming to dashboard — KPIs, trend, and activity load independently"
```

---

### Task 7: Analytics — Suspense Boundaries Per Section

**Files:**
- Modify: `src/app/(dashboard)/[tenant]/analytics/page.tsx`
- Create: `src/components/analytics/analytics-charts.tsx`
- Create: `src/components/analytics/analytics-tables.tsx`

**Interfaces:**
- Consumes: `getBookingOverview`, `getRevenueData`, `getAIPerformance`, `getPeakHours`, `getServicesBreakdown`, `getStaffPerformance` from `@/lib/analytics-queries`; all accept `(tenantId: string, from: Date, to: Date)`
- Produces: two independently-streaming analytics sections. `DateRangePicker` remains in the page (it's a client component that only updates the URL).

Current page layout (three rows):
- Row 1: `BookingOverviewChart` + `RevenueChart`
- Row 2: `AIPerformance` + `PeakHoursHeatmap`
- Row 3: `ServicesBreakdown` + `StaffPerformance`

Split into `AnalyticsCharts` (rows 1–2, time-series data) and `AnalyticsTables` (row 3, aggregated breakdowns).

- [ ] **Step 1: Create AnalyticsCharts async server component**

```tsx
// src/components/analytics/analytics-charts.tsx
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
```

- [ ] **Step 2: Create AnalyticsTables async server component**

```tsx
// src/components/analytics/analytics-tables.tsx
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
```

- [ ] **Step 3: Update analytics/page.tsx to use Suspense**

Replace the existing `Promise.all([...six queries...])` block. The page now only resolves date params and renders the `DateRangePicker` header synchronously, then streams the two sections:

```tsx
// src/app/(dashboard)/[tenant]/analytics/page.tsx
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
        <AnalyticsCharts tenantId={tenant.id} from={from} to={to} />
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
```

- [ ] **Step 4: Verify — navigate to /[tenant]/analytics with Slow 3G. Confirm the DateRangePicker header renders immediately; charts stream in first; breakdown tables stream after.**

- [ ] **Step 5: Commit**

```bash
git add src/components/analytics/analytics-charts.tsx src/components/analytics/analytics-tables.tsx src/app/\(dashboard\)/\[tenant\]/analytics/page.tsx
git commit -m "feat: add Suspense streaming to analytics — charts and tables load independently"
```

---

### Task 8: Inbox — Suspense on Conversation List and Thread

**Files:**
- Modify: `src/app/(dashboard)/[tenant]/inbox/page.tsx`

**Interfaces:**
- Consumes: `getConversations`, `getConversationDetail`, `getConversationMessages` from `@/lib/inbox-queries`
- Produces: inbox with conversation list and thread streaming independently

- [ ] **Step 1: Read** `src/app/(dashboard)/[tenant]/inbox/page.tsx` to understand how `InboxClient` receives its props.

- [ ] **Step 2: Wrap the InboxClient in Suspense**

The Inbox page does a full data fetch before rendering `InboxClient`. Wrap the entire `InboxClient` render (which requires all conversation data) in a Suspense boundary with a skeleton fallback:

```tsx
// In inbox/page.tsx, where InboxClient is rendered:
import { Suspense } from "react"
import { ConversationSkeleton } from "@/components/ui/skeletons"

// The InboxLoadingFallback approximates the 3-pane layout
function InboxLoadingFallback() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)]">
        {Array.from({ length: 7 }).map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
      <div className="flex flex-1 items-center justify-center bg-[var(--bg)]">
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      </div>
    </div>
  )
}
```

Extract the data-fetching into a separate async server component `InboxDataLoader` so that Suspense has something to suspend on:

```tsx
async function InboxDataLoader({ ... }: Props) {
  // All existing data fetching from the inbox page
  const [conversations, ...rest] = await Promise.all([...])
  return <InboxClient conversations={conversations} ... />
}

// In the page component:
<Suspense fallback={<InboxLoadingFallback />}>
  <InboxDataLoader ... />
</Suspense>
```

- [ ] **Step 3: Verify — throttle to Slow 3G, navigate to /[tenant]/inbox. Confirm the skeleton renders during load instead of a blank screen.**

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/\[tenant\]/inbox/
git commit -m "feat: add Suspense streaming to inbox"
```

---

## Layer 2: Core Features

### Task 9: Shared Sorting Abstraction

**Files:**
- Create: `src/lib/sorting.ts`
- Create: `src/components/ui/sort-dropdown.tsx`

**Interfaces:**
- Produces:
  - `SortOption<T>` type
  - `parseSortParams<T>(searchParams, options, defaultSort)` — used in server page components
  - `useSortParams<T>(options, defaultSort)` — used in client filter components
  - `SortDropdown` component consumed by Tasks 10 and 11

- [ ] **Step 1: Create src/lib/sorting.ts**

```ts
// src/lib/sorting.ts

export interface SortOption<T extends string = string> {
  value: T
  label: string
  defaultDir?: "asc" | "desc"
}

export function parseSortParams<T extends string>(
  searchParams: Record<string, string | undefined>,
  options: SortOption<T>[],
  defaultSort: T
): { sort: T; dir: "asc" | "desc" } {
  const rawSort = searchParams.sort as T | undefined
  const rawDir = searchParams.dir as "asc" | "desc" | undefined
  const matchedOption = options.find((o) => o.value === rawSort)
  const sort = matchedOption ? rawSort! : defaultSort
  const defaultOption = options.find((o) => o.value === sort)
  const dir =
    rawDir === "asc" || rawDir === "desc"
      ? rawDir
      : (defaultOption?.defaultDir ?? "desc")
  return { sort, dir }
}
```

- [ ] **Step 2: Create sort-dropdown.tsx**

```tsx
// src/components/ui/sort-dropdown.tsx
"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { ArrowUpDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SortOption } from "@/lib/sorting"

interface SortDropdownProps<T extends string> {
  options: SortOption<T>[]
  defaultSort: T
}

export function SortDropdown<T extends string>({
  options,
  defaultSort,
}: SortDropdownProps<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSort = (searchParams.get("sort") as T) ?? defaultSort

  const handleChange = useCallback(
    (value: T) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("sort", value)
      params.delete("dir")
      params.delete("page")
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <Select value={currentSort} onValueChange={handleChange}>
      <SelectTrigger className="h-7 w-44 text-xs gap-1">
        <ArrowUpDown className="h-3 w-3 text-[var(--text-muted)]" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/sorting.ts src/components/ui/sort-dropdown.tsx
git commit -m "feat: add shared sorting abstraction (parseSortParams + SortDropdown)"
```

---

### Task 10: Appointments — Sort + Text Search

**Files:**
- Modify: `src/lib/appointments-queries.ts`
- Modify: `src/app/(dashboard)/[tenant]/appointments/page.tsx`
- Modify: `src/components/appointments/appointments-filters.tsx`

**Interfaces:**
- Consumes: `parseSortParams` from `@/lib/sorting`; `SortDropdown` from `@/components/ui/sort-dropdown`
- Produces: `AppointmentFilters` extended with `q?: string`, `sort?: AppointmentSortValue`, `dir?: "asc" | "desc"`

- [ ] **Step 1: Add sort and search types + update getAppointments**

```ts
// src/lib/appointments-queries.ts additions

import type { Prisma } from "@prisma/client"

export type AppointmentSortValue = "date_desc" | "date_asc" | "customer" | "status"

// Extend AppointmentFilters:
export type AppointmentFilters = {
  status?: AppointmentStatus
  from?: Date
  to?: Date
  staffId?: string
  page?: number
  q?: string
  sort?: AppointmentSortValue
  dir?: "asc" | "desc"
}

const APPOINTMENT_ORDER_MAP: Record<
  AppointmentSortValue,
  Prisma.AppointmentOrderByWithRelationInput
> = {
  date_desc: { startAt: "desc" },
  date_asc: { startAt: "asc" },
  customer: { customer: { name: "asc" } },
  status: { status: "asc" },
}

// Inside getAppointments, update the query:
// Replace `orderBy: { startAt: "asc" }` with:
orderBy: APPOINTMENT_ORDER_MAP[filters.sort ?? "date_desc"],

// Add to the where clause (after existing filters):
...(filters.q
  ? {
      OR: [
        { customer: { name: { contains: filters.q, mode: "insensitive" } } },
        { customer: { phone: { contains: filters.q, mode: "insensitive" } } },
        { service: { name: { contains: filters.q, mode: "insensitive" } } },
      ],
    }
  : {}),
```

- [ ] **Step 2: Update appointments/page.tsx to parse q + sort from searchParams**

```tsx
// In the page, read new params:
const q = searchParams.q ?? ""
const { sort, dir } = parseSortParams(
  searchParams,
  APPOINTMENT_SORT_OPTIONS, // defined below
  "date_desc"
)

// Pass to getAppointments:
const { appointments, hasMore } = await getAppointments(tenant.id, {
  status: ..., from: ..., to: ..., staffId: ..., page: ..., q, sort, dir
})
```

Define sort options in the page or a shared const:

```ts
// Can be in appointments/page.tsx or lib/appointments-queries.ts
import type { SortOption } from "@/lib/sorting"
import type { AppointmentSortValue } from "@/lib/appointments-queries"

export const APPOINTMENT_SORT_OPTIONS: SortOption<AppointmentSortValue>[] = [
  { value: "date_desc", label: "Newest first", defaultDir: "desc" },
  { value: "date_asc", label: "Oldest first", defaultDir: "asc" },
  { value: "customer", label: "Customer name", defaultDir: "asc" },
  { value: "status", label: "Status", defaultDir: "asc" },
]
```

Also pass `APPOINTMENT_SORT_OPTIONS` and current `sort` value down to `AppointmentsClient` → `AppointmentsFilters`.

- [ ] **Step 3: Update AppointmentsFilters to include search input and sort dropdown**

```tsx
// src/components/appointments/appointments-filters.tsx additions

// Add to interface:
interface AppointmentsFiltersProps {
  staff: StaffOption[]
  sortOptions: SortOption<AppointmentSortValue>[]
  defaultSort: AppointmentSortValue
}

// Add search input (before the status tabs):
<div className="relative">
  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
  <Input
    type="text"
    placeholder="Search customer, service…"
    defaultValue={searchParams.get("q") ?? ""}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        updateParams({ q: (e.target as HTMLInputElement).value })
      }
    }}
    onBlur={(e) => updateParams({ q: e.target.value })}
    className="h-7 pl-8 w-52 text-xs"
    aria-label="Search appointments"
  />
</div>

// Add sort dropdown (after existing filters):
<SortDropdown options={sortOptions} defaultSort={defaultSort} />
```

- [ ] **Step 4: Verify — search "Emma" in Appointments; confirm Emma's appointment appears. Change sort to "Customer name"; confirm URL has `sort=customer`. Reload and confirm sort persists.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/appointments-queries.ts src/app/\(dashboard\)/\[tenant\]/appointments/ src/components/appointments/
git commit -m "feat: add text search and sorting to Appointments"
```

---

### Task 11: Customers — Sort

**Files:**
- Modify: `src/lib/customers-queries.ts`
- Modify: `src/app/(dashboard)/[tenant]/customers/page.tsx`
- Modify: `src/components/customers/customers-client.tsx` (or wherever the filter bar lives)

**Interfaces:**
- Consumes: `parseSortParams`, `SortDropdown`
- Produces: `CustomerSortValue` type; `getCustomers` extended with `sort` and `dir`

- [ ] **Step 1: Read** `src/lib/customers-queries.ts` to see current `getCustomers` signature.

- [ ] **Step 2: Add sort to getCustomers**

```ts
// src/lib/customers-queries.ts additions

export type CustomerSortValue = "name" | "last_seen" | "appointments"

import type { Prisma } from "@prisma/client"

const CUSTOMER_ORDER_MAP: Record<
  CustomerSortValue,
  Prisma.CustomerOrderByWithRelationInput
> = {
  name: { name: "asc" },
  last_seen: { updatedAt: "desc" },
  appointments: { appointments: { _count: "desc" } },
}

// Extend the filters type and getCustomers query:
// Add `sort?: CustomerSortValue` to the filters param
// Replace hardcoded orderBy with: CUSTOMER_ORDER_MAP[filters.sort ?? "name"]
```

- [ ] **Step 3: Define sort options constant**

```ts
// In customers/page.tsx or lib/customers-queries.ts
export const CUSTOMER_SORT_OPTIONS: SortOption<CustomerSortValue>[] = [
  { value: "name", label: "Name A→Z", defaultDir: "asc" },
  { value: "last_seen", label: "Recently seen", defaultDir: "desc" },
  { value: "appointments", label: "Most appointments", defaultDir: "desc" },
]
```

- [ ] **Step 4: Update customers/page.tsx to parse sort from searchParams and pass to getCustomers**

Follow the same pattern as Task 10 Step 2.

- [ ] **Step 5: Add SortDropdown to the customer filter bar**

In `CustomersClient` (or wherever the search input lives), import and render `<SortDropdown options={CUSTOMER_SORT_OPTIONS} defaultSort="name" />` next to the existing search input.

- [ ] **Step 6: Verify — sort by "Most appointments"; confirm URL updates; confirm customer with most appointments appears first.**

- [ ] **Step 7: Commit**

```bash
git add src/lib/customers-queries.ts src/app/\(dashboard\)/\[tenant\]/customers/ src/components/customers/
git commit -m "feat: add sorting to Customers list"
```

---

### Task 12: Command Palette — Types and globalSearch Server Action

**Files:**
- Create: `src/components/command-palette/types.ts`
- Create: `src/lib/actions/search.ts`

**Interfaces:**
- Produces:
  - `CommandItem`, `CommandSection`, `CommandCtx` types (consumed by Tasks 13–14)
  - `globalSearch(query, tenantId, tenantSlug): Promise<CommandSection[]>` server action

- [ ] **Step 1: Create types.ts**

```ts
// src/components/command-palette/types.ts

export interface MatchRange {
  start: number
  end: number
}

export interface CommandCtx {
  tenantId: string
  tenantSlug: string
}

export interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: "User" | "Calendar" | "MessageSquare" | "LayoutDashboard" | "Settings"
  href: string
  section: string
  matches?: MatchRange[]
}

export interface CommandSection {
  id: string
  label: string
  items: CommandItem[]
}
```

- [ ] **Step 2: Create search.ts server action**

```ts
// src/lib/actions/search.ts
"use server"

import { prisma } from "@/lib/prisma"
import type { CommandCtx, CommandItem, CommandSection, MatchRange } from "@/components/command-palette/types"

function findMatches(text: string, query: string): MatchRange[] {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const matches: MatchRange[] = []
  let start = 0
  while (true) {
    const idx = lower.indexOf(q, start)
    if (idx === -1) break
    matches.push({ start: idx, end: idx + q.length })
    start = idx + 1
  }
  return matches
}

async function searchCustomers(query: string, ctx: CommandCtx): Promise<CommandItem[]> {
  const results = await prisma.customer.findMany({
    where: {
      tenantId: ctx.tenantId,
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
    select: { id: true, name: true, email: true },
  })
  return results.map((c) => ({
    id: `customer-${c.id}`,
    title: c.name,
    subtitle: c.email ?? undefined,
    icon: "User" as const,
    href: `/${ctx.tenantSlug}/customers/${c.id}`,
    section: "customers",
    matches: findMatches(c.name, query),
  }))
}

async function searchAppointments(query: string, ctx: CommandCtx): Promise<CommandItem[]> {
  const results = await prisma.appointment.findMany({
    where: {
      tenantId: ctx.tenantId,
      deletedAt: null,
      OR: [
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { customer: { phone: { contains: query, mode: "insensitive" } } },
        { service: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 5,
    select: {
      id: true,
      startAt: true,
      status: true,
      customer: { select: { name: true } },
      service: { select: { name: true } },
    },
    orderBy: { startAt: "desc" },
  })
  return results.map((a) => ({
    id: `appointment-${a.id}`,
    title: a.customer?.name ?? "Unknown customer",
    subtitle: `${a.service.name} · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(a.startAt))}`,
    icon: "Calendar" as const,
    href: `/${ctx.tenantSlug}/appointments?open=${a.id}`,
    section: "appointments",
    matches: findMatches(a.customer?.name ?? "", query),
  }))
}

async function searchConversations(query: string, ctx: CommandCtx): Promise<CommandItem[]> {
  const results = await prisma.conversation.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: { not: "ARCHIVED" },
      customer: { name: { contains: query, mode: "insensitive" } },
    },
    take: 5,
    select: {
      id: true,
      status: true,
      customer: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  })
  return results.map((c) => ({
    id: `conversation-${c.id}`,
    title: c.customer?.name ?? "Unknown customer",
    subtitle: c.status,
    icon: "MessageSquare" as const,
    href: `/${ctx.tenantSlug}/inbox?conversation=${c.id}`,
    section: "conversations",
    matches: findMatches(c.customer?.name ?? "", query),
  }))
}

export async function globalSearch(
  query: string,
  tenantId: string,
  tenantSlug: string
): Promise<CommandSection[]> {
  if (query.length < 2) return []

  const ctx: CommandCtx = { tenantId, tenantSlug }

  const [customers, appointments, conversations] = await Promise.all([
    searchCustomers(query, ctx),
    searchAppointments(query, ctx),
    searchConversations(query, ctx),
  ])

  return [
    { id: "customers", label: "Customers", items: customers },
    { id: "appointments", label: "Appointments", items: appointments },
    { id: "conversations", label: "Conversations", items: conversations },
  ].filter((s) => s.items.length > 0)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/command-palette/types.ts src/lib/actions/search.ts
git commit -m "feat: add command palette types and globalSearch server action"
```

---

### Task 13: Command Palette — Shell, Provider, and Keyboard Shortcut

**Files:**
- Create: `src/components/command-palette/command-palette-provider.tsx`
- Create: `src/components/command-palette/command-palette.tsx`

**Interfaces:**
- Consumes: `CommandDialog`, `Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty`, `CommandSeparator` from `@/components/ui/command`; `globalSearch` from `@/lib/actions/search`; `CommandSection`, `CommandItem` types from `./types`
- Produces: `CommandPaletteProvider` (wraps layout), `CommandPalette` (the rendered dialog), `useCommandPalette` hook

- [ ] **Step 1: Create command-palette-provider.tsx**

```tsx
// src/components/command-palette/command-palette-provider.tsx
"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface CommandPaletteContextValue {
  open: boolean
  openPalette: () => void
  closePalette: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openPalette = useCallback(() => setOpen(true), [])
  const closePalette = useCallback(() => setOpen(false), [])

  return (
    <CommandPaletteContext.Provider value={{ open, openPalette, closePalette }}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) throw new Error("useCommandPalette must be inside CommandPaletteProvider")
  return ctx
}
```

- [ ] **Step 2: Create command-palette.tsx**

```tsx
// src/components/command-palette/command-palette.tsx
"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  Calendar,
  MessageSquare,
  LayoutDashboard,
  Settings,
  Loader2,
} from "lucide-react"
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command"
import { globalSearch } from "@/lib/actions/search"
import { useCommandPalette } from "./command-palette-provider"
import type { CommandSection, CommandItem as CmdItem, MatchRange } from "./types"

const ICON_MAP = {
  User,
  Calendar,
  MessageSquare,
  LayoutDashboard,
  Settings,
}

function HighlightedText({ text, matches }: { text: string; matches?: MatchRange[] }) {
  if (!matches?.length) return <>{text}</>
  const parts: React.ReactNode[] = []
  let last = 0
  for (const { start, end } of matches) {
    if (start > last) parts.push(<span key={`t-${start}`}>{text.slice(last, start)}</span>)
    parts.push(
      <mark
        key={`m-${start}`}
        className="bg-[var(--accent)]/20 text-[var(--text-primary)] rounded-sm not-italic"
      >
        {text.slice(start, end)}
      </mark>
    )
    last = end
  }
  if (last < text.length) parts.push(<span key="tail">{text.slice(last)}</span>)
  return <>{parts}</>
}

const NAV_ITEMS: CmdItem[] = [
  { id: "nav-dashboard", title: "Dashboard", icon: "LayoutDashboard", href: "dashboard", section: "navigation" },
  { id: "nav-appointments", title: "Appointments", icon: "Calendar", href: "appointments", section: "navigation" },
  { id: "nav-customers", title: "Customers", icon: "User", href: "customers", section: "navigation" },
  { id: "nav-inbox", title: "Inbox", icon: "MessageSquare", href: "inbox", section: "navigation" },
  { id: "nav-settings", title: "Settings", icon: "Settings", href: "settings/profile", section: "navigation" },
]

interface CommandPaletteProps {
  tenantId: string
  tenantSlug: string
}

export function CommandPalette({ tenantId, tenantSlug }: CommandPaletteProps) {
  const { open, openPalette, closePalette } = useCommandPalette()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CommandSection[]>([])
  const [isPending, startTransition] = useTransition()
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const cacheRef = useRef<Map<string, CommandSection[]>>(new Map())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        openPalette()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [openPalette])

  // Focus management
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
    } else {
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
      setQuery("")
      setResults([])
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      return
    }
    if (cacheRef.current.has(query)) {
      setResults(cacheRef.current.get(query)!)
      return
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(query, tenantId, tenantSlug)
        cacheRef.current.set(query, res)
        setResults(res)
      })
    }, 275)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, tenantId, tenantSlug])

  function handleSelect(item: CmdItem) {
    closePalette()
    const href = item.href.startsWith("/")
      ? item.href
      : `/${tenantSlug}/${item.href}`
    router.push(href)
  }

  const showNav = query.length < 2
  const showResults = query.length >= 2 && results.length > 0
  const showEmpty = query.length >= 2 && results.length === 0 && !isPending

  return (
    <CommandDialog open={open} onOpenChange={(v) => !v && closePalette()}>
      <Command shouldFilter={false}>
        <div className="flex items-center border-b border-[var(--border)] px-1">
          <CommandInput
            placeholder="Search customers, appointments, conversations…"
            value={query}
            onValueChange={setQuery}
            aria-label="Global search"
          />
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--text-muted)] shrink-0" />}
        </div>
        <CommandList>
          {showNav && (
            <CommandGroup heading="Navigation">
              {NAV_ITEMS.map((item) => {
                const Icon = ICON_MAP[item.icon]
                return (
                  <CommandItem key={item.id} value={item.id} onSelect={() => handleSelect(item)}>
                    <Icon className="h-4 w-4 text-[var(--text-muted)]" />
                    <span>{item.title}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {showEmpty && (
            <CommandEmpty>No results for "{query}"</CommandEmpty>
          )}

          {showResults &&
            results.map((section, idx) => (
              <>
                {idx > 0 && <CommandSeparator key={`sep-${section.id}`} />}
                <CommandGroup key={section.id} heading={section.label}>
                  {section.items.map((item) => {
                    const Icon = ICON_MAP[item.icon]
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          <span className="truncate text-sm">
                            <HighlightedText text={item.title} matches={item.matches} />
                          </span>
                          {item.subtitle && (
                            <span className="truncate text-xs text-[var(--text-muted)]">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/command-palette/
git commit -m "feat: add command palette provider, shell, and keyboard shortcut"
```

---

### Task 14: Command Palette — Wire Into Dashboard Layout

**Files:**
- Modify: `src/app/(dashboard)/[tenant]/layout.tsx`

**Interfaces:**
- Consumes: `CommandPaletteProvider`, `CommandPalette`; tenant `slug` + `id` from Prisma lookup in layout

- [ ] **Step 1: Read** `src/app/(dashboard)/[tenant]/layout.tsx` to see current layout structure, auth guard, and sidebar mounting.

- [ ] **Step 2: Mount the palette in the layout**

The layout already resolves the tenant for auth. Pass `tenantId` and `tenantSlug` to `CommandPalette`. Wrap the layout children in `CommandPaletteProvider`:

```tsx
// src/app/(dashboard)/[tenant]/layout.tsx additions

import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider"
import { CommandPalette } from "@/components/command-palette/command-palette"

// Inside the layout return, wrap children:
return (
  <CommandPaletteProvider>
    {/* existing sidebar + main layout */}
    <CommandPalette tenantId={tenant.id} tenantSlug={tenant.slug} />
    {children}
  </CommandPaletteProvider>
)
```

- [ ] **Step 3: Verify — press ⌘K (Mac) or Ctrl+K (Windows). Palette opens. Type "ma" — spinner appears; results appear (Maria Santos if seed data is present). Press Enter on a result — navigates correctly. Press Escape — palette closes and focus returns to where it was.**

- [ ] **Step 4: Verify keyboard nav — open palette, type "em", use ↑/↓ to move between results, Enter to select.**

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/\[tenant\]/layout.tsx
git commit -m "feat: wire command palette into dashboard layout"
```

---

### Task 15: Inbox — Client-Side Filter Tabs

**Files:**
- Create: `src/components/inbox/conversation-filters.tsx`
- Modify: `src/components/inbox/inbox-client.tsx`

**Interfaces:**
- Consumes: `ConversationListItem` from `@/lib/inbox-queries`
- Produces: `ConversationFilterState`, `applyConversationFilter`, `ConversationFilters` component

- [ ] **Step 1: Add aiHandled to ConversationListItem**

`ConversationListItem` in `src/lib/inbox-queries.ts` does not currently include `aiHandled`. Add it to the type and to both `select` blocks in `getConversations`:

```ts
// In the ConversationListItem type, add:
aiHandled: boolean;

// In each prisma select block inside getConversations, add:
aiHandled: true,

// In each result mapping, add:
aiHandled: c.aiHandled,
```

- [ ] **Step 2: Create conversation-filters.tsx**

```tsx
// src/components/inbox/conversation-filters.tsx
"use client"

import type { ConversationListItem } from "@/lib/inbox-queries"

export interface ConversationFilterState {
  status: "ALL" | "OPEN" | "ESCALATED" | "RESOLVED"
  aiHandled: boolean | null
  assigned: boolean | null
}

export const DEFAULT_FILTER_STATE: ConversationFilterState = {
  status: "ALL",
  aiHandled: null,
  assigned: null,
}

export function applyConversationFilter(
  conversations: ConversationListItem[],
  filter: ConversationFilterState
): ConversationListItem[] {
  return conversations.filter((c) => {
    if (filter.status !== "ALL" && c.status !== filter.status) return false
    if (filter.aiHandled !== null && c.aiHandled !== filter.aiHandled) return false
    if (filter.assigned !== null) {
      const isAssigned = c.assignedToId !== null
      if (filter.assigned !== isAssigned) return false
    }
    return true
  })
}

const STATUS_TABS = [
  { value: "ALL" as const, label: "All" },
  { value: "OPEN" as const, label: "Open" },
  { value: "ESCALATED" as const, label: "Escalated" },
  { value: "RESOLVED" as const, label: "Resolved" },
]

interface ConversationFiltersProps {
  conversations: ConversationListItem[]
  value: ConversationFilterState
  onChange: (state: ConversationFilterState) => void
}

export function ConversationFilters({
  conversations,
  value,
  onChange,
}: ConversationFiltersProps) {
  function countByStatus(status: ConversationFilterState["status"]) {
    if (status === "ALL") return conversations.length
    return conversations.filter((c) => c.status === status).length
  }

  return (
    <div className="border-b border-[var(--border)] px-3 py-2 space-y-2">
      {/* Status tabs */}
      <div className="flex items-center gap-0.5">
        {STATUS_TABS.map((tab) => {
          const count = countByStatus(tab.value)
          const isActive = value.status === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => onChange({ ...value, status: tab.value })}
              className={`flex items-center gap-1 rounded-[4px] px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1 py-0.5 text-[10px] leading-none ${
                  isActive ? "bg-white/20 text-white" : "bg-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Toggle filters */}
      <div className="flex items-center gap-2">
        <ToggleButton
          active={value.aiHandled === true}
          onClick={() =>
            onChange({ ...value, aiHandled: value.aiHandled === true ? null : true })
          }
          label="AI Handled"
        />
        <ToggleButton
          active={value.aiHandled === false}
          onClick={() =>
            onChange({ ...value, aiHandled: value.aiHandled === false ? null : false })
          }
          label="Human"
        />
        <ToggleButton
          active={value.assigned === true}
          onClick={() =>
            onChange({ ...value, assigned: value.assigned === true ? null : true })
          }
          label="Assigned"
        />
      </div>
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[4px] px-2 py-0.5 text-[11px] font-medium border transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 3: Wire ConversationFilters into InboxClient**

In `src/components/inbox/inbox-client.tsx`:

1. Import `ConversationFilters`, `ConversationFilterState`, `DEFAULT_FILTER_STATE`, `applyConversationFilter`
2. Add state: `const [filter, setFilter] = useState<ConversationFilterState>(DEFAULT_FILTER_STATE)`
3. Compute filtered list: `const filteredConversations = applyConversationFilter(conversations, filter)`
4. Replace the `<ConversationList conversations={conversations}` prop with `conversations={filteredConversations}`
5. Add `<ConversationFilters conversations={conversations} value={filter} onChange={setFilter} />` above the `<ConversationList>` (inside the left panel div)

- [ ] **Step 4: Verify — open Inbox with seed data. Click "Resolved" tab — only resolved conversations show, count badge matches. Click "AI Handled" toggle — further filters. Click "All" — all conversations visible again. Realtime updates continue working (receive a test update if possible, or verify the Supabase subscription still fires).**

- [ ] **Step 5: Commit**

```bash
git add src/lib/inbox-queries.ts src/components/inbox/conversation-filters.tsx src/components/inbox/inbox-client.tsx
git commit -m "feat: add client-side filter tabs to Inbox (status + AI handled + assigned)"
```

---

## Layer 3: Polish

### Task 16: Accessibility Pass

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx` (NavItem `aria-current`)
- Modify: `src/components/inbox/inbox-client.tsx` (message input label)
- Modify: `src/components/appointments/appointment-status-badge.tsx` (already done in Task 4)
- Modify: `src/app/globals.css` (focus-visible styles)
- Audit and fix all icon-only buttons across the app

- [ ] **Step 1: Add aria-current to sidebar NavItem**

In `sidebar.tsx`, the `NavItem` component already detects active state. Add `aria-current="page"` to the active link:

```tsx
// In NavItem, on the <Link> or <a> element:
aria-current={isActive ? "page" : undefined}
```

- [ ] **Step 2: Add aria-label to message input**

In `src/components/inbox/message-input.tsx` (or wherever the compose textarea is), find the `<textarea>` or `<input>` and add:

```tsx
aria-label="Type a message"
```

- [ ] **Step 3: Audit icon-only buttons**

Search for icon-only buttons with no visible text — they need `aria-label`. Common locations:
- Customers table: inline edit, tag remove (×), delete (trash icon) buttons
- Inbox: send button, close/dismiss buttons
- Slide-overs: close button

For each, add `aria-label="[descriptive action]"`:

```tsx
// Example: delete button in customers table
<button aria-label="Delete customer" onClick={handleDelete}>
  <Trash2 className="h-4 w-4" />
</button>
```

- [ ] **Step 4: Ensure focus-visible styles are consistent**

In `src/app/globals.css`, confirm a global focus-visible rule exists. Add if missing:

```css
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
```

This catches any component not already using Tailwind's `focus-visible:ring` pattern.

- [ ] **Step 5: Verify — tab through the Appointments page. Every button and link should show a visible blue outline when focused. Tab to the Sidebar — active link should have aria-current="page" (check with browser dev tools).**

- [ ] **Step 6: Commit**

```bash
git add src/components/ src/app/globals.css
git commit -m "fix: accessibility — aria-labels, aria-current, focus-visible styles"
```

---

### Task 17: Responsive Design Pass

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx` (icon-only collapse at < 768px)
- Modify: `src/components/inbox/inbox-client.tsx` (hide right panel at < 1024px)
- Audit and add `overflow-x-auto` wrapper to remaining table containers

- [ ] **Step 1: Sidebar — icon-only collapse at md breakpoint**

In `sidebar.tsx`, add responsive classes so the sidebar collapses to 48px at `< 768px`. Each NavItem shows only its icon with a Tooltip:

```tsx
// Sidebar container:
<aside className="flex h-dvh w-[220px] md:w-[220px] w-12 flex-col border-r border-[var(--border)] bg-[var(--surface)] shrink-0 transition-all">

// NavItem — hide text label on small screens, show only icon:
<Link href={href} className="flex items-center gap-2.5 px-3 py-2 ...">
  <Icon className="h-4 w-4 shrink-0" />
  <span className="hidden md:block truncate text-sm">{label}</span>
</Link>
```

Wrap each collapsed NavItem in a `<Tooltip>` showing the label when sidebar is collapsed (icon-only).

- [ ] **Step 2: Inbox — hide right panel at < 1024px**

In `inbox-client.tsx`, add `hidden lg:block` to the right panel wrapper:

```tsx
// Right panel:
<div className="hidden lg:block w-[320px] shrink-0 border-l border-[var(--border)] bg-[var(--surface)]">
  {/* ... */}
</div>
```

- [ ] **Step 3: Confirm all table containers have overflow-x-auto**

After Task 4 (table migration), all four table instances should already have `overflow-x-auto` wrappers. Verify and add where missing.

- [ ] **Step 4: Verify — resize browser to 768px. Sidebar collapses to icons. Resize to 1024px — Inbox right panel hides. Tables scroll horizontally instead of clipping.**

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/sidebar.tsx src/components/inbox/inbox-client.tsx src/components/
git commit -m "fix: responsive design — sidebar collapses to icons, inbox right panel hides on smaller screens"
```

---

### Task 18: Performance — Async Customer Search in Slide-Over

**Files:**
- Create: `src/lib/actions/customers.ts` (or add to existing `src/lib/actions/customers.ts`)
- Modify: `src/components/appointments/appointment-slide-over.tsx`
- Modify: `src/app/(dashboard)/[tenant]/appointments/page.tsx` (remove `getCustomerOptions` prefetch)

**Interfaces:**
- Produces: `searchCustomersAction(query, tenantId)` server action returning `CustomerOption[]`

- [ ] **Step 1: Add searchCustomersAction to customers actions**

Read `src/lib/actions/customers.ts` to see the current structure. Add:

```ts
// src/lib/actions/customers.ts addition
"use server"
import { prisma } from "@/lib/prisma"
import type { CustomerOption } from "@/lib/appointments-queries"

export async function searchCustomersAction(
  query: string,
  tenantId: string
): Promise<CustomerOption[]> {
  if (query.length < 2) return []
  return prisma.customer.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
  })
}
```

- [ ] **Step 2: Update AppointmentSlideOver to use async search**

Read `src/components/appointments/appointment-slide-over.tsx`. Find where `customers` prop (the pre-loaded 100) is used for the customer search input. Replace with local state + debounced server action call:

```tsx
// In the slide-over, replace customers prop usage with:
const [customerQuery, setCustomerQuery] = useState("")
const [customerResults, setCustomerResults] = useState<CustomerOption[]>([])
const [searchingCustomers, setSearchingCustomers] = useState(false)
const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

function handleCustomerSearch(q: string) {
  setCustomerQuery(q)
  if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current)
  if (q.length < 2) { setCustomerResults([]); return }
  customerDebounceRef.current = setTimeout(async () => {
    setSearchingCustomers(true)
    const results = await searchCustomersAction(q, tenantId)
    setCustomerResults(results)
    setSearchingCustomers(false)
  }, 275)
}
```

- [ ] **Step 3: Remove getCustomerOptions prefetch from appointments/page.tsx**

In `src/app/(dashboard)/[tenant]/appointments/page.tsx`, remove the `getCustomerOptions(tenant.id)` call from the `Promise.all`. Remove the `customerOptions` prop from `AppointmentsClient`. Update `AppointmentsClient` and `AppointmentSlideOver` props to no longer accept `customers: CustomerOption[]`.

- [ ] **Step 4: Verify — open Appointments page, open Network tab in devtools. Confirm no large customer list prefetch on page load. Open the create slide-over, type "Em" in the customer field — confirm a search request fires and results appear.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/customers.ts src/components/appointments/ src/app/\(dashboard\)/\[tenant\]/appointments/
git commit -m "perf: replace 100-customer prefetch with debounced async search in appointment slide-over"
```

---

### Task 19: Empty State Enhancements

**Files:**
- Modify: `src/components/analytics/` (no-data state for analytics date range)
- Modify: `src/components/customers/` (customer detail empty appointments CTA)
- Modify: `src/components/inbox/conversation-filters.tsx` (empty filter state)

- [ ] **Step 1: Analytics — no data in date range**

Read the analytics charts that currently receive data. Find where `data.length === 0` would produce a blank chart. Add empty state in the relevant chart components or in `AnalyticsOverview`:

```tsx
// If bookingData is empty (no appointments in range):
if (bookingData.length === 0) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-8 flex flex-col items-center gap-3 text-center">
      <BarChart2 className="h-8 w-8 text-[var(--text-muted)]" />
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">No data in this period</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Try a wider date range</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => router.replace(`${pathname}?from=...&to=...`)}>
          Last 30 days
        </button>
        <button onClick={() => router.replace(`${pathname}?from=...&to=...`)}>
          Last 90 days
        </button>
      </div>
    </div>
  )
}
```

Note: the `DateRangePicker` is already a client component — add the preset buttons there instead of the chart if it's cleaner. Check the current `DateRangePicker` implementation.

- [ ] **Step 2: Customer detail — empty appointments state with CTA**

Read `src/components/customers/customer-appointments.tsx`. Find the empty state. Update:

```tsx
// Empty state in CustomerAppointments:
if (appointments.length === 0) {
  return (
    <div className="py-8 flex flex-col items-center gap-3 text-center">
      <Calendar className="h-7 w-7 text-[var(--text-muted)]" />
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">No appointments yet</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          This customer hasn't booked any appointments.
        </p>
      </div>
      <Button size="sm" asChild>
        <Link href={`/${tenantSlug}/appointments?customerId=${customerId}`}>
          Book appointment
        </Link>
      </Button>
    </div>
  )
}
```

Pass `tenantSlug` and `customerId` to `CustomerAppointments` — check if they're already available in the customer detail page.

- [ ] **Step 3: Inbox — empty state when filter returns no results**

In `InboxClient`, after applying `applyConversationFilter`, if `filteredConversations.length === 0` and conversations.length > 0, render a filter-specific empty state inside the conversation list area:

```tsx
// In the ConversationList or in InboxClient where the list renders:
if (filteredConversations.length === 0) {
  const statusLabel = filter.status === "ALL" ? "" : filter.status.toLowerCase()
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
      <MessageSquare className="h-7 w-7 text-[var(--text-muted)]" />
      <p className="text-sm text-[var(--text-muted)]">
        {filter.status !== "ALL"
          ? `No ${statusLabel} conversations`
          : "No conversations match the current filters"}
      </p>
      <button
        onClick={() => onChange(DEFAULT_FILTER_STATE)}
        className="text-xs text-[var(--accent)] hover:underline"
      >
        Clear filters
      </button>
    </div>
  )
}
```

Pass `onChange` and `DEFAULT_FILTER_STATE` as needed.

- [ ] **Step 4: Verify — in Analytics, set a date range with no data; confirm the empty state renders with preset buttons. On Customer detail with no appointments, confirm the "Book appointment" CTA appears. In Inbox, switch to "Escalated" tab with no escalated conversations; confirm "No escalated conversations" + "Clear filters" renders.**

- [ ] **Step 5: Commit**

```bash
git add src/components/analytics/ src/components/customers/ src/components/inbox/
git commit -m "feat: improve empty states for analytics, customer detail, and inbox filters"
```

---

## Verification Checklist

Run through these after all 19 tasks are complete:

- [ ] **Loading** — throttle to Slow 3G; every page shows layout-accurate skeletons before content
- [ ] **Error** — temporarily throw in dashboard query; `error.tsx` renders without stack trace; "Try again" recovers
- [ ] **Command palette** — `⌘K`/`Ctrl+K` opens; type "maria" → customer result appears with highlighted text; select → navigates; `Escape` → closes and focus returns to prior element
- [ ] **Inbox filters** — "Open" tab shows only OPEN conversations with correct count; "AI Handled" toggle narrows further; "All" restores full list; realtime updates still fire
- [ ] **Appointments sort** — sort "Customer name A→Z"; URL has `sort=customer`; table order matches
- [ ] **Appointments search** — search "Emma"; Emma Thompson's appointment appears; search by service name works
- [ ] **Customers sort** — sort "Most appointments"; highest-count customer appears first
- [ ] **Responsive** — resize to 768px; sidebar shows icon-only; Inbox right panel hidden at 1024px; tables scroll horizontally
- [ ] **Accessibility** — tab through Appointments; every element has visible focus ring; no keyboard traps; palette closes with Escape and focus restores
- [ ] **Performance** — open Appointments create slide-over; no 100-customer prefetch in network tab; async customer search fires on keystroke
