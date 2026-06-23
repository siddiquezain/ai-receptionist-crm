# Notification Lifecycle

How notifications are queued and delivered.

> Note: Notification **delivery** is a Phase 4 deliverable. The queue infrastructure (`NotificationJob` model) is implemented. n8n polling and provider delivery are not yet built.

---

## Architecture

```
Trigger event (appointment created, confirmed, etc.)
         │
         ▼
Server Action creates NotificationJob record(s)
         │  status: PENDING
         │  scheduledFor: DateTime (now or future)
         │
         ▼
NotificationJob table (Supabase PostgreSQL)
         │
         ▼ (Phase 4 — n8n polls this table)
n8n workflow: SELECT * FROM "NotificationJob" WHERE status = 'PENDING' AND "scheduledFor" <= NOW()
         │
         ├── EMAIL   ──▶ SendGrid / Resend
         ├── WHATSAPP ─▶ Evolution API
         ├── SMS     ──▶ Twilio
         └── IN_APP  ──▶ Direct DB write (no external provider needed)
         │
         ▼
n8n updates NotificationJob:
    Success: status = SENT, sentAt = now
    Failure: status = FAILED, failureReason = error message, attempts++
             (re-queues if attempts < max)
```

---

## Notification Types

| Type | Trigger | Recipient | Scheduled |
|---|---|---|---|
| `APPOINTMENT_CONFIRMATION` | Appointment created/confirmed | Customer | Immediately |
| `APPOINTMENT_REMINDER_24H` | Appointment confirmed | Customer | startAt - 24h |
| `APPOINTMENT_REMINDER_1H` | Appointment confirmed | Customer | startAt - 1h |
| `APPOINTMENT_CANCELLED` | Appointment cancelled | Customer | Immediately |
| `APPOINTMENT_RESCHEDULED` | Appointment rescheduled | Customer | Immediately |
| `FOLLOW_UP` | 24h after appointment completed | Customer | completedAt + 24h |
| `STAFF_NEW_BOOKING` | Appointment created | Assigned staff | Immediately |
| `STAFF_CANCELLATION` | Appointment cancelled | Assigned staff | Immediately |

---

## NotificationJob Fields

| Field | Type | Purpose |
|---|---|---|
| `type` | NotificationType | What template to use |
| `channel` | NotificationChannel | EMAIL / WHATSAPP / SMS / IN_APP |
| `recipient` | String | Email address or phone number |
| `payload` | Json | Template variables (customerName, serviceName, startAt, etc.) |
| `status` | JobStatus | PENDING → PROCESSING → SENT / FAILED |
| `scheduledFor` | DateTime | When to send (allows future scheduling) |
| `attempts` | Int | Retry counter |
| `lastAttemptAt` | DateTime? | For debugging |
| `failureReason` | String? | Last error from provider |
| `sentAt` | DateTime? | When successfully sent |

---

## Delivery Channels

### EMAIL (Phase 4)
- Provider: SendGrid or Resend (TBD)
- `recipient` = customer or staff email address
- Template selected from `type`

### WHATSAPP (Phase 4)
- Provider: Evolution API (via n8n)
- `recipient` = customer phone number (E.164 format)
- Template must comply with WhatsApp Business template rules

### SMS (Phase 4)
- Provider: Twilio (TBD)
- `recipient` = customer phone number
- Short text version of the notification

### IN_APP
- No external provider — n8n writes directly to a future `Notification` table or uses Supabase Realtime
- Dashboard reads and displays in a notification panel

---

## Retry Logic (Phase 4 — n8n)

Recommended retry strategy:
- `maxAttempts` = 3
- Backoff: 5 minutes, 30 minutes, 2 hours
- After 3 failures: status remains `FAILED`, `failureReason` contains last error
- Failed jobs are visible in a future admin panel

---

## Current Status (Phase 3.5)

- `NotificationJob` records are **written** by server actions on appointment lifecycle events
- Delivery is **not yet implemented** — jobs accumulate as `PENDING` until n8n is set up in Phase 4
- Analytics can count queued notifications: `SELECT COUNT(*) FROM "NotificationJob" WHERE "tenantId" = ?`
