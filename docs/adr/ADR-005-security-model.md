# ADR-005: Security Model

**Status:** Implemented
**Date:** 2026-06-23
**Author:** Mohammed Siddique Zain

---

## Context

The platform is multi-tenant SaaS handling sensitive business data (customer contact info, appointment records, payment amounts) and potentially sensitive API keys (BYOK). A security breach would affect all tenants.

The Phase 3.5 security audit identified the following risks that needed to be addressed before any public launch:
- Server actions accessible without tenant membership verification
- API keys stored in plaintext
- No audit trail for sensitive mutations
- No HTTP security headers

---

## Decision

The security model is layered and enforced in code (not just configuration):

**Layer 1 — Transport:** HTTPS enforced by hosting platform (Vercel/Supabase). HSTS header set in `next.config.ts`.

**Layer 2 — HTTP Headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security` — all set in `next.config.ts`.

**Layer 3 — Authentication:** All protected routes pass through `src/proxy.ts` which calls `supabase.auth.getUser()` (not `getSession()`) and redirects unauthenticated requests to `/login`.

**Layer 4 — Authorization:** Every Server Action calls, in order:
1. `requireAuth()` — confirms identity
2. `requireTenantAccess(slug)` — confirms membership
3. `requirePermission(role, permission)` — confirms action is allowed for this role

**Layer 5 — Data Isolation:** All Prisma queries include `tenantId` in the `WHERE` clause. The Prisma extension enforces soft-delete filtering. There is no way to access another tenant's data through normal code paths.

**Layer 6 — Encryption at Rest:** BYOK API keys and calendar OAuth tokens are encrypted with AES-256-GCM before storage. The encryption key (`ENCRYPTION_KEY`) is a server-side environment variable, never exposed to the client.

**Layer 7 — Audit Trail:** `logAudit()` is called (fire-and-forget) on all sensitive mutations. The `AuditLog` table is append-only from the application layer.

**Layer 8 — Soft Deletes:** No hard deletes in the application. Records are recoverable and their deletion is auditable.

---

## Rationale

- **Defense in depth:** Multiple independent layers mean a failure in one layer does not immediately expose data.
- **Code-enforced, not trust-based:** Guards are in the code path, not just in documentation. Forgetting to check permissions throws a 403.
- **Encryption at rest for secrets:** API keys are the highest-value target. Encrypting them means a database dump does not expose usable keys.
- **Audit log separation:** Having an append-only audit log separate from the business records makes tampering detectable.

---

## Consequences

- Every new Server Action must call all three auth guards before doing anything else. This is a hard convention, not optional.
- The `ENCRYPTION_KEY` environment variable must be set in all environments. If it is missing, BYOK key operations will fail.
- `logAudit()` errors are swallowed by design. If the audit log write fails, the primary action still succeeds. This is intentional — better to complete the action and lose the log than to fail both.
- Future webhook endpoints (n8n Phase 4) must verify HMAC signatures. The `N8N_WEBHOOK_SECRET` environment variable must be set before any webhook endpoints are exposed.
- Server-side logout, Supabase RLS, and rate limiting are deferred — see [docs/security/phase-3.5-audit.md](../../docs/security/phase-3.5-audit.md).

See also: [docs/architecture/security.md](../architecture/security.md).
