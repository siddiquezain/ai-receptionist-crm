# Security

Security hardening was completed in **Phase 3.5 (2026-06-23)**. This document describes the current security posture.

Full audit report: [docs/security/phase-3.5-audit.md](../../docs/security/phase-3.5-audit.md)

---

## Security Layers

```
1. Transport         HSTS, TLS-only (enforced by Supabase + Vercel)
2. HTTP Headers      next.config.ts security headers
3. Session           Supabase SSR HTTP-only cookie, server-validated
4. Route Protection  src/proxy.ts — auth check on every request
5. Action Guards     requireTenantAccess() + requirePermission() in every Server Action
6. Data Isolation    tenantId filter on every Prisma query
7. Encryption        AES-256-GCM for sensitive fields at rest
8. Audit Trail       AuditLog — append-only, fire-and-forget
```

---

## HTTP Security Headers

Set in `next.config.ts` for all responses:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevent clickjacking via iframes |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `X-DNS-Prefetch-Control` | `off` | Reduce DNS pre-fetch timing attacks |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HSTS |
| `Permissions-Policy` | Restricts camera, microphone, geolocation | Minimize attack surface |

---

## RBAC (Role-Based Access Control)

Defined in `src/lib/permissions.ts`.

### Roles (highest to lowest)

`OWNER` > `ADMIN` > `MANAGER` > `STAFF` > `VIEWER`

### Permission Matrix

| Permission | OWNER | ADMIN | MANAGER | STAFF | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `analytics.view` | ✓ | ✓ | ✓ | — | ✓ |
| `appointments.manage_all` | ✓ | ✓ | ✓ | — | — |
| `appointments.manage_own` | ✓ | ✓ | ✓ | ✓ | — |
| `customers.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `customers.edit` | ✓ | ✓ | ✓ | — | — |
| `inbox.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `inbox.send` | ✓ | ✓ | ✓ | ✓ | — |
| `team.manage` | ✓ | ✓ | ✓ | — | — |
| `working_hours.manage_all` | ✓ | ✓ | ✓ | — | — |
| `working_hours.manage_own` | ✓ | ✓ | ✓ | ✓ | — |
| `services.manage` | ✓ | ✓ | ✓ | — | — |
| `ai_settings.manage` | ✓ | ✓ | — | — | — |
| `integrations.manage` | ✓ | ✓ | — | — | — |
| `webhooks.manage` | ✓ | ✓ | — | — | — |
| `billing.view` | ✓ | ✓ | — | — | — |
| `profile.edit` | ✓ | ✓ | — | — | — |
| `workspace.delete` | ✓ | — | — | — | — |
| `agency.manage_businesses` | ✓ | ✓ | — | — | — |

### Enforcement

```typescript
// In every Server Action:
requirePermission(role, "appointments.manage_all");
// Throws Error with status 403 if role lacks permission
```

---

## Server Action Security Pattern

Every mutation must follow this exact order:

```typescript
"use server";

export async function exampleAction(input: Input) {
  // Step 1: Verify authenticated
  const { prismaUser } = await requireAuth();

  // Step 2: Verify tenant membership + get role
  const { tenantId, role } = await requireTenantAccess(tenantSlug);

  // Step 3: Verify permission for this specific action
  requirePermission(role, "resource.action");

  // Step 4: Parse/validate input
  const parsed = schema.parse(input);

  // Step 5: Execute mutation
  const result = await prisma.model.update({ where: { id, tenantId }, data: parsed });

  // Step 6: Audit log (fire-and-forget — never awaited in critical path)
  logAudit({ tenantId, actorId: prismaUser.id, actorType: "USER", action: "resource.updated", ... });

  return result;
}
```

---

## Encryption

Implemented in `src/lib/crypto.ts`.

**Algorithm:** AES-256-GCM
**Format stored in DB:** `hex(iv):hex(authTag):hex(ciphertext)` (colon-separated)
**IV:** 96-bit (12 bytes), cryptographically random per encryption
**Auth tag:** 128-bit — provides integrity verification

Used for:
- `AISettings.byokApiKey` — BYOK API keys
- `CalendarIntegration.accessToken` and `.refreshToken` — OAuth tokens

Decryption guard pattern:
```typescript
if (settings.byokApiKey && isEncrypted(settings.byokApiKey)) {
  const apiKey = decrypt(settings.byokApiKey);
  // use apiKey
}
```

---

## Audit Log

Implemented in `src/lib/audit.ts`.

**Model:** `AuditLog` in Prisma schema.
**Pattern:** Fire-and-forget — errors are caught and swallowed. Audit logging never blocks or rolls back the primary action.

```typescript
// Always fire-and-forget:
logAudit({ tenantId, actorId, actorType: "USER", action: "appointment.cancelled", resource: "Appointment", resourceId: id, changes: { before, after } });
```

Currently instrumented on:
- Appointment create, update, cancel, delete
- Customer create, update, delete
- AI settings update
- Team member invite, deactivate
- Workspace profile update

---

## Soft Deletes

The Prisma extension in `src/lib/prisma.ts` wraps all reads to append `{ deletedAt: null }`. This means:

- **All `findMany`, `findFirst`, `findUnique` calls automatically exclude soft-deleted records.**
- Never call `prisma.model.delete()` — always `update({ data: { deletedAt: new Date() } })`.
- Hard-deleted records can never be recovered. Soft-deleted ones can (intentionally) be un-deleted.

---

## Deferred Security Improvements

These were identified in the Phase 3.5 audit and deferred to future phases:

| Item | Reason Deferred | Target Phase |
|---|---|---|
| Supabase RLS policies | Requires schema-level work, lower urgency with app-layer enforcement | Phase 4 |
| Environment variable validation (`@t3-oss/env-nextjs`) | Low risk, startup-time check | Phase 4 |
| Rate limiting on auth endpoints (`@upstash/ratelimit`) | Supabase has basic rate limiting; custom limits deferred | Phase 4 |
| Server-side logout (session invalidation) | Client-side logout is adequate for current threat model | Phase 4 |
| Calendar OAuth token encryption | Tokens are not yet in use (feature not activated) | Phase 4 |
| Structured logging (Pino/Axiom) | Console.log is adequate for dev; needed before production load | Phase 4 |
| Webhook signature validation | n8n not yet integrated | Phase 4 |
