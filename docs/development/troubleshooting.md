# Troubleshooting

Common errors and how to fix them.

---

## Build & TypeScript

### `Type error: Property 'X' does not exist on type 'Y'`

Usually means a Prisma type is stale. Run:
```bash
npx prisma generate
```

### `Cannot find module '@/lib/...'`

The `@/` alias maps to `src/`. Check `tsconfig.json` `paths` config. Make sure the file exists at `src/lib/...`.

### Build fails with lint errors

```bash
npm run lint
```

Fix all errors before committing. The build (`npm run build`) runs lint as part of Next.js compilation.

---

## Prisma

### `PrismaClientKnownRequestError: Unique constraint failed`

A record with the same unique fields already exists. Common cases:
- Creating a `Customer` with a phone/email that already exists for this tenant
- Creating a `TenantMember` for a user who is already a member

Check `@@unique` constraints in `prisma/schema.prisma`.

### Queries returning deleted records

The soft-delete Prisma extension in `src/lib/prisma.ts` should filter them automatically. If you're seeing deleted records, you may be using a raw Prisma client instead of the singleton from `src/lib/prisma.ts`.

Always import `prisma` from `@/lib/prisma`, not from `@prisma/client` directly.

### `P2025: Record to update not found`

Either the record doesn't exist, it's soft-deleted, or it belongs to a different tenant. Add `tenantId` to the `where` clause if missing.

### Migrations out of sync

```bash
npx prisma migrate dev    # Development — creates new migration
npx prisma migrate deploy # Production — applies pending migrations
npx prisma db push        # Force-push schema without migration (dev only — use carefully)
```

---

## Authentication

### Redirect loop on `/login`

The Supabase session cookie may be corrupted. Clear all cookies in the browser and retry.

In `src/proxy.ts`, make sure the route being accessed is not accidentally in the `PUBLIC_ROUTES` array.

### `getUser()` returns null even when logged in

Session cookie may be set on a different domain/port. In development, make sure the Supabase site URL in the Supabase dashboard matches `http://localhost:3000`.

### New user can log in but can't access the dashboard

The Prisma `User`, `Tenant`, and `TenantMember` records may not have been created. Check `/api/auth/callback` — it should create these on first sign-in. Look for errors in the server logs.

---

## Multi-Tenancy

### `requireTenantAccess` throws 403 for a valid user

The user may not have a `TenantMember` record for this tenant. Check:
```sql
SELECT * FROM "TenantMember" WHERE "userId" = '<user-id>' AND "tenantId" = '<tenant-id>';
```

### Tenant slug not resolving

The `x-tenant-slug` header is set by `src/proxy.ts`. If you're calling `requireTenantAccess` in a Server Action and not passing the slug, it won't be available. Always pass `tenantSlug` explicitly to server actions from the page.

---

## Next.js 16 Specific

### Middleware not running / `middleware.ts` not found

**This project uses `src/proxy.ts`, not `middleware.ts`.** Next.js 16 uses a different entry point. The `proxy` export in `src/proxy.ts` is picked up automatically. Do not create a `middleware.ts` file — it will conflict.

### `TypeError: proxy is not a function`

Make sure `src/proxy.ts` exports a function named `proxy`:
```typescript
export async function proxy(request: NextRequest) { ... }
```

And exports `config`:
```typescript
export const config = { matcher: [...] };
```

---

## Encryption

### Decryption fails / `Error: Invalid auth tag`

The `ENCRYPTION_KEY` environment variable in the current environment doesn't match the key used when the record was encrypted. This happens if:
- The key was rotated without re-encrypting existing records
- You're running against a production DB with a dev `ENCRYPTION_KEY`

Check `isEncrypted(value)` before calling `decrypt()`.

### BYOK key not working after save

The key is encrypted before storage. The `ai-settings-form.tsx` should display a masked placeholder after save, not the real key. The actual key is decrypted server-side at AI call time.

---

## AI Providers

### AI responses failing silently

Check:
1. Is `AISettings` record created for this tenant?
2. Is `byokApiKey` set and properly encrypted?
3. Is the selected `provider` + `model` combination valid in `src/lib/ai/pricing.ts`?
4. Check server logs for the actual error from the AI provider SDK.

### Grok provider not working

The Grok provider (`src/lib/ai/providers/grok.ts`) is a skeleton and is not production-ready. Do not enable it for tenants.

---

## Environment Variables

### `ENCRYPTION_KEY` missing

The app will fail on any encrypt/decrypt operation. Set it to a 32-byte hex string:
```bash
openssl rand -hex 32
```

### Supabase connection errors

Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly. For server-side operations, also check `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL`.

The `DATABASE_URL` must use the **pooled** PgBouncer connection string from Supabase (not the direct connection string) for Prisma to work correctly in serverless environments.
