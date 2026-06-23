# ADR-001: Dashboard Responsibilities Boundary

**Status:** Implemented
**Date:** 2026-06-17
**Author:** Mohammed Siddique Zain

---

## Context

This project has two major execution environments: the Next.js dashboard and n8n (a workflow automation platform). Without a clear boundary, features tend to accumulate in the dashboard because it is the most visible and easiest surface to modify. This creates a monolithic system that is difficult to scale and maintain.

The dashboard must remain a focused UI layer. All business workflow logic must live in n8n so that automations can run independently of the browser.

---

## Decision

The dashboard is responsible for exactly the following:

1. **UI rendering** — React components, layouts, navigation
2. **CRUD operations** — Create, read, update, soft-delete on all core models via Server Actions
3. **Analytics presentation** — Read from `DailySnapshot` and `AnalyticsEvent`, render charts and KPIs
4. **Workspace configuration** — AI settings, team members, services, working hours
5. **AI Chat Inbox** — Display conversations, accept staff messages, assign conversations, mark resolved
6. **Webhook receiving** (Phase 4) — Accept signed webhooks from n8n to trigger state changes

The dashboard is **not** responsible for:

- Business workflow orchestration
- Appointment automation logic
- WhatsApp message routing or processing
- AI inference at automation scale
- Notification delivery
- Scheduling conflict resolution beyond basic input validation

---

## Rationale

- **Separation of concerns:** The dashboard is a UI, not a job runner. Keeping automation out of it makes both systems simpler.
- **Scalability:** n8n workflows can run on separate infrastructure and scale independently.
- **Reliability:** Long-running automation logic does not block HTTP responses.
- **Auditability:** n8n workflows are explicitly designed for logging and error handling of business processes.
- **Avoid duplication:** If both the dashboard and n8n could book appointments, there would be conflicting implementations.

---

## Consequences

- Server Actions must remain thin: validate input, write to DB, log audit, return.
- Any "business rule" that is more complex than a single write belongs in n8n.
- The dashboard may read data created by n8n but should not replicate n8n's processing logic.
- Future engineers adding features to the dashboard must ask: "Is this UI, or is this automation?" If it's automation, it belongs in n8n.
