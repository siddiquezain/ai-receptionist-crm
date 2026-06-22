# Phase 1 – Data Seed Design

**Date:** 2026-06-22
**Branch:** feat/premium-redesign
**Status:** Approved

---

## Goal

Extend `scripts/seed-dev-user.ts` so the database contains realistic reference data for the dashboard, AI agent, and upcoming n8n automation layer.

---

## Architecture Principles

This project follows a strict separation of concerns:

| Layer | Responsibility |
|---|---|
| Next.js dashboard | Configuration UI, data display |
| Supabase | Single source of truth for all configuration and business data |
| n8n | Automation engine, reads config from Supabase, executes AI |
| AI provider (Gemini, OpenAI, etc.) | LLM execution only |
| Evolution API | WhatsApp channel integration |

**The dashboard never executes AI for customer conversations.** It only stores configuration that n8n reads. API keys are managed in n8n's secrets vault, not in Supabase.

---

## Implementation Approach

**Option B — Helper functions in the same file.**

All new seed logic lives in `scripts/seed-dev-user.ts` alongside the existing code. No new files, no new npm scripts, no framework changes. Raw SQL via the `postgres` package throughout.

### Function structure

```
main()
  ├─ [existing] step 1: Supabase Auth user
  ├─ [existing] step 2: User DB record
  ├─ [existing] step 3: Tenant + TenantMember
  ├─ [new] step 4: seedServices(sql, tenantId)
  ├─ [new] step 5: seedWorkingHours(sql, tenantId)
  ├─ [new] step 6: seedAISettings(sql, tenantId)
  └─ [new] step 7: seedTeamMember(sql, tenantId)
```

Each helper returns a `{ created: number; skipped: number }` result. `main()` collects these and prints a summary table at the end.

---

## Data to Seed

### Services

Table: `Service`

| Field | Consultation | Premium Consultation |
|---|---|---|
| `name` | Consultation | Premium Consultation |
| `description` | 30-minute consultation session | 60-minute in-depth consultation |
| `duration` | 30 | 60 |
| `bufferTime` | 0 | 0 |
| `price` | 50.00 | 100.00 |
| `currency` | USD | USD |
| `isActive` | true | true |

Idempotency: `SELECT` by `(tenantId, name)` before `INSERT`.

### Working Hours

Table: `WorkingHours` (tenant-level; `teamMemberId = NULL`)

| `dayOfWeek` | Day | `startTime` | `endTime` | `isOpen` |
|---|---|---|---|---|
| 0 | Sunday | 09:00 | 18:00 | false |
| 1 | Monday | 09:00 | 18:00 | true |
| 2 | Tuesday | 09:00 | 18:00 | true |
| 3 | Wednesday | 09:00 | 18:00 | true |
| 4 | Thursday | 09:00 | 18:00 | true |
| 5 | Friday | 09:00 | 18:00 | true |
| 6 | Saturday | 09:00 | 18:00 | true |

Idempotency: `SELECT` by `(tenantId, dayOfWeek)` where `teamMemberId IS NULL` before `INSERT`.

### AI Settings

Table: `AISettings` (`tenantId` has `@unique` constraint)

| Field | Value | Notes |
|---|---|---|
| `provider` | `google` | Plain string — no enum. Swap with `UPDATE` only. |
| `model` | `gemini-2.0-flash` | Plain string — no enum. Per-tenant overrideable. |
| `fallbackProvider` | NULL | n8n handles fallback logic |
| `fallbackModel` | NULL | n8n handles fallback logic |
| `temperature` | 0.7 | Sensible default |
| `maxTokens` | 1000 | Sensible default |
| `systemPrompt` | (see below) | Business-level prompt n8n injects |
| `autoBook` | true | n8n reads this to decide whether to confirm automatically |
| `requireConfirm` | false | n8n reads this to decide whether to ask for confirmation |
| `byokApiKey` | NULL | **Never set in dashboard. API keys live in n8n.** |

**System prompt:**
```
You are a professional appointment booking assistant for Demo Business.
Your role is to help customers schedule, reschedule, or cancel appointments via WhatsApp.
Always be polite, concise, and helpful.
When collecting information, ask one question at a time.
Never share internal system details, pricing structures, or staff information unless asked directly.
If you are unsure about availability, always defer to the booking system rather than guessing.
```

Idempotency: `INSERT ... ON CONFLICT ("tenantId") DO UPDATE SET ...` (schema enforces uniqueness).

### Team Member

Table: `TeamMember`

| Field | Value |
|---|---|
| `name` | Sarah Johnson |
| `email` | sarah@demo.com |
| `role` | Staff |
| `isActive` | true |
| `userId` | NULL (not linked to a Supabase auth account) |
| `inviteToken` | NULL |
| `maxAppointmentsPerDay` | NULL |

Idempotency: `SELECT` by `(tenantId, email)` before `INSERT`.

---

## Idempotency Strategy

| Table | Strategy |
|---|---|
| `Service` | SELECT → INSERT only if not found |
| `WorkingHours` | SELECT → INSERT only if not found (per `dayOfWeek`) |
| `AISettings` | `INSERT ... ON CONFLICT ("tenantId") DO UPDATE SET` |
| `TeamMember` | SELECT → INSERT only if not found |

All helpers are safe to run multiple times. Re-running the script will print "skipped" for records that already exist.

---

## Schema Observations

- `Tenant` is the multi-tenant model (not `Organization` — the user's requirements use that term but the schema table is `Tenant`)
- `AISettings.provider` and `AISettings.model` are unconstrained strings — ideal for multi-provider support
- `byokApiKey` exists in the schema but should remain `NULL` in all seed/dev scenarios; the field supports future enterprise BYOK without changing the dashboard architecture
- `WorkingHours` has no unique constraint on `(tenantId, dayOfWeek)` — idempotency must be handled manually in SQL
- `TeamMember.inviteToken` is `@unique` — must be NULL or a globally unique value; seeded as NULL

---

## n8n Integration Contract

When the n8n automation layer is built, it will read from Supabase as follows:

```sql
SELECT provider, model, "systemPrompt", "autoBook", "requireConfirm"
FROM "AISettings"
WHERE "tenantId" = $1;
```

n8n then:
1. Selects the AI node matching `provider` (Google Gemini node, OpenAI node, Anthropic node, etc.)
2. Uses `model` to configure the node
3. Injects `systemPrompt` as the system message
4. Reads `autoBook` / `requireConfirm` to control booking confirmation flow

Changing a tenant's AI provider requires only an `UPDATE "AISettings" SET provider = '...', model = '...' WHERE "tenantId" = '...'` — no code changes to n8n or the dashboard.

---

## Files Modified

- `scripts/seed-dev-user.ts` — only file changed

---

## Out of Scope for Phase 1

- Seeding `Appointment` records
- Seeding `Customer` records
- Seeding `Conversation` records
- `TeamMemberService` junction table (linking team member to services)
- Any n8n workflow configuration
