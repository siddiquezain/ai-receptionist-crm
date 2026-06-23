# Authentication

Provider: **Supabase Auth** via `@supabase/ssr`.

---

## Overview

Authentication is session-based using HTTP-only cookies managed by Supabase SSR. There are two Supabase clients:

| Client | File | Used In |
|---|---|---|
| Server client | `src/lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers |
| Browser client | `src/lib/supabase/client.ts` | Client Components (realtime only) |

**Critical rule:** Always call `supabase.auth.getUser()` — never `supabase.auth.getSession()` on the server. `getUser()` makes a network call to Supabase to verify the session is valid. `getSession()` only reads the cookie and can be spoofed.

---

## Registration Flow

```
1. User fills /register form (name, email, password, business name)
2. Client calls supabase.auth.signUp({ email, password, options: { data: { full_name } } })
3. Supabase creates auth.users record, sends verification email
4. On email confirmation → OAuth callback hit → /api/auth/callback/route.ts
5. Callback exchanges code for session
6. Callback creates Prisma records:
   - User { supabaseAuthId, email, name }
   - Tenant { name: businessName, slug: generated from name }
   - TenantMember { userId, tenantId, role: OWNER }
7. User redirected to /{tenant-slug}/dashboard
```

---

## Login Flow

```
1. User fills /login form (email, password)
2. Client calls supabase.auth.signInWithPassword()
3. Supabase validates credentials, sets HTTP-only session cookie
4. Server looks up User by supabaseAuthId
5. Finds first TenantMember → redirects to /{tenant-slug}/dashboard
```

---

## Session Validation (Every Request)

```
src/proxy.ts (Next.js 16 middleware)
  │
  ├── Skips: /login, /register, /forgot-password, /book/*
  │
  └── All other routes:
        supabase.auth.getUser()
          ├── Valid → injects x-tenant-slug header, continues
          └── Invalid → redirect to /login?redirect={current-path}
```

---

## Server Action Auth Guards

Every server action in `src/lib/actions/*.ts` calls these guards in order:

```typescript
// 1. Verify the user is authenticated
const { user, prismaUser } = await requireAuth();

// 2. Verify the user belongs to this tenant with a valid role
const { tenantId, role } = await requireTenantAccess(tenantSlug);

// 3. Check the user has the required permission for this action
requirePermission(role, "appointments.manage_all");

// 4. Proceed with the mutation
```

**`requireAuth()`** (`src/lib/server-auth.ts`):
- Calls `supabase.auth.getUser()`
- Looks up the Prisma `User` record by `supabaseAuthId`
- Throws 401 if not authenticated

**`requireTenantAccess(slug)`** (`src/lib/server-auth.ts`):
- Resolves slug to `tenantId` via Prisma
- Looks up `TenantMember` for (userId, tenantId)
- Throws 403 if no membership found
- Returns `{ tenantId, role }`

---

## Tenant Context in the URL

All dashboard routes use the pattern `/{tenant-slug}/{section}`.

The proxy extracts the first path segment and injects it as `x-tenant-slug` response header (constant `TENANT_SLUG_HEADER` from `src/lib/tenant.ts`). Pages and server actions read this header to resolve the tenant.

Segments excluded from tenant extraction: `api`, `_next`, `favicon.ico`.

---

## Multi-Tenant Access

A user can be a member of multiple tenants (e.g., an agency owner and their client businesses). The current tenant is always determined by the URL slug, not a session variable. This means:

- Users don't "switch" accounts — they navigate to a different tenant URL
- `TenantMember` records control what each user can do per tenant

---

## Password Reset

```
1. User submits /forgot-password form
2. supabase.auth.resetPasswordForEmail(email)
3. Supabase sends reset link
4. User clicks link → handled by Supabase Auth (redirect back with token)
5. New password set via supabase.auth.updateUser({ password })
```

---

## OAuth (Future / Optional)

The `/api/auth/callback/route.ts` handles the OAuth code exchange. This supports Google OAuth if enabled in the Supabase dashboard. The callback creates the Prisma `User`, `Tenant`, and `TenantMember` records on first sign-in.

---

## Logout

Currently client-side only:
```typescript
await supabase.auth.signOut();
router.push("/login");
```

Server-side logout (invalidating the session server-side) is deferred — tracked in the security audit as a low-priority improvement.
