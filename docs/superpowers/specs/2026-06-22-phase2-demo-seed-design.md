# Phase 2 – Demo Seed & Product Roadmap Design

**Date:** 2026-06-22
**Branch:** feat/premium-redesign
**Status:** Approved

---

## Revised Product Roadmap

```
Phase 1  ✅  Configuration & reference data
             User, Tenant, Services, WorkingHours, AISettings, TeamMember

Phase 2       Realistic demo/business data  ← this spec
             Customers, Appointments, Conversations, Messages
             Scenario-based, idempotent, internally consistent

Phase 3A      Core dashboard features
             Appointments list/view/status, Customers list/view, Inbox thread view,
             Dashboard KPI metrics — everything n8n will write to must display correctly.
             Observability: structured error surfaces, meaningful status labels.

Phase 3B      Polish (runs alongside Phase 4)
             Search, filters, analytics page, CRUD beyond status change,
             responsive UI, empty-state handling.

Phase 3.5     Security baseline  ← gates Phase 4
             Supabase RLS policies, Postgres role for n8n, audit-log wiring,
             tenant-isolation verification.

Phase 4       n8n ↔ Supabase integration
             Read: AISettings, Services, WorkingHours, TeamMembers.
             Write: Customer, Conversation, Message, Appointment.
             No WhatsApp or AI. Validate automation layer in isolation.
             Observability: n8n execution logs, structured error payloads, correlation IDs.

Phase 5       Evolution API integration
             WhatsApp → Evolution API webhook → n8n → Supabase.
             Message-flow verification only — no AI or booking logic yet.
             The first Phase 4 workflow should be designed to accept a real webhook,
             so Phase 5 can reuse it without a separate build cycle.
             Observability: Evolution API delivery logs, n8n webhook traces,
             end-to-end message correlation.

Phase 6       AI Booking Agent
             Gemini via n8n, provider-agnostic by design.
             Full end-to-end automation: receive WhatsApp → AI response → book appointment.
             Notification system (NotificationJob table): confirmation, reminder, cancellation.
             Observability: AI token usage via AIUsageRecord, prompt version tracking
             via AIPromptVersion, conversation summaries, escalation detection.
```

---

## Cross-Cutting Concerns

### Observability

Observability is not a phase — it is a standard applied at every layer as it is built.

**Principle:** When something fails, you should be able to identify the failing layer in under
60 seconds by reading logs, not by re-running the workflow.

| Layer | Observability requirement |
|---|---|
| Seed scripts | `ok` / `info` / `fail` logging with entity counts; errors surface immediately with context |
| Next.js dashboard | Meaningful error messages (not "something went wrong"); API routes return structured `{ error, code }` JSON |
| Supabase | `AuditLog` records for important business events (appointment confirmed, conversation resolved, AI escalated); `AIUsageRecord` for every AI call |
| n8n | Each workflow node logs tenant ID, operation, and result; errors include `tenantId` + `conversationId` for traceability; a dedicated error branch on every workflow sends failure details to an n8n error log node |
| Evolution API | Delivery status tracked per message; webhook payloads logged before processing |

**Correlation IDs:** From Phase 4 onwards, every automation workflow should attach a
`correlationId` (generated at webhook receipt) to every Supabase record it writes in that
execution. This allows a single DB query to reconstruct the full chain:
`incoming message → conversation → AI call → appointment → notification`.

The `Conversation.extractedContext` (JSON field) and `AuditLog` are the right places to store
correlation metadata without schema changes.

---

### Provider-Agnostic AI Architecture

**Principle:** Changing an AI provider requires updating one database record. No code changes.

The `AISettings.provider` and `AISettings.model` fields are unconstrained strings.
n8n selects the correct execution node based on the provider value at runtime:

```
AISettings.provider = 'google'    → Google Gemini n8n node
AISettings.provider = 'openai'    → OpenAI n8n node
AISettings.provider = 'anthropic' → Anthropic n8n node
AISettings.provider = 'local'     → Ollama / local model node
AISettings.provider = (unknown)   → error branch → escalate conversation
```

**n8n workflow pattern (Phase 6):**

```
[Receive webhook]
  → [SELECT AISettings WHERE tenantId = $1]
  → [Switch node on provider field]
      → google    → [Gemini node: model, temperature, maxTokens, systemPrompt]
      → openai    → [OpenAI node: model, temperature, maxTokens, systemPrompt]
      → anthropic → [Anthropic node: model, temperature, maxTokens, systemPrompt]
      → default   → [Error branch]
  → [Common response handling]
  → [Check autoBook / requireConfirm]
  → [INSERT/UPDATE booking records]
```

**Fallback chain:** `fallbackProvider` and `fallbackModel` in `AISettings` allow n8n to retry
with a secondary provider if the primary fails (rate limit, outage). The switch node runs
again on the fallback values.

**BYOK (Bring Your Own Key):** `AISettings.byokApiKey` is `NULL` for all tenants in
development. In a future enterprise tier, n8n reads this field and passes it as the API key
to the provider node, bypassing n8n's own credentials. The dashboard never calls AI providers
directly, regardless of BYOK status.

---

## Phase 2 — Demo Seed Design

### Goal

Populate `scripts/seed-demo-data.ts` with realistic business data that makes all four
dashboard pages (Inbox, Customers, Appointments, Analytics) feel like a business in week 4
of operation. Data is scenario-based, idempotent, and structured for easy future extension.

### File Structure

```
scripts/
  seed-dev-user.ts        ← Phase 1, untouched
  seed-demo-data.ts       ← Phase 2, new file
```

`package.json` new script:
```json
"seed:demo": "tsx --env-file=.env.local scripts/seed-demo-data.ts"
```

Internal structure of `seed-demo-data.ts`:

```typescript
const DEMO_DATASET_VERSION = "2026-06-v1";

type SeedResult = { created: number; skipped: number }
type Refs = {
  customers: Map<string, string>   // email → id
  services:  Map<string, string>   // name  → id
  members:   Map<string, string>   // email → id
}

// Shared helpers: sql, cuid, ok, info, fail (same pattern as seed-dev-user.ts)

async function loadRefs(tenantId): Promise<Refs>
async function seedCustomers(tenantId, refs): Promise<SeedResult>

// Booking scenarios (62%)
async function seedBookingScenario(tenantId, refs, n): Promise<SeedResult>
async function seedCancelledScenario(tenantId, refs): Promise<SeedResult>
async function seedRescheduleScenario(tenantId, refs): Promise<SeedResult>

// Informational/support scenarios (38%)
async function seedInfoScenario(tenantId, refs, n): Promise<SeedResult>
async function seedFollowUpScenario(tenantId, refs): Promise<SeedResult>

// Active scenario (always 1)
async function seedActiveBookingScenario(tenantId, refs): Promise<SeedResult>

// Internal helper
async function seedMessages(conversationId, messages): Promise<SeedResult>

main()
  ├─ Resolve tenantId from DEMO_TENANT_SLUG
  ├─ loadRefs (services, team members)
  ├─ seedCustomers
  ├─ seedBookingScenario ×2
  ├─ seedCancelledScenario
  ├─ seedRescheduleScenario
  ├─ seedInfoScenario ×2
  ├─ seedFollowUpScenario
  ├─ seedActiveBookingScenario
  └─ Print summary + dataset version
  
  // Future extension points (commented stubs):
  // await seedAbandonedBookingScenario(tenantId, refs)
  // await seedHumanTakeoverScenario(tenantId, refs)
  // await seedReturnCustomerScenario(tenantId, refs)
  // await seedFAQScenario(tenantId, refs)
  // await seedBroadcastScenario(tenantId, refs)
  // await seedMultiServiceScenario(tenantId, refs)
  // await seedSecondTenant(sql)
```

---

### Customers (12)

| Email | Name | Role in scenarios |
|---|---|---|
| `maria.santos@demo.com` | Maria Santos | 2 completed bookings (returning customer) |
| `james.chen@demo.com` | James Chen | 1 consultation + 1 premium, both completed |
| `sarah.williams@demo.com` | Sarah Williams | No-show → successful rebooking |
| `ahmed.hassan@demo.com` | Ahmed Al-Hassan | Completed premium consultation |
| `emma.thompson@demo.com` | Emma Thompson | **Active** — booking in progress |
| `lucas.oliveira@demo.com` | Lucas Oliveira | Cancelled with reason |
| `aisha.patel@demo.com` | Aisha Patel | 2 completed appointments |
| `daniel.morrison@demo.com` | Daniel Morrison | Upcoming confirmed appointment |
| `nina.kovacs@demo.com` | Nina Kovacs | Completed premium, follow-up conversation |
| `carlos.mendez@demo.com` | Carlos Mendez | 2 completeds across both services |
| `priya.sharma@demo.com` | Priya Sharma | Rescheduled once, then completed |
| `michael.torres@demo.com` | Michael Torres | No-show; informational follow-up conversation |

Idempotency: SELECT-before-INSERT on `(tenantId, email)`.

---

### Appointments (24 total, spread over -4 weeks to +1 week)

| Status | Count | Notes |
|---|---|---|
| COMPLETED | 14 | Across past 4 weeks; drives analytics trends |
| CONFIRMED | 3 | Upcoming next week |
| PENDING | 2 | Just booked; one is Emma's from active scenario |
| CANCELLED | 3 | One includes `cancellationReason = 'schedule conflict'` |
| NO_SHOW | 2 | Sarah (week -3), Michael (week -2) |

Idempotency: SELECT-before-INSERT on `(tenantId, customerId, startAt)`.

---

### Conversations (8 total)

| Scenario | Count | Channel | Status | Appointment outcome |
|---|---|---|---|---|
| Booking (completed) | 2 | WHATSAPP | RESOLVED | COMPLETED |
| Cancelled | 1 | WHATSAPP | RESOLVED | CANCELLED |
| Rescheduled | 1 | WHATSAPP | RESOLVED | CONFIRMED |
| Informational | 2 | WHATSAPP | RESOLVED | None |
| Follow-up | 1 | WHATSAPP | RESOLVED | None (post-appointment check-in) |
| Active booking | 1 | WHATSAPP | OPEN | PENDING |

All conversations: `aiHandled = true`, `assignedToId = null` (AI-handled throughout).

Idempotency: SELECT-before-INSERT on `(tenantId, externalId)` where externalId is
`demo-conv-001` through `demo-conv-008` (maps to WhatsApp thread ID in production).

---

### Messages (~120 total)

Each conversation gets 10–18 messages. Message roles used:
- `USER` — customer's WhatsApp messages
- `ASSISTANT` — AI agent responses
- `SYSTEM` — internal state markers (booking confirmed, etc.)

For resolved booking conversations, the message arc is:
```
USER: greeting / intent
ASSISTANT: welcome + name request
USER: name
ASSISTANT: service options
USER: service choice
ASSISTANT: availability prompt
USER: requested date/time
ASSISTANT: confirmation request
USER: confirmation
ASSISTANT: booking confirmed message
SYSTEM: [Appointment booked: ID=xxx]
```

For the active conversation (Emma), the arc stops mid-flow:
```
USER → ASSISTANT × 5 exchanges → ASSISTANT: "Which time would you prefer?"
[waiting — conversation is OPEN]
```

For informational conversations:
```
USER: question (hours / price / location)
ASSISTANT: answer
USER: follow-up question
ASSISTANT: answer + CTA to book
USER: "thanks, I'll think about it" / "ok book me in"
```

Idempotency: COUNT messages for the conversation. If > 0, skip all messages for that conversation.

---

### Dataset Versioning

```typescript
const DEMO_DATASET_VERSION = "2026-06-v1";
```

Stored as a code constant only for Phase 2. Printed in the seed summary.

**Future enhancement:** Insert a row into `AuditLog` at the end of the seed run:
```sql
INSERT INTO "AuditLog" (id, "tenantId", "actorType", action, resource, "resourceId", "createdAt")
VALUES ($id, $tenantId, 'SYSTEM', 'seed', 'demo-dataset', $DEMO_DATASET_VERSION, now())
ON CONFLICT DO NOTHING;
```
This makes it possible to check which dataset version a database is on without inspecting the
data itself. Not implemented in Phase 2 — documented here as the intended pattern.

---

### Idempotency Summary

| Table | Key | Strategy |
|---|---|---|
| Customer | `(tenantId, email)` | SELECT-before-INSERT |
| Appointment | `(tenantId, customerId, startAt)` | SELECT-before-INSERT |
| Conversation | `(tenantId, externalId)` | SELECT-before-INSERT |
| Message | `(conversationId)` count > 0 | Skip all messages if any exist |

---

### Seed Summary Output

```
─── Demo Seed Summary ────────────────────────────────────────────
  Dataset version : 2026-06-v1
  Entity          Created  Skipped
  ──────────────────────────────────────────────────────────────
  Customers       12       0
  Appointments    24       0
  Conversations   8        0
  Messages        ~120     0
──────────────────────────────────────────────────────────────────
  Dashboard URL   : http://localhost:3000/demo-business/dashboard
──────────────────────────────────────────────────────────────────
```

---

## Files Modified / Created

| File | Action |
|---|---|
| `scripts/seed-demo-data.ts` | Create |
| `package.json` | Add `seed:demo` script |
| `docs/superpowers/specs/2026-06-22-phase2-demo-seed-design.md` | This file |

---

## Out of Scope for Phase 2

- AuditLog seed entries (documented pattern above; deferred)
- Notification seed data (NotificationJob table)
- DailySnapshot seed data (future: aggregate from seeded appointments)
- Second tenant / multi-tenant demo
- Abandoned booking, human takeover, broadcast scenarios (extension point stubs only)
