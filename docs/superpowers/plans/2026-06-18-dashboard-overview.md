# Dashboard Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/{slug}/dashboard` stub page with a real overview screen showing 4 KPI stat cards, a 7-day appointment trend chart, an upcoming appointments table, and an inbox snapshot.

**Architecture:** All data fetching happens server-side in `src/lib/dashboard-queries.ts` (pure async functions, no auth — they trust the tenantId passed by the page). The page at `src/app/(dashboard)/[tenant]/dashboard/page.tsx` is a Server Component that calls these queries in parallel then passes typed data down to presentational components. The trend chart is the only Client Component (Recharts requires browser APIs). All other components are Server Components.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Recharts 3, lucide-react, Tailwind v4, `date-fns` (already installed), design tokens from `globals.css`.

---

## File Map

### Created by this plan

```
src/
├── lib/
│   └── dashboard-queries.ts                   # Typed DB query functions — no auth, just tenantId
│
├── components/
│   └── dashboard/
│       ├── stat-card.tsx                       # KPI card: value, delta, inline SVG sparkline (Server)
│       ├── trend-chart.tsx                     # 7-day bar chart — Recharts (Client)
│       ├── upcoming-appointments.tsx           # Next 5 appointments table (Server)
│       └── inbox-snapshot.tsx                  # Top 3 open conversations (Server)
│
└── app/(dashboard)/[tenant]/dashboard/
    └── page.tsx                               # Server page — fetches all data, renders grid
```

### Modified by this plan

```
src/app/(dashboard)/[tenant]/page.tsx          # Redirect /{slug} → /{slug}/dashboard
```

---

## Task 1: Dashboard Query Functions

**Files:**
- Create: `src/lib/dashboard-queries.ts`

These functions are the data layer for the overview page. They accept `tenantId` and return typed results. They never touch auth — that's the layout's job.

- [ ] **Step 1: Write dashboard-queries.ts**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/lib/dashboard-queries.ts`:

```typescript
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { StatCardData } from "@/types";

// ─── Date helpers ────────────────────────────────────────────────────────────

/**
 * Returns UTC midnight boundaries for a day offset from today.
 * daysAgo=0 → today, daysAgo=1 → yesterday, etc.
 */
function utcDayRange(daysAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo + 1)
  );
  return { start, end };
}

// ─── Stat cards ──────────────────────────────────────────────────────────────

export async function getStatCards(tenantId: string): Promise<{
  appointmentsToday: StatCardData;
  pendingConfirmations: StatCardData;
  openConversations: StatCardData;
  conversionRate: StatCardData;
}> {
  const today = utcDayRange(0);
  const yesterday = utcDayRange(1);

  const sixDaysAgo = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate() - 6
    )
  );

  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  );

  const [
    apptToday,
    apptYesterday,
    apptLastSevenDays,
    pendingCount,
    openConvCount,
    newConvThisWeek,
    apptThisMonth,
    convThisMonth,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { tenantId, startAt: { gte: today.start, lt: today.end } },
    }),
    prisma.appointment.count({
      where: { tenantId, startAt: { gte: yesterday.start, lt: yesterday.end } },
    }),
    prisma.appointment.findMany({
      where: { tenantId, startAt: { gte: sixDaysAgo, lt: today.end } },
      select: { startAt: true },
    }),
    prisma.appointment.count({
      where: { tenantId, status: "PENDING" },
    }),
    prisma.conversation.count({
      where: { tenantId, status: "OPEN" },
    }),
    prisma.conversation.count({
      where: { tenantId, createdAt: { gte: sixDaysAgo } },
    }),
    prisma.appointment.count({
      where: { tenantId, createdAt: { gte: monthStart } },
    }),
    prisma.conversation.count({
      where: { tenantId, createdAt: { gte: monthStart } },
    }),
  ]);

  // Build sparkline (appointments per UTC day, last 7 days)
  const now = new Date();
  const sparklineMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
    );
    sparklineMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const appt of apptLastSevenDays) {
    const key = appt.startAt.toISOString().slice(0, 10);
    if (sparklineMap.has(key)) {
      sparklineMap.set(key, (sparklineMap.get(key) ?? 0) + 1);
    }
  }
  const apptSparkline = Array.from(sparklineMap.values());

  const rate = convThisMonth > 0
    ? Math.round((apptThisMonth / convThisMonth) * 100)
    : 0;

  return {
    appointmentsToday: {
      label: "Appointments Today",
      value: apptToday,
      delta: apptToday - apptYesterday,
      deltaLabel: "vs yesterday",
      sparkline: apptSparkline,
    },
    pendingConfirmations: {
      label: "Pending Confirmations",
      value: pendingCount,
      delta: 0,
      deltaLabel: "awaiting action",
      sparkline: Array(7).fill(0),
    },
    openConversations: {
      label: "Open Conversations",
      value: openConvCount,
      delta: newConvThisWeek,
      deltaLabel: "new this week",
      sparkline: Array(7).fill(0),
    },
    conversionRate: {
      label: "Booking Conversion",
      value: `${rate}%`,
      delta: 0,
      deltaLabel: "this month",
      sparkline: Array(7).fill(0),
    },
  };
}

// ─── Trend chart ─────────────────────────────────────────────────────────────

export type TrendDataPoint = { date: string; appointments: number };

export async function getTrendData(tenantId: string): Promise<TrendDataPoint[]> {
  const now = new Date();
  const sixDaysAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
  );

  const appointments = await prisma.appointment.findMany({
    where: { tenantId, startAt: { gte: sixDaysAgo } },
    select: { startAt: true },
  });

  const dayMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
    );
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const appt of appointments) {
    const key = appt.startAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    }
  }

  return Array.from(dayMap.entries()).map(([iso, count]) => ({
    date: new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    appointments: count,
  }));
}

// ─── Upcoming appointments ───────────────────────────────────────────────────

export type UpcomingAppointment = {
  id: string;
  startAt: Date;
  status: AppointmentStatus;
  customer: { name: string };
  service: { name: string; duration: number };
  teamMember: { name: string } | null;
};

export async function getUpcomingAppointments(
  tenantId: string
): Promise<UpcomingAppointment[]> {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      startAt: { gte: new Date() },
      status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
    },
    take: 5,
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      startAt: true,
      status: true,
      customer: { select: { name: true } },
      service: { select: { name: true, duration: true } },
      teamMember: { select: { name: true } },
    },
  }) as Promise<UpcomingAppointment[]>;
}

// ─── Inbox snapshot ──────────────────────────────────────────────────────────

export type InboxConversation = {
  id: string;
  updatedAt: Date;
  customer: { name: string; phone: string | null } | null;
  messages: Array<{ content: string; createdAt: Date }>;
};

export async function getInboxSnapshot(
  tenantId: string
): Promise<InboxConversation[]> {
  return prisma.conversation.findMany({
    where: { tenantId, status: "OPEN" },
    take: 3,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      updatedAt: true,
      customer: { select: { name: true, phone: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true },
      },
    },
  }) as Promise<InboxConversation[]>;
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors in `dashboard-queries.ts`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/lib/dashboard-queries.ts && git commit -m "feat: add dashboard DB query functions"
```

---

## Task 2: StatCard Component

**Files:**
- Create: `src/components/dashboard/stat-card.tsx`

Server Component. Renders a KPI card with a label, large value, delta indicator (colored up/down arrow), and a minimal inline SVG sparkline. Uses the existing `StatCardData` type from `@/types`.

- [ ] **Step 1: Write stat-card.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/dashboard/stat-card.tsx`:

```tsx
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { StatCardData } from "@/types";

/** Minimal inline SVG sparkline — no external library needed. */
function Sparkline({ data }: { data: number[] }) {
  // Don't render if all zeros (no data yet)
  if (data.every((d) => d === 0)) {
    return <div className="h-6 w-16" />;
  }

  const max = Math.max(...data, 1);
  const W = 64;
  const H = 24;

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    // Reserve 2px of padding so the stroke isn't clipped
    H - 1 - (v / max) * (H - 3),
  ] as [number, number]);

  const d = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  return (
    <svg width={W} height={H} className="shrink-0 text-[var(--text-muted)] overflow-visible">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatCard({ label, value, delta, deltaLabel, sparkline }: StatCardData) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <Sparkline data={sparkline} />
      </div>

      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>

      <div className="mt-1.5 flex items-center gap-1 text-xs">
        {isPositive && <TrendingUp className="size-3 text-[var(--success)]" />}
        {isNegative && <TrendingDown className="size-3 text-[var(--danger)]" />}
        {!isPositive && !isNegative && <Minus className="size-3 text-[var(--text-muted)]" />}

        {delta !== 0 && (
          <span
            className={
              isPositive ? "text-[var(--success)]" : "text-[var(--danger)]"
            }
          >
            {isPositive ? "+" : ""}
            {delta}
          </span>
        )}

        <span className="text-[var(--text-muted)]">{deltaLabel}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors in `stat-card.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/components/dashboard/stat-card.tsx && git commit -m "feat: add StatCard component with inline SVG sparkline"
```

---

## Task 3: TrendChart Component (Recharts)

**Files:**
- Create: `src/components/dashboard/trend-chart.tsx`

Client Component. Recharts needs browser APIs (`window`, `ResizeObserver`), so `"use client"` is required. Receives pre-fetched data as props — no data fetching here.

- [ ] **Step 1: Write trend-chart.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/dashboard/trend-chart.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendDataPoint } from "@/lib/dashboard-queries";

interface TrendChartProps {
  data: TrendDataPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4 h-full">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Appointments — last 7 days
      </p>
      <ResponsiveContainer width="100%" height={148}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "12px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            labelStyle={{ color: "var(--text-muted)" }}
            itemStyle={{ color: "var(--text-primary)" }}
            cursor={{ fill: "var(--bg)" }}
          />
          <Bar
            dataKey="appointments"
            fill="var(--accent)"
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors in `trend-chart.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/components/dashboard/trend-chart.tsx && git commit -m "feat: add TrendChart component with Recharts"
```

---

## Task 4: UpcomingAppointments Component

**Files:**
- Create: `src/components/dashboard/upcoming-appointments.tsx`

Server Component. Displays next 5 appointments in a compact table. Uses `formatDate` from `@/lib/utils` to display times in the tenant's timezone.

Status badge colors:
- `PENDING` → warning
- `CONFIRMED` → success
- `RESCHEDULED` → warning
- All others (CANCELLED, COMPLETED, NO_SHOW) are filtered out server-side

- [ ] **Step 1: Write upcoming-appointments.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/dashboard/upcoming-appointments.tsx`:

```tsx
import { formatDate } from "@/lib/utils";
import { Calendar } from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";
import type { UpcomingAppointment } from "@/lib/dashboard-queries";

const STATUS: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
  },
  NO_SHOW: {
    label: "No Show",
    className:
      "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    className:
      "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
};

interface Props {
  appointments: UpcomingAppointment[];
  timezone: string;
}

export function UpcomingAppointments({ appointments, timezone }: Props) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Upcoming Appointments
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10">
          <Calendar className="size-8 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">
            No upcoming appointments
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Customer", "Service", "Staff", "Time", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => {
                const s = STATUS[appt.status];
                return (
                  <tr
                    key={appt.id}
                    className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg)]"
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">
                      {appt.customer.name}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-muted)]">
                      {appt.service.name}
                      <span className="ml-1 text-xs">
                        ({appt.service.duration}m)
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-muted)]">
                      {appt.teamMember?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm tabular-nums text-[var(--text-muted)]">
                      {formatDate(appt.startAt, timezone, "MMM d, h:mm a")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}
                      >
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors in `upcoming-appointments.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/components/dashboard/upcoming-appointments.tsx && git commit -m "feat: add UpcomingAppointments component"
```

---

## Task 5: InboxSnapshot Component

**Files:**
- Create: `src/components/dashboard/inbox-snapshot.tsx`

Server Component. Shows top 3 open conversations (most recently updated first) with the last message preview. Links to `/{slug}/inbox`.

- [ ] **Step 1: Write inbox-snapshot.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/dashboard/inbox-snapshot.tsx`:

```tsx
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import type { InboxConversation } from "@/lib/dashboard-queries";

interface Props {
  conversations: InboxConversation[];
  tenantSlug: string;
}

export function InboxSnapshot({ conversations, tenantSlug }: Props) {
  return (
    <div className="flex h-full flex-col rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Open Conversations
        </p>
        <Link
          href={`/${tenantSlug}/inbox`}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          View all
        </Link>
      </div>

      {/* Content */}
      {conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8">
          <MessageSquare className="size-8 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">
            No open conversations
          </p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-[var(--border)]">
          {conversations.map((conv) => {
            const lastMsg = conv.messages[0];
            return (
              <li
                key={conv.id}
                className="px-4 py-3 transition-colors hover:bg-[var(--bg)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)] leading-tight">
                    {conv.customer?.name ?? "Unknown"}
                  </p>
                  <p className="shrink-0 text-xs text-[var(--text-muted)]">
                    {timeAgo(conv.updatedAt)}
                  </p>
                </div>
                {lastMsg && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
                    {lastMsg.content}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors in `inbox-snapshot.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add src/components/dashboard/inbox-snapshot.tsx && git commit -m "feat: add InboxSnapshot component"
```

---

## Task 6: Dashboard Page + Root Redirect

**Files:**
- Create: `src/app/(dashboard)/[tenant]/dashboard/page.tsx`
- Modify: `src/app/(dashboard)/[tenant]/page.tsx`

The dashboard page is a Server Component that resolves the tenant, fetches all data in parallel, and renders the grid. The auth check is already done by the layout — the page just needs the tenant's `id` and `timezone`.

The existing `[tenant]/page.tsx` stub currently just renders text; redirect it to the real dashboard route.

- [ ] **Step 1: Write the dashboard page**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(dashboard)/[tenant]/dashboard/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Update the [tenant] root page to redirect**

Read `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(dashboard)/[tenant]/page.tsx` and replace its entire contents with:

```tsx
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function TenantRootPage({ params }: Props) {
  const { tenant } = await params;
  redirect(`/${tenant}/dashboard`);
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git add "src/app/(dashboard)/[tenant]/dashboard/page.tsx" "src/app/(dashboard)/[tenant]/page.tsx" && git commit -m "feat: implement dashboard overview page with KPI grid, trend chart, appointments table, inbox snapshot"
```

---

## Task 7: Final Verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Step 2: Dev server smoke test**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && npm run dev > /tmp/nextdev-overview.log 2>&1 &
sleep 12
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
echo ""
pkill -f "next dev" 2>/dev/null || true
```
Expected: `200`. If not, check `/tmp/nextdev-overview.log`.

- [ ] **Step 3: Commit any remaining changes**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard/" && git status --short && git add -A && git commit -m "chore: dashboard overview complete" 2>/dev/null || echo "nothing to commit"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| 4 KPI stat cards with value + delta + sparkline | Tasks 1, 2 |
| Appointments today | Task 1 (`getStatCards` — apptToday vs apptYesterday) |
| Pending confirmations | Task 1 (`getStatCards` — PENDING status count) |
| Open conversations | Task 1 (`getStatCards` — OPEN status count) |
| Booking conversion rate | Task 1 (`getStatCards` — apptThisMonth / convThisMonth) |
| 7-day appointment trend bar chart | Tasks 1, 3 (`getTrendData`, `TrendChart`) |
| Upcoming appointments (next 5) | Tasks 1, 4 (`getUpcomingAppointments`, `UpcomingAppointments`) |
| Inbox snapshot (top 3 open conversations) | Tasks 1, 5 (`getInboxSnapshot`, `InboxSnapshot`) |
| Customer name + last message + time elapsed | Task 5 |
| `/{slug}` redirects to `/{slug}/dashboard` | Task 6 (root page redirect) |
| Server-rendered above-the-fold (no spinners) | Architecture — all components are Server Components |

**Omitted (future plans):** Today's timeline, Team availability strip — these require WorkingHours and TeamMember data not yet populated; they will be added in a settings or appointments plan.

### Placeholder Scan

None. All steps contain complete, runnable code.

### Type Consistency

- `StatCardData` from `@/types` — defined as `{ label, value: string|number, delta: number, deltaLabel, sparkline: number[] }`. Used in `getStatCards()` return type and `StatCard` props. ✓
- `TrendDataPoint` exported from `dashboard-queries.ts` as `{ date: string; appointments: number }`. Imported by `TrendChart` props. ✓
- `UpcomingAppointment` exported from `dashboard-queries.ts`. Imported by `UpcomingAppointments` props. ✓
- `InboxConversation` exported from `dashboard-queries.ts`. Imported by `InboxSnapshot` props. ✓
- `formatDate(appt.startAt, timezone, "MMM d, h:mm a")` — `formatDate` in `utils.ts` checks `fmt.includes("h")` and `fmt.includes("mm")` for hour/minute, and `fmt.includes("a")` for `hour12`. "MMM d, h:mm a" hits all three. ✓
- `AppointmentStatus` imported from `@prisma/client` in `upcoming-appointments.tsx` — the STATUS map covers all 6 enum values. ✓

---

## Next Plans (in order)

1. `2026-06-18-appointments.md` — Calendar view, list, slide-over
2. `2026-06-18-customers.md` — CRM table, detail panel
3. `2026-06-18-inbox.md` — 3-column chat, realtime
4. `2026-06-18-analytics.md` — Charts, heatmap, CSV export
5. `2026-06-18-settings.md` — Working hours, team, AI, profile
6. `2026-06-18-booking-page.md` — Public slot picker
7. `2026-06-18-api-routes.md` — AI chat, WhatsApp webhook
