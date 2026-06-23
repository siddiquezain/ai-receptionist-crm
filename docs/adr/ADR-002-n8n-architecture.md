# ADR-002: n8n as Workflow Orchestrator

**Status:** Accepted
**Date:** 2026-06-17
**Revised:** 2026-06-23
**Author:** Mohammed Siddique Zain

---

## Context

The platform needs to automate several business processes:
- Booking appointments from WhatsApp conversations
- Sending appointment reminders and confirmations
- Running AI inference on incoming messages to extract booking intent
- Processing recurring scheduling rules

These processes must run independently of user sessions, handle retries, and be auditable. The dashboard (a Next.js web application) is unsuitable for hosting long-running automation because it is optimized for HTTP request/response cycles.

An initial version of this ADR left open the question of whether n8n writes directly to Supabase or through dashboard API endpoints. That ambiguity is resolved here.

---

## Decision

**n8n** is the sole orchestration layer for all business workflow automation.

### Ownership boundary

**Dashboard backend is the owner of the business domain.** It is the single enforcement point for validation, authorization, audit logging, and business rules. Any change to business state must flow through it.

**n8n is the orchestrator.** It sequences, schedules, and coordinates work — but it does not own business state and does not bypass the domain layer.

### What n8n may do

**Read directly from Supabase** (configuration and reference data only):
- Read `AISettings` to determine provider, model, and BYOK key for a tenant
- Read `WorkingHours` and `BusyPeriod` to check slot availability
- Read `Tenant` and `TeamMember` for routing and context
- Poll `NotificationJob` for jobs due for delivery

Reading this data directly avoids unnecessary round-trips for lookups that carry no business consequences and require no audit trail.

**Write through dashboard internal API endpoints** (all business state changes):
- Create or update `Customer` records
- Create `Conversation` and `Message` records
- Create `Appointment` records
- Create `NotificationJob` records
- Emit `AnalyticsEvent` records
- Any other mutation that represents a business event

All such writes go through the dashboard's internal API layer so that validation, permission logic, soft-delete conventions, audit logging, and future Supabase RLS policies apply consistently — regardless of whether the write originates from a user action or an automated workflow.

**Keep workflow execution state internal to n8n** (not persisted in the application database):
- In-progress workflow state
- Intermediate results between n8n nodes
- n8n-specific retry counters and execution logs
- Anything that has no meaning to the business domain

The exception: when n8n processes a `NotificationJob`, it updates `status`, `sentAt`, `attempts`, and `failureReason` directly in the database. This is a status handshake on a record the dashboard created — not a business event — and the overhead of routing it through an API endpoint is not justified.

---

## Rationale

- **Consistent enforcement:** If business state can be written through two paths (n8n direct and dashboard API), validation and audit coverage diverge over time. One path wins: the domain layer.
- **Audit completeness:** `AuditLog` records are written by dashboard server logic. Direct DB writes from n8n would silently skip the audit trail.
- **Future RLS compatibility:** Supabase RLS policies apply at the database session level. The dashboard sets `app.current_tenant_id` per request. n8n writing directly with a service role key bypasses RLS entirely and creates a permanent exception that is hard to close later.
- **Operational simplicity:** n8n holds one credential — an API key for the dashboard's internal API. It does not need a database connection string or service role key. Rotating the API key is enough to cut off n8n access.
- **Schema evolution:** When the dashboard changes its data model, the API endpoint absorbs the change. n8n workflows do not need to be updated to match new column names or constraints.
- **Performance:** The direct-read exemption for configuration and reference data is sufficient — these are low-frequency lookups, not hot paths.

---

## Consequences

- The dashboard must expose a set of authenticated internal API endpoints (`/api/internal/...`) for all business mutations n8n needs to perform. These endpoints use a shared API key (`N8N_API_KEY`) rather than user sessions.
- n8n holds `N8N_API_KEY` as a credential. This key must have no more privilege than necessary — each endpoint enforces its own tenant scoping.
- The dashboard must also expose a webhook receiver endpoint (`POST /api/webhooks/n8n`) for n8n to signal events back to the dashboard (e.g., WhatsApp message received, booking confirmed). This endpoint uses HMAC-SHA256 signature verification (`N8N_WEBHOOK_SECRET`).
- n8n needs **read-only** Supabase access (connection string with a read-only role) for configuration lookups. It does **not** need write access to Supabase.
- The `NotificationJob` table remains the handoff mechanism: dashboard writes jobs, n8n processes them and updates `status`/`sentAt`/`attempts` directly.
- Engineers working on automation must use n8n for orchestration and call dashboard API endpoints for state changes. Direct database writes from n8n (other than `NotificationJob` status updates) are not permitted.
- n8n workflow execution state (intermediate results, execution logs) stays inside n8n and is not persisted to the application database.

See also: [ADR-001](ADR-001-dashboard-responsibilities.md), [ADR-003](ADR-003-ai-execution.md).
