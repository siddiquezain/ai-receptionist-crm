# ADR-007: Supabase as the Source of Truth

**Status:** Implemented
**Date:** 2026-06-17
**Author:** Mohammed Siddique Zain

---

## Context

The platform involves multiple systems that read and write data: the dashboard, n8n (Phase 4), and potentially future microservices or integrations. Without a designated source of truth, data can get out of sync across systems, leading to inconsistencies (e.g., an appointment that n8n thinks is CONFIRMED but the dashboard shows as PENDING).

---

## Decision

**Supabase PostgreSQL is the single source of truth for all application state.**

Rules:
- All persistent state lives in the Supabase PostgreSQL database.
- No system caches or duplicates data outside of PostgreSQL without an explicit, documented reason.
- n8n writes directly to Supabase (or via dashboard webhook) — it does not maintain its own data store.
- The dashboard reads from Supabase via Prisma — it does not maintain a secondary cache.
- TanStack React Query is a client-side UI cache only — it is not a source of truth and must be invalidated on mutation.
- If two systems disagree, the PostgreSQL record is correct.

---

## Rationale

- **Consistency:** A single database means no sync jobs, no eventual consistency lag, no conflicts.
- **Simplicity:** No cache invalidation complexity across services.
- **Auditability:** One place to look for the current state of any record.
- **Transactions:** PostgreSQL transactions ensure that related writes (e.g., creating an appointment + writing an analytics event) are atomic.
- **Supabase features:** Supabase provides auth, realtime subscriptions, and row-level security — all tightly integrated with the same PostgreSQL database.

---

## Consequences

- Every state change must go through a database write. There is no "in-memory state" that persists across requests.
- TanStack Query cache must be invalidated (via `queryClient.invalidateQueries()`) after every successful Server Action mutation.
- n8n must have appropriate database credentials. These credentials must be scoped correctly (service role key minimum for write access).
- Redis / external caching is not to be introduced without a clear justification and a documented plan for cache invalidation.
- Supabase Realtime subscriptions can be used for live updates in the UI (inbox) — but the database is still the source, Realtime is just the delivery mechanism.
