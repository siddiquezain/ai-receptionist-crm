# ADR-004: Asynchronous Notification Processing

**Status:** Implemented
**Date:** 2026-06-17
**Author:** Mohammed Siddique Zain

---

## Context

The platform needs to send notifications to customers and staff at various points in the appointment lifecycle:
- Appointment confirmation (immediately)
- 24-hour reminder (day before)
- 1-hour reminder (hour before)
- Cancellation notice (on cancel)
- Rescheduling notice (on reschedule)
- Staff new booking alert (on create)
- Staff cancellation alert (on cancel)

Notifications must be delivered via multiple channels: email, WhatsApp, SMS, and in-app.

Sending notifications synchronously within the Server Action that triggered the event (e.g., sending an email inside `createAppointment()`) creates several problems:
- Adds latency to the primary operation
- Creates a hard dependency on external services (if SendGrid is down, appointments can't be created)
- Prevents retry without re-triggering the primary action
- Makes it impossible to schedule future notifications (24h reminder)

---

## Decision

Notification processing is **asynchronous and queue-based**.

When an event occurs that requires a notification, the Server Action writes one or more `NotificationJob` records to the database with:
- `type` — what kind of notification
- `channel` — delivery channel
- `recipient` — email address or phone number
- `payload` — JSON template variables
- `scheduledFor` — when to send (now for confirmations, future for reminders)
- `status: PENDING`

A separate process (n8n in Phase 4) polls the queue and delivers the notifications. The primary operation (appointment creation) is not coupled to notification delivery.

---

## Rationale

- **Reliability:** External provider failures (SendGrid down, WhatsApp rate limit) do not affect the primary operation.
- **Retryability:** `attempts` and `lastAttemptAt` fields support retry logic without complex state management.
- **Schedulability:** Future-dated notifications (24h reminder) are trivially representable as a `scheduledFor` date.
- **Observability:** Every notification's lifecycle is visible in the `NotificationJob` table.
- **Decoupling:** The dashboard doesn't need to know which provider delivers the email. It just writes the job.

---

## Consequences

- Dashboard Server Actions must write `NotificationJob` records on all appointment lifecycle events — not send notifications directly.
- n8n (Phase 4) must implement a polling workflow that processes `PENDING` jobs.
- If n8n is not yet running, notifications are queued but not delivered. This is acceptable for the current phase.
- The `NotificationJob` table will accumulate rows. A cleanup job (n8n) should archive or delete `SENT` and `CANCELLED` jobs older than 90 days.
- Dashboard analytics can count notifications sent by querying `NotificationJob WHERE status = SENT`.
