# Data Flows

This document describes how data moves through the system for each major lifecycle. Each section shows which system owns each transition.

---

## 1. Customer Lifecycle

```
NEW CONTACT
    │
    ├─── Staff creates via dashboard (Manual)
    │       Server Action: createCustomer()
    │       Owner: Dashboard
    │
    └─── AI chat recognises unknown number (Future — n8n)
            n8n writes Customer record to Supabase
            Owner: n8n
    │
    ▼
Customer record in Supabase
    │
    ├─── Staff updates info, tags, notes
    │       Server Action: updateCustomer()
    │       Owner: Dashboard
    │
    ├─── Appointments linked (via customerId)
    │       Owner: Dashboard (manual) / n8n (AI-booked)
    │
    ├─── Conversations linked (via customerId)
    │       Owner: Dashboard (web chat) / n8n (WhatsApp)
    │
    └─── Soft deleted
            Server Action: deleteCustomer() → sets deletedAt
            Owner: Dashboard
```

---

## 2. Appointment Lifecycle

```
APPOINTMENT CREATED
    │
    ├─── Staff creates via dashboard (BookingChannel.MANUAL)
    │       Server Action: createAppointment()
    │       Validates: no conflict (serializable transaction)
    │       Status: PENDING
    │       Owner: Dashboard
    │
    └─── AI books from WhatsApp conversation (BookingChannel.AI) [Phase 4]
            n8n flow: extract intent → check availability → write Appointment
            Status: PENDING (if requireConfirm = true) or CONFIRMED
            Owner: n8n
    │
    ▼
status: PENDING
    │
    ├─── Staff confirms
    │       Server Action: updateAppointment({ status: CONFIRMED })
    │       Owner: Dashboard
    │
    └─── requireConfirm = false → auto-confirms
            Owner: n8n (sets CONFIRMED on create) or Dashboard
    │
    ▼
status: CONFIRMED
    │
    │   NotificationJob created: APPOINTMENT_CONFIRMATION
    │   Owner: Dashboard (manual) / n8n (AI)
    │
    ├─── Appointment occurs
    │       Staff marks COMPLETED via dashboard
    │       Server Action: updateAppointment({ status: COMPLETED })
    │       Owner: Dashboard
    │
    ├─── Customer no-shows
    │       Staff marks NO_SHOW via dashboard
    │       Owner: Dashboard
    │
    ├─── Customer cancels
    │       Staff marks CANCELLED via dashboard
    │       Server Action: cancelAppointment()
    │       Owner: Dashboard
    │
    └─── Rescheduled
            New appointment created, old marked RESCHEDULED
            Owner: Dashboard / n8n
    │
    ▼
AnalyticsEvent written (appointment.booked, appointment.completed, etc.)
DailySnapshot updated (by background job or next snapshot run)
Owner: Dashboard (on mutation) / n8n (for AI-originated events)
```

---

## 3. Conversation Lifecycle (AI Chat Inbox)

```
CONVERSATION OPENED
    │
    ├─── Customer sends message via Web Chat widget
    │       Conversation record created (channel: WEB_CHAT)
    │       aiHandled: true
    │       Status: OPEN
    │       Owner: Dashboard
    │
    └─── WhatsApp message received [Phase 4]
            Evolution API → n8n webhook
            n8n creates Conversation (channel: WHATSAPP)
            Owner: n8n
    │
    ▼
status: OPEN, aiHandled: true
    │
    │   AI responses via getAIProvider()
    │   Each response writes Message (role: ASSISTANT)
    │   AIUsageRecord written
    │   Owner: Dashboard (web chat) / n8n (WhatsApp — Phase 4)
    │
    ├─── AI books appointment
    │       Creates Appointment with conversationId
    │       Status → PENDING or CONFIRMED
    │
    ├─── Staff takes over
    │       assignedToId set, aiHandled: false
    │       Staff messages written (role: STAFF)
    │       Owner: Dashboard
    │
    ├─── Staff escalates
    │       Status → ESCALATED
    │       Owner: Dashboard
    │
    ├─── Staff resolves
    │       Status → RESOLVED
    │       Owner: Dashboard
    │
    └─── Staff archives
            Status → ARCHIVED
            Owner: Dashboard
```

---

## 4. Notification Lifecycle (Phase 4)

```
TRIGGER EVENT (appointment created/confirmed/cancelled/etc.)
    │
    ▼
NotificationJob record created
    │  type: APPOINTMENT_CONFIRMATION | REMINDER_24H | etc.
    │  channel: EMAIL | WHATSAPP | SMS | IN_APP
    │  scheduledFor: DateTime
    │  status: PENDING
    │
    Owner: Dashboard (for manual actions) / n8n (for AI-originated)
    │
    ▼
n8n polls NotificationJob WHERE status = PENDING AND scheduledFor <= NOW()
    │
    ├─── Sets status: PROCESSING, increments attempts
    │
    ├─── Sends notification via provider:
    │       EMAIL → SendGrid/Resend
    │       WHATSAPP → Evolution API
    │       SMS → Twilio
    │       IN_APP → direct DB write
    │
    ├─── Success:
    │       Sets status: SENT, sentAt: now
    │
    └─── Failure:
            Sets status: FAILED, failureReason: error message
            Retry logic: re-queues if attempts < maxAttempts
    │
    ▼
Dashboard analytics reads SENT count from NotificationJob
```

---

## 5. Analytics Lifecycle

```
USER ACTION occurs (appointment booked, conversation started, etc.)
    │
    ▼
AnalyticsEvent written (append-only)
    │  event: "appointment.booked"
    │  properties: { serviceId, channel, teamMemberId, ... }
    │  occurredAt: now
    │
    Owner: Dashboard Server Action / n8n (Phase 4)
    │
    ▼
Background job (n8n / cron — Phase 4) aggregates into DailySnapshot
    │  One row per tenant per day
    │  appointmentsBooked, revenue, aiTokensUsed, etc.
    │
    (Current: DailySnapshot updated manually on mutations — no background job yet)
    │
    ▼
Dashboard analytics page reads DailySnapshot
    │  Queries via analytics-queries.ts
    │  Renders: booking trends, revenue charts, AI performance, peak hours heatmap
    │
    Owner: Dashboard (read + render)
```

---

## System Ownership Summary

| Data Transition | Owner (Current) | Owner (Phase 4) |
|---|---|---|
| Customer created | Dashboard | Dashboard + n8n |
| Appointment created | Dashboard | Dashboard + n8n |
| Appointment confirmed | Dashboard | Dashboard + n8n |
| Notification queued | Dashboard | Dashboard + n8n |
| Notification sent | (Not implemented) | n8n |
| WhatsApp message ingress | (Not implemented) | Evolution API → n8n |
| WhatsApp message egress | (Not implemented) | n8n → Evolution API |
| Conversation opened | Dashboard (web chat) | + n8n (WhatsApp) |
| AI response generated | Dashboard | n8n (WhatsApp flows) |
| Analytics event written | Dashboard | Dashboard + n8n |
| Daily snapshot computed | Dashboard (on mutation) | n8n (background job) |
