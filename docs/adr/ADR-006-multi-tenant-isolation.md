# ADR-006: Multi-Tenant Isolation Strategy

**Status:** Implemented
**Date:** 2026-06-17
**Author:** Mohammed Siddique Zain

---

## Context

The platform hosts multiple businesses (tenants) on shared infrastructure with a shared database. The most critical security requirement is that Tenant A can never see or modify Tenant B's data.

There are three common isolation strategies:
1. **Database-per-tenant** — strongest isolation, impractical at scale, complex migrations
2. **Schema-per-tenant** — moderate isolation, complex Prisma setup, migration headaches
3. **Row-level isolation** — shared tables with `tenantId` column, tenant verified in every query

A fourth layer — database-level Row-Level Security (RLS) — can complement strategy 3.

---

## Decision

**Row-level isolation with `tenantId` enforced at the ORM layer, with URL-based tenant resolution.**

Specifics:

**URL routing:** All dashboard routes follow `/{tenant-slug}/{section}`. The slug is the human-readable identifier for the tenant.

**Middleware injection:** `src/proxy.ts` extracts the slug from the URL and injects it as the `x-tenant-slug` HTTP header for all downstream components to read.

**Slug → ID resolution:** `src/lib/tenant.ts` resolves the slug to a `tenantId` via a Prisma lookup. Server actions and page components use `tenantId` (not slug) for all DB queries.

**Membership verification:** `requireTenantAccess(slug)` in `src/lib/server-auth.ts` checks that the authenticated user has a `TenantMember` record for this tenant before returning `tenantId`.

**Query scoping:** Every Prisma query that touches tenant data includes `{ where: { tenantId } }`. The Prisma soft-delete extension adds `{ deletedAt: null }` automatically.

**Agency model:** Tenants can have a `parentTenantId` to form an agency → client hierarchy. Agency owners can manage child tenants via the `agency.manage_businesses` permission.

**RLS (deferred):** Supabase RLS policies will be added in Phase 4 as a second defense layer, but are not currently active.

---

## Rationale

- **Simplicity:** Row-level isolation with Prisma is straightforward to implement and maintain.
- **Single database:** Shared schema with tenant ID means zero migration overhead when adding features.
- **Defense in depth:** Membership check in `requireTenantAccess` + `tenantId` in every query = two independent guards.
- **URL-based routing:** Clean URLs that humans can share and bookmark. No tenant switching UI needed — different tenants are different URLs.

---

## Consequences

- Every Server Action must call `requireTenantAccess()` before any DB operation. Skipping this is a security vulnerability.
- Every Prisma query on tenant-owned models must include `tenantId` in the `where` clause. Never omit it.
- New models added to the schema must have a `tenantId` field if they belong to a tenant.
- The slug is not stable (could theoretically be renamed). All internal references use `tenantId` (CUID). The slug is only for URL display.
- Supabase RLS is deferred but must be added before the platform handles high-value tenants. Without RLS, a compromised service role key could bypass app-layer checks.
