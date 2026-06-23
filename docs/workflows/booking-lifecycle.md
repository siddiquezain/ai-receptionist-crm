# Booking Lifecycle

The complete lifecycle of an appointment from creation to completion or cancellation.

---

## State Machine

```
                    ┌─────────┐
                    │ CREATED │
                    └────┬────┘
                         │ createAppointment()
                         ▼
                    ┌─────────┐
              ┌────▶│ PENDING │◀────────────────────────────┐
              │     └────┬────┘                             │
              │          │                                  │
              │    ┌─────┴──────────────────┐              │
              │    │ requireConfirm = true  │              │
              │    │ (manual confirmation   │              │
              │    │  required)             │              │
              │    └─────────┬──────────────┘              │
              │              │ updateAppointment(CONFIRMED)  │
              │              ▼                              │
              │       ┌───────────┐                        │
       ─ ─ ─ ─│─ ─ ─ ▶│ CONFIRMED │                        │
       │      │       └─────┬─────┘                        │
              │             │                              │
       │      │    ┌────────┴───────────────┐             │
              │    │                        │             │
       │      │    ▼                        ▼             │
              │ ┌──────────┐        ┌─────────────┐      │
       │      │ │COMPLETED │        │  CANCELLED  │      │
              │ └──────────┘        └─────────────┘      │
       │      │                                          │
       autoBook=true                              ┌──────┴──────┐
       (auto-confirms)                            │ RESCHEDULED │
                                                  └─────────────┘

Status: NO_SHOW (set from CONFIRMED when customer doesn't appear)
```

---

## Status Definitions

| Status | Meaning | Set By |
|---|---|---|
| `PENDING` | Created, awaiting confirmation | createAppointment() |
| `CONFIRMED` | Confirmed by staff or auto-confirmed | updateAppointment() or n8n |
| `COMPLETED` | Appointment occurred and was marked done | updateAppointment() |
| `CANCELLED` | Cancelled by staff or customer | cancelAppointment() |
| `NO_SHOW` | Customer did not appear | updateAppointment() |
| `RESCHEDULED` | Replaced by a new appointment | cancelAppointment() with reschedule flag |

---

## Booking Channels

| Channel | Source | Description |
|---|---|---|
| `MANUAL` | Staff via dashboard | Staff creates appointment manually |
| `AI` | AI chat (Inbox or WhatsApp) | AI books on behalf of customer |
| `SELF_SERVICE` | Public booking page (Phase 4) | Customer self-schedules |

---

## Flow: Manual Booking (Current)

```
1. Staff opens Appointments → New Appointment
2. Selects: Customer, Service, Team Member, Date/Time, Notes
3. Form submits → createAppointment() server action
4. Server action:
   a. requireTenantAccess() + requirePermission("appointments.manage_all")
   b. Validate input (Zod)
   c. Check for conflicts (serializable transaction — no overlapping appointments for same team member)
   d. prisma.appointment.create({ status: PENDING, bookedVia: MANUAL })
   e. Create NotificationJob (APPOINTMENT_CONFIRMATION, scheduledFor: now)
   f. logAudit("appointment.created")
5. Dashboard shows appointment in PENDING state
6. Staff clicks Confirm → updateAppointment({ status: CONFIRMED })
7. NotificationJob sent (email/WhatsApp to customer)
```

---

## Flow: AI Booking (Phase 4)

```
1. Customer sends WhatsApp message (e.g., "I'd like to book a haircut tomorrow at 3pm")
2. Evolution API relays to n8n
3. n8n workflow:
   a. Gemini inference → extract intent: { service: "haircut", date: tomorrow, time: "15:00" }
   b. Query Supabase: available slots for this service/time
   c. If slot available: prisma.appointment.create({ status: autoBook ? CONFIRMED : PENDING })
   d. Create NotificationJob (APPOINTMENT_CONFIRMATION)
   e. Reply to customer via Evolution API with confirmation
4. Dashboard shows new AI-booked appointment
5. If requireConfirm = true: staff sees PENDING → confirms manually
```

---

## Conflict Prevention

Appointment conflict check (implemented in `createAppointment()`):

- Query existing PENDING/CONFIRMED appointments for the same `teamMemberId` and overlapping time window
- Uses a serializable transaction to prevent race conditions (two simultaneous bookings for the same slot)
- Also checks `BusyPeriod` records for blocked time

---

## Notifications Triggered

| Trigger Event | Notification Type | When Sent |
|---|---|---|
| Appointment created | `APPOINTMENT_CONFIRMATION` | Immediately |
| Appointment confirmed | (if not already sent) | Immediately |
| 24 hours before | `APPOINTMENT_REMINDER_24H` | scheduledFor = startAt - 24h |
| 1 hour before | `APPOINTMENT_REMINDER_1H` | scheduledFor = startAt - 1h |
| Appointment cancelled | `APPOINTMENT_CANCELLED` | Immediately |
| Appointment rescheduled | `APPOINTMENT_RESCHEDULED` | Immediately |
| New booking (staff) | `STAFF_NEW_BOOKING` | Immediately |
| Cancellation (staff) | `STAFF_CANCELLATION` | Immediately |

All notifications are queued as `NotificationJob` records and delivered asynchronously by n8n (Phase 4).

---

## Related Models

- `Appointment` — the booking record
- `Service` — defines duration, price, buffer time, max concurrent
- `TeamMember` — the staff member assigned
- `WorkingHours` — defines when team member is available
- `BusyPeriod` — blocked time slots
- `NotificationJob` — queued outbound notifications
- `AnalyticsEvent` — `appointment.booked`, `appointment.confirmed`, etc.
