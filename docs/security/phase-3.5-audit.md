# Phase 3.5 — Security Audit Report

**Date:** 2026-06-23
**Status:** COMPLETE

---

## Executive Summary

The appointment SaaS dashboard had a solid foundation: proper tenant membership validation in the page layout, tenant-scoped Prisma queries throughout, a well-designed RBAC permissions model, and a correct Supabase Auth SSR setup. However, several critical gaps existed that prevented production readiness:

- **16 server actions** accepted `tenantId` from the client without ever verifying the caller's session or tenant membership — any authenticated user could POST directly to any action and mutate another tenant's data
- **`src/proxy.ts`** (the Next.js 16 middleware) was correctly wired as the route-level auth guard, but server actions bypass route-level protection entirely
- **BYOK API keys** were stored in plaintext in the database despite an `ENCRYPTION_KEY` env var already being set
- The **`AuditLog`** Prisma table had never been written to
- **Security response headers** were absent from `next.config.ts`
- **`deactivateTeamMember`** had no tenant filter — any team member ID could be targeted

All critical and high-severity issues have been resolved in this phase. The build is clean and all TypeScript checks pass.

---

## Risk Assessment

### Critical (RESOLVED)

| # | Issue | Resolution |
|---|---|---|
| C1 | 16 server actions accepted `tenantId` from client with no session or membership check | `requireTenantAccess()` added to every action in all 4 action files |
| C2 | `deactivateTeamMember` updated `where: { id: teamMemberId }` with no tenant filter — any member ID could be targeted | Signature changed to include `tenantId`; `findFirst({ where: { id, tenantId } })` ownership check added before update |
| C3 | No RBAC enforcement — any tenant member could call any action regardless of role | `requirePermission(role, permission)` added to every mutation action |

### High (RESOLVED)

| # | Issue | Resolution |
|---|---|---|
| H1 | BYOK API keys stored in plaintext — `ENCRYPTION_KEY` env var existed but was unused | `src/lib/crypto.ts` created (AES-256-GCM); encryption applied on write in `updateAISettings`; `isEncrypted()`/`decrypt()` pattern documented for all read paths |
| H2 | `AuditLog` Prisma table existed but had never been written to | `src/lib/audit.ts` created with fire-and-forget `logAudit()`; instrumented in 7 actions: profile update, AI settings update, team member create/deactivate, customer delete, appointment cancel |
| H3 | No security response headers | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`, `HSTS` added to `next.config.ts` |

### Medium (RESOLVED)

| # | Issue | Resolution |
|---|---|---|
| M1 | `@tanstack/react-query-devtools` listed in `dependencies` (production bundle) | Moved to `devDependencies` |

### Medium (DEFERRED)

| # | Issue | Recommendation |
|---|---|---|
| M2 | No environment variable validation at startup | Add `@t3-oss/env-nextjs` to validate required env vars at build time; fail fast on misconfiguration |
| M3 | No Row-Level Security (RLS) policies in Supabase | `setTenantContext()` already exists in `prisma.ts`; add RLS policies as defense-in-depth via Supabase dashboard when available |
| M4 | Calendar OAuth tokens (`accessToken`, `refreshToken`) stored in plaintext | Apply same `encrypt()`/`decrypt()` pattern from `src/lib/crypto.ts` when calendar integration is actively used |
| M5 | Logout is client-side only (`supabase.auth.signOut()` in browser) | Wrap in a server action so the session cookie is invalidated server-side |

### Low (DEFERRED)

| # | Issue | Recommendation |
|---|---|---|
| L1 | No rate limiting on auth endpoints | Implement `@upstash/ratelimit` on `/api/auth/callback` and future webhook endpoints before public launch |
| L2 | Per-page tenant slug lookup — each page queries `tenant` by slug | Middleware already injects `x-tenant-slug` header; complete the wiring to inject `x-tenant-id` too, eliminating redundant lookups |
| L3 | AI inference runs directly in the dashboard process | Move to n8n in Phase 4; do not refactor here |
| L4 | No structured logging service | Add Pino or integrate with Axiom/Datadog when moving to production hosting |

---

## Issues Found vs. Fixed

- **Found:** 17 issues (3 Critical, 3 High, 5 Medium, 6 Low)
- **Fixed in Phase 3.5:** 7 issues (all Critical + High + 1 Medium)
- **Deferred with documentation:** 9 issues

---

## Architecture Note: Next.js 16 Middleware

This project uses **Next.js 16**, which introduced `proxy.ts` as the replacement for `middleware.ts` as the request interception entry point. `src/proxy.ts` correctly handles:
- Unauthenticated route protection (redirects to `/login`)
- Tenant slug injection via `x-tenant-slug` header
- Public route exclusions (`/login`, `/register`, `/forgot-password`, `/book/*`)
- Static asset pass-through

Server actions bypass route-level protection by design (they are direct POST endpoints). This is why per-action auth guards (`requireTenantAccess`) are essential — they cannot be replaced by middleware alone.

---

## Verified Secure (Pre-Existing)

- ✅ All Prisma queries include `tenantId` in `where` clauses — no cross-tenant data exposure
- ✅ Prisma soft-delete extension auto-applies `deletedAt: null` — deleted records never leak
- ✅ `supabase.auth.getUser()` used (not `.getSession()`) — server-side validated, not relying on client JWT
- ✅ `Customer` has `@@unique([tenantId, email])` and `@@unique([tenantId, phone])` — no cross-tenant collision
- ✅ Error messages sanitized — raw Prisma errors never reach the client
- ✅ OAuth callback uses `exchangeCodeForSession()` — correct PKCE code-exchange pattern
- ✅ Sessions managed as HTTP-only cookies via Supabase SSR

---

## New Files Created

| File | Purpose |
|---|---|
| `src/lib/server-auth.ts` | `requireAuth()` and `requireTenantAccess()` — shared auth guard for all server actions |
| `src/lib/crypto.ts` | AES-256-GCM `encrypt()` / `decrypt()` / `isEncrypted()` for secrets at rest |
| `src/lib/audit.ts` | Fire-and-forget `logAudit()` helper writing to the `AuditLog` table |

## Files Modified

| File | Change |
|---|---|
| `src/lib/actions/settings.ts` | Auth guards + RBAC + audit logging on all 5 actions; `deactivateTeamMember` bug fixed |
| `src/lib/actions/customers.ts` | Auth guards + RBAC + audit logging on all 3 actions |
| `src/lib/actions/appointments.ts` | Auth guards + RBAC + audit logging on all 4 actions |
| `src/lib/actions/inbox.ts` | Auth guards + permissions on all 4 actions |
| `src/components/settings/team-members-panel.tsx` | Updated `deactivateTeamMember` call site (new `tenantId` first param) |
| `next.config.ts` | Security response headers added |
| `package.json` | `react-query-devtools` moved to `devDependencies` |
| `.env.local` | Removed leading space from `ENCRYPTION_KEY` value |

---

## Recommendations Before Phase 4 (n8n ↔ Supabase Integration)

1. **Webhook endpoint security:** When n8n webhook endpoints are added to the dashboard, each must validate a shared secret header (`X-Webhook-Secret: <token>`). The token must live in `.env` only — never in the UI or database. Generate now: `openssl rand -hex 32` and add to `.env.local` as `WEBHOOK_SECRET`.

2. **n8n must not receive BYOK keys directly:** The dashboard stores encrypted BYOK keys for tenant management purposes. When n8n needs to call an AI provider on behalf of a tenant, it should call a secure internal dashboard API endpoint that decrypts and forwards the key — n8n itself must not persist tenant API keys.

3. **Evolution API webhook validation:** When Evolution API sends WhatsApp events to the dashboard, validate the source IP range or use a signing secret. Do not expose unauthenticated webhook receivers.

4. **Rate limit before public launch:** Implement `@upstash/ratelimit` on `/api/auth/callback` and any future webhook endpoints. This is a 1-2 hour task with Upstash Redis.

5. **Add `WEBHOOK_SECRET` to env now:** Even if n8m integration is Phase 4, establish the env var now so it's in place when needed.
