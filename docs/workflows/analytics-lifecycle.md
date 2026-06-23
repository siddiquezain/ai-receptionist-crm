# Analytics Lifecycle

How raw events become dashboard analytics.

---

## Architecture

```
User action occurs (appointment booked, conversation started, etc.)
         │
         ▼
AnalyticsEvent written (append-only)
         │  tenantId, event string, properties JSON, occurredAt
         │
         ▼
(Future — Phase 4: n8n background job aggregates daily)
         │
         ▼
DailySnapshot updated (one row per tenant per day)
         │  Pre-computed aggregates: appointments, revenue, AI tokens, etc.
         │
         ▼
Dashboard analytics page reads DailySnapshot
         │  analytics-queries.ts: getBookingTrends(), getRevenue(), etc.
         │
         ▼
Recharts components render charts and KPIs
```

---

## AnalyticsEvent

Raw event log — append-only, never updated or deleted.

**Key events:**

| Event | Trigger | Properties |
|---|---|---|
| `appointment.booked` | Appointment created | `{ serviceId, channel, teamMemberId, status }` |
| `appointment.confirmed` | Status → CONFIRMED | `{ appointmentId }` |
| `appointment.cancelled` | Status → CANCELLED | `{ appointmentId, reason }` |
| `appointment.completed` | Status → COMPLETED | `{ appointmentId, revenueUsd }` |
| `appointment.no_show` | Status → NO_SHOW | `{ appointmentId }` |
| `conversation.started` | Conversation created | `{ channel }` |
| `conversation.resolved` | Status → RESOLVED | `{ conversationId, aiHandled }` |
| `conversation.escalated` | Status → ESCALATED | `{ conversationId }` |
| `ai.message` | AI response generated | `{ provider, model, tokens, costUsd }` |
| `customer.created` | Customer record created | `{ source }` |

---

## DailySnapshot

Pre-computed metrics — one row per tenant per calendar day.

| Field | Computed From |
|---|---|
| `appointmentsBooked` | COUNT(AnalyticsEvent WHERE event = 'appointment.booked') |
| `appointmentsConfirmed` | COUNT(... 'appointment.confirmed') |
| `appointmentsCancelled` | COUNT(... 'appointment.cancelled') |
| `appointmentsCompleted` | COUNT(... 'appointment.completed') |
| `appointmentsNoShow` | COUNT(... 'appointment.no_show') |
| `conversationsStarted` | COUNT(... 'conversation.started') |
| `conversationsResolved` | COUNT(... 'conversation.resolved') |
| `conversationsEscalated` | COUNT(... 'conversation.escalated') |
| `aiMessagesCount` | COUNT(... 'ai.message') |
| `aiTokensUsed` | SUM(properties.tokens WHERE event = 'ai.message') |
| `aiEstimatedCostUsd` | SUM(properties.costUsd) |
| `bookingConversionRate` | conversationsStarted / appointmentsBooked |
| `newCustomersCount` | COUNT(AnalyticsEvent WHERE event = 'customer.created') |
| `revenueUsd` | SUM(Appointment.service.price WHERE completedAt = today) |

---

## Analytics Pages in Dashboard

### Dashboard Home (`/[tenant]/dashboard`)
- Today's stat strip: appointments today, conversations open, AI messages sent, revenue today
- 7-day booking trend chart
- Upcoming appointments list (next 5)
- Inbox snapshot (open conversations count)

### Analytics Page (`/[tenant]/analytics`)
- Date range selector (7d, 30d, 90d, custom)
- Booking trends chart (stacked: booked/completed/cancelled)
- Revenue over time (area chart)
- AI performance panel: AI-handled %, escalation rate, booking conversion rate
- Peak hours heatmap (day of week × hour of day — intensity = appointment count)
- Services breakdown (revenue + bookings per service)
- Staff performance table (completion rate, no-show rate per team member)

---

## Query Layer

`src/lib/analytics-queries.ts` reads from `DailySnapshot` for date-range aggregations and from `AnalyticsEvent` for granular breakdowns (peak hours heatmap uses raw events, not snapshots).

```typescript
// Example: booking trends for last 30 days
export async function getBookingTrends(tenantId: string, days: number) {
  return prisma.dailySnapshot.findMany({
    where: {
      tenantId,
      date: { gte: subDays(new Date(), days) },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      appointmentsBooked: true,
      appointmentsCompleted: true,
      appointmentsCancelled: true,
    },
  });
}
```

---

## Current Limitations

- **No background job** for aggregating `DailySnapshot`. Currently updated on mutations (each appointment action triggers a snapshot update). This is not efficient at scale.
- **Phase 4 goal:** n8n runs a nightly job at midnight to compute the previous day's `DailySnapshot` from raw `AnalyticsEvent` records.
- **Real-time updates:** The dashboard does not show real-time analytics updates. Data is as fresh as the last server-side render or TanStack Query refetch.
