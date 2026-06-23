# System Responsibilities

Every significant responsibility in this project has exactly one owner. When in doubt about where something belongs, consult the relevant ADR.

---

## Dashboard (this repository)

**Owns:**

| Responsibility | Details |
|---|---|
| UI rendering | React 19 components, Tailwind CSS, shadcn/ui |
| Route protection | `src/proxy.ts` — session check, tenant slug injection |
| Authentication flows | Login, register, forgot-password (Supabase Auth) |
| CRUD mutations | Server Actions in `src/lib/actions/` |
| Tenant configuration | AI settings, team members, services, working hours |
| AI Chat Inbox | Display conversations, send staff messages, assign, resolve |
| Analytics presentation | Read from `DailySnapshot` and `AnalyticsEvent`, render charts |
| Webhook receiving (Phase 4) | Accept signed webhooks from n8n; write to DB |
| Feature flag UI | Display/hide features based on plan + overrides |

**Does NOT own:**

| Responsibility | True Owner |
|---|---|
| Appointment automation logic | n8n |
| WhatsApp message routing | Evolution API + n8n |
| AI inference at automation scale | n8n (calls AI providers) |
| Notification delivery | n8n (reads NotificationJob queue) |
| Scheduling conflict resolution at scale | n8n |
| Recurring event processing (rrule evaluation) | n8n (for auto-scheduling) |

---

## Supabase

**Owns:**

| Responsibility | Details |
|---|---|
| User authentication | OAuth2, email/password, session tokens |
| Session management | HTTP-only cookies via `@supabase/ssr` |
| PostgreSQL storage | All application data |
| Realtime subscriptions | Live updates (used in inbox) |
| Storage (future) | File uploads / attachment storage |

**Does NOT own:**

| Responsibility | True Owner |
|---|---|
| Business logic | Dashboard / n8n |
| Row-Level Security enforcement (current) | Deferred to Phase 4 roadmap |

---

## Prisma

**Owns:**

| Responsibility | Details |
|---|---|
| Schema definition | `prisma/schema.prisma` — single source of truth for data model |
| Migrations | `prisma migrate dev/deploy` |
| Query building | Type-safe DB queries across the codebase |
| Soft-delete enforcement | Prisma extension in `src/lib/prisma.ts` auto-filters `deletedAt` |
| Tenant context injection | `setTenantContext(tenantId)` for RLS variable |

**Does NOT own:**

| Responsibility | True Owner |
|---|---|
| Auth | Supabase |
| Business rules | Dashboard Server Actions |

---

## n8n (Phase 4 — Accepted, Not Yet Implemented)

**Will own:**

| Responsibility | Details |
|---|---|
| Appointment automation | Create, confirm, cancel appointments from AI conversations |
| AI-driven booking | Run inference (Gemini or other), extract intent, book slots |
| Notification dispatch | Poll `NotificationJob` table, send email/WhatsApp/SMS |
| WhatsApp workflow | Receive from Evolution API, process, respond |
| Scheduling orchestration | Evaluate available slots, apply conflict rules |
| Calendar sync (Phase 4) | Sync with Google/Outlook via `CalendarIntegration` records |

**Will NOT own:**

| Responsibility | True Owner |
|---|---|
| UI | Dashboard |
| Data storage | Supabase / Prisma |
| Session management | Supabase |

See [ADR-002](../adr/ADR-002-n8n-architecture.md).

---

## Evolution API (Phase 4 — Accepted, Not Yet Implemented)

**Will own:**

| Responsibility | Details |
|---|---|
| WhatsApp message ingress | Receive inbound WhatsApp messages, relay to n8n |
| WhatsApp message egress | Send outbound WhatsApp messages on behalf of tenant |

**Will NOT own:**

| Responsibility | True Owner |
|---|---|
| Message processing / AI | n8n |
| Data persistence | Supabase |

---

## AI Providers (OpenAI / Anthropic / Gemini / Grok)

**Own:**

| Responsibility | Details |
|---|---|
| Text generation / inference | LLM responses in the dashboard Inbox chat |
| Future: workflow AI (Phase 4) | Inference inside n8n flows |

**Do NOT own:**

| Responsibility | True Owner |
|---|---|
| Data storage | Supabase |
| Orchestration | n8n |
| Cost tracking | Dashboard (`AIUsageRecord` model) |

---

## Future Integrations

| System | Planned Role | Phase |
|---|---|---|
| Google Calendar / Outlook | Bidirectional calendar sync via `CalendarIntegration` | Phase 4 |
| Email provider (SendGrid/Resend) | Notification delivery | Phase 4 |
| SMS provider (Twilio) | Notification delivery | Phase 4 |
| Upstash | Rate limiting on auth endpoints | Phase 4 deferred |
| Axiom / Datadog | Structured logging | Phase 4 deferred |

---

## Ownership Rules

1. **One owner per responsibility.** If two systems both "own" something, that's a gap to resolve.
2. **Dashboard is a consumer, not an orchestrator.** It receives webhooks; it doesn't initiate workflows.
3. **n8n is the orchestrator.** Any "if appointment confirmed, then send reminder" logic lives there.
4. **Supabase is the handoff point.** The dashboard writes records; n8n reads and acts on them.
