# n8n ↔ Supabase Authentication Strategy

**Date:** 2026-06-22
**Status:** Decision pending

---

## Context

n8n needs to read configuration from Supabase (`AISettings`, `WorkingHours`, `Service`, `Tenant`)
and write business records (`Customer`, `Appointment`, `Conversation`, `Message`). This document
compares four approaches and recommends one.

---

## Options Compared

### Option A — Service Role Key

n8n uses Supabase's service role key to call the REST API or PostgREST directly.

| | |
|---|---|
| **Security** | ⚠️ Highest risk. Service role bypasses all RLS. A leaked key grants full DB access. |
| **Scalability** | ✅ Works for any number of tenants. |
| **Maintainability** | ✅ No setup. One credential in n8n. |
| **Multi-tenant safety** | ⚠️ Must be enforced at application level — nothing stops n8n from accidentally writing to the wrong tenant without explicit WHERE filters. |
| **Setup effort** | None. |

**Verdict:** Acceptable for development. Must be replaced before production handles real customer data.

---

### Option B — Dedicated Postgres Role

Create a restricted Postgres user in Supabase (`n8n_role`) with table-level `GRANT` permissions
(SELECT on config tables, INSERT/UPDATE on booking tables). n8n connects via the Supabase
direct Postgres connection string.

```sql
CREATE ROLE n8n_role LOGIN PASSWORD 'strong-password';
GRANT SELECT ON "AISettings", "WorkingHours", "Service", "Tenant", "TenantMember" TO n8n_role;
GRANT SELECT, INSERT, UPDATE ON "Customer", "Appointment", "Conversation", "Message" TO n8n_role;
```

| | |
|---|---|
| **Security** | ✅ Least-privilege. n8n cannot touch tables it doesn't need. |
| **Scalability** | ✅ Works for any number of tenants; multi-tenant scoping still enforced by explicit WHERE. |
| **Maintainability** | ⚠️ GRANT statements must be updated when new tables are added. |
| **Multi-tenant safety** | ⚠️ Still relies on n8n filtering by tenantId — but blast radius is limited to granted tables only. |
| **Setup effort** | Low. One-time SQL setup in Supabase SQL Editor. |

**Verdict:** Best balance of security and simplicity for Phase 2–3. Recommended for production.

---

### Option C — Supabase Edge Functions

n8n sends POST requests to named Supabase Edge Functions. Each function validates the request
(HMAC signature or secret header), performs the DB operation server-side, and returns a result.

Example: `POST /functions/v1/book-appointment` with JSON payload; Edge Function validates
tenantId, checks availability, inserts Appointment, returns confirmation.

| | |
|---|---|
| **Security** | ✅ Best. DB credentials never leave Supabase. n8n only needs a shared secret. |
| **Scalability** | ✅ Functions can enforce business logic, rate limits, and tenant isolation. |
| **Maintainability** | ⚠️ Each operation needs a separate Deno function. More code to maintain. |
| **Multi-tenant safety** | ✅ Best. Business logic enforced server-side. |
| **Setup effort** | High. Requires Deno knowledge and Edge Function deployment pipeline. |

**Verdict:** Ideal long-term target, especially once the booking logic grows complex. Premature for Phase 2.

---

### Option D — Next.js API Proxy

n8n calls authenticated Next.js API routes (`/api/n8n/book-appointment`). The routes use the
service role key internally but validate an API key or HMAC before processing.

| | |
|---|---|
| **Security** | ✅ Good. n8n never touches DB directly. |
| **Scalability** | ⚠️ Ties n8n to the dashboard's availability. Dashboard downtime = n8n outage. |
| **Maintainability** | ✅ API routes written in TypeScript, same codebase as dashboard. |
| **Multi-tenant safety** | ✅ Routes enforce tenantId from authenticated context. |
| **Setup effort** | Medium. Needs API key management and route authoring. |

**Verdict:** Good if the dashboard is always running. Introduces tight coupling between the
automation layer and the web app — undesirable in this architecture.

---

## Recommendation

### Phase 2: Option A (Service Role Key) — pragmatic fast-start

Store the service role key as an n8n credential (encrypted). Enforce `WHERE "tenantId" = $1`
explicitly on **every** query. n8n's credential store encrypts at rest. This is acceptable
because:
- Development data only (no real customer data)
- Single operator (no external attack surface)
- Gets Phase 2 done without blocking setup

### Phase 3 (before beta): Migrate to Option B (Dedicated Postgres Role)

Once the n8n workflow structure is stable:
1. Create `n8n_role` in Supabase with table-level grants
2. Update n8n credential to use the restricted Postgres connection string
3. Keep service role key only for Supabase admin operations (migrations, schema changes)

### Phase 4 (before public launch): Consider Option C (Edge Functions) for write operations

Reads can stay on Option B (direct Postgres). Writes that involve business logic
(booking, availability checks) should migrate to Edge Functions for correctness guarantees.

---

## Multi-Tenant Safety Rules (apply from Phase 2 onwards)

Regardless of which option is active, every n8n query **must**:

1. Extract `tenantId` from the webhook payload (Evolution API sends phone number → look up tenant)
2. Pass `tenantId` as an explicit parameter to every SQL query
3. Never use `SELECT * FROM "AISettings"` without a `WHERE "tenantId" = $1` clause
4. Log the `tenantId` at the start of every workflow execution for audit purposes

These rules are enforced by n8n workflow design, not by DB permissions (in Phase 2).
Option B and C enforce them at the infrastructure level.
