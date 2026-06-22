# Database Constraints Proposal

**Date:** 2026-06-22
**Status:** Proposed — not yet applied

---

## Problem

Phase 1 seed helpers use SELECT-before-INSERT for idempotency on `Service` and `WorkingHours`
because neither table has a database-level unique constraint. This means duplicate rows can be
created by concurrent inserts (n8n workflows, future API routes) with no DB-level safety net.

---

## Constraints Needed

### 1. `Service` — unique name per active tenant

**Constraint:** One service name per tenant, ignoring soft-deleted rows.

**Why partial?** `Service.deletedAt` enables soft-deletes. If "Consultation" is soft-deleted,
the tenant should be able to create a new "Consultation" service. A plain `@@unique` would
block that. A partial index scoped to `WHERE "deletedAt" IS NULL` handles it correctly.

**SQL:**
```sql
CREATE UNIQUE INDEX "Service_tenantId_name_active_key"
  ON "Service" ("tenantId", name)
  WHERE "deletedAt" IS NULL;
```

**Prisma schema note:** Add a `@@index([tenantId, name])` in the `Service` model as a hint
for query plans, but the actual uniqueness guarantee must come from the raw SQL migration above.
Prisma's `@@unique` does not support `WHERE` clauses.

---

### 2. `WorkingHours` — one slot per (tenant, day) for tenant-level hours

Two separate partial indexes are needed:

**2a. Tenant-level hours** (teamMemberId IS NULL):
```sql
CREATE UNIQUE INDEX "WorkingHours_tenant_dayOfWeek_key"
  ON "WorkingHours" ("tenantId", "dayOfWeek")
  WHERE "teamMemberId" IS NULL;
```

**2b. Per-member hours** (teamMemberId IS NOT NULL):
```sql
CREATE UNIQUE INDEX "WorkingHours_member_dayOfWeek_key"
  ON "WorkingHours" ("tenantId", "teamMemberId", "dayOfWeek")
  WHERE "teamMemberId" IS NOT NULL;
```

**Why two indexes?** PostgreSQL does not treat two NULL values as equal in a standard unique
constraint, so `UNIQUE (tenantId, dayOfWeek, teamMemberId)` would allow unlimited
tenant-level duplicates. The partial index targeting `WHERE "teamMemberId" IS NULL` closes
that gap. Index 2b handles the future per-member schedule case correctly.

---

## Future-Proofing Notes

- **Multiple schedules / shift patterns** — if the product ever supports multiple named
  schedules per tenant (e.g., "Summer hours", "Holiday schedule"), the `WorkingHours` model
  would need a `scheduleId` column. The constraint would then be on
  `(tenantId, scheduleId, dayOfWeek)` rather than `(tenantId, dayOfWeek)`. These indexes
  would need to be dropped and replaced at that point. This is expected and is not a reason
  to delay applying them now.

- **Services with variants** — if services ever have variants (e.g., "Consultation — In Person"
  vs "Consultation — Remote"), the unique constraint should be re-evaluated. The current
  constraint on `(tenantId, name)` would block this without a naming convention change.

---

## How to Apply

### Option A — Prisma raw SQL migration (recommended)

```bash
npx prisma migrate dev --create-only --name add_partial_unique_indexes
```

Edit the generated `migration.sql` file to add the four SQL statements above, then:

```bash
npx prisma migrate dev
```

### Option B — Supabase SQL Editor

Run the four `CREATE UNIQUE INDEX` statements directly via the Supabase SQL editor.
Update `prisma/migrations/` manually afterwards to keep migration history in sync
(otherwise `prisma migrate deploy` in CI will fail).

### Option C — Defer until Phase 3

Continue relying on application-level SELECT-before-INSERT guards. Acceptable for dev/solo
but must be addressed before public launch to avoid race conditions.

---

## Recommendation

**Apply Option A before the n8n integration phase.** Once n8n workflows begin writing
`Appointment` records and triggering booking logic, concurrent inserts become real.
The partial indexes are cheap to add now and eliminate a whole class of data-integrity bugs.

---

## Risk Assessment

| Constraint | Breaking change? | Notes |
|---|---|---|
| `Service_tenantId_name_active_key` | No | Only blocks future duplicates; existing data unaffected if clean |
| `WorkingHours_tenant_dayOfWeek_key` | No | Phase 1 seed creates exactly one row per day; no conflicts |
| `WorkingHours_member_dayOfWeek_key` | No | No per-member rows exist yet |
