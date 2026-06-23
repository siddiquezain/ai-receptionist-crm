# Future Phases

---

## Phase 4 — n8n + WhatsApp + Public Booking

**Status:** Not Started
**Depends on:** Phase 3.5 complete ✓

### Objective

Activate the automation layer and customer-facing surfaces. After Phase 4, customers can book appointments without any staff involvement.

### Planned Deliverables

#### 4a — n8n Setup & Webhook Infrastructure
- Provision n8n instance (self-hosted or cloud)
- Create signed webhook endpoint in dashboard (`POST /api/webhooks/n8n`)
- Implement HMAC signature verification (`N8N_WEBHOOK_SECRET`)
- n8n has read/write access to Supabase PostgreSQL
- Basic n8n → dashboard communication tested

#### 4b — Evolution API + WhatsApp
- Provision Evolution API instance
- Connect Evolution API → n8n (webhook relay)
- n8n workflow: receive WhatsApp message → create Conversation + Message records in Supabase
- Staff can view WhatsApp conversations in the dashboard Inbox (channel: WHATSAPP)
- Dashboard Inbox supports sending WhatsApp replies via n8n

#### 4c — AI Auto-Booking (n8n)
- n8n workflow: WhatsApp message → Gemini inference → extract booking intent
- n8n checks available slots (queries WorkingHours, BusyPeriod, Appointments)
- n8n creates Appointment + writes NotificationJob
- Respects `AISettings.autoBook` and `AISettings.requireConfirm` per tenant
- Staff see AI-booked appointments in the dashboard

#### 4d — Notification Delivery
- n8n polls `NotificationJob WHERE status = PENDING AND scheduledFor <= NOW()`
- Email delivery (SendGrid or Resend)
- WhatsApp delivery (Evolution API)
- SMS delivery (Twilio)
- In-app: direct DB write (no n8n needed)
- Retry logic with exponential backoff
- n8n updates `status`, `sentAt`, `attempts`, `failureReason`

#### 4e — Public Self-Service Booking Page
- New route: `/book/[tenant-slug]`
- Public (no auth required)
- Customer selects service → selects team member → selects date/time → submits details
- Creates Customer + Appointment + NotificationJob
- Sends confirmation to customer
- Staff notified via NotificationJob

#### 4f — Security (Deferred from 3.5)
- Supabase RLS policies on all tenant-scoped tables
- Rate limiting on auth endpoints (Upstash)
- Server-side logout
- Environment variable validation (`@t3-oss/env-nextjs`)

#### 4g — Calendar Sync
- Google Calendar OAuth flow (connect account in Settings → Integrations)
- Outlook OAuth flow
- Sync appointments from `CalendarIntegration` (READ_ONLY: block busy time; WRITE_ONLY: push bookings; BIDIRECTIONAL: both)
- Encrypt calendar OAuth tokens at rest

### Exit Criteria
- A customer sends a WhatsApp message and receives a confirmed booking without staff intervention
- A customer visits the public booking page and books an appointment
- Staff receive a notification for both scenarios
- All deferred security items from Phase 3.5 are resolved

---

## Phase 5 — Billing & Scaling

**Status:** Future
**Depends on:** Phase 4 complete, real tenants on platform

### Objective

Monetize the platform with Stripe and prepare for production scale.

### Planned Deliverables

- **Stripe integration** — Subscription management (STARTER / PRO / ENTERPRISE plans)
- **Plan-based feature gating** — Wire `FeatureFlag` and `EntitlementOverride` to actual plan enforcement (schema is ready)
- **Usage-based AI billing** — Track tokens via `AIUsageRecord`, bill per-token for BYOK overages
- **Agency billing** — Parent tenant billed for child tenant usage
- **Multi-seat pricing** — Per-TeamMember pricing for PRO/ENTERPRISE
- **Structured logging** — Pino + Axiom or Datadog for production observability
- **Performance optimization** — Query analysis, connection pool tuning, N+1 elimination
- **Upstash rate limiting** — Per-IP and per-tenant limits on API endpoints

### Exit Criteria
- Tenants pay via Stripe
- Feature flags enforce plan limits
- System handles 100+ concurrent tenants without degradation
