# Deployment

---

## Build Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm start            # Run production server
npm run lint         # ESLint check
npm run seed:dev     # Seed a dev user (uses .env.local)
```

---

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public, safe to expose) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (public, safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — **secret, server-only** |
| `DATABASE_URL` | PostgreSQL connection string (pooled via PgBouncer) |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM — **secret, server-only** |

### Optional / AI Providers (Server-only)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Platform-level OpenAI key (used when tenant has no BYOK) |
| `ANTHROPIC_API_KEY` | Platform-level Anthropic key |
| `GOOGLE_AI_API_KEY` | Platform-level Gemini key |

> **Note:** BYOK keys are stored encrypted in the database and take precedence over platform keys when set.

### Future (Phase 4)

| Variable | Description |
|---|---|
| `N8N_WEBHOOK_SECRET` | Shared secret for verifying n8n webhook signatures |
| `EVOLUTION_API_URL` | Evolution API base URL |
| `EVOLUTION_API_KEY` | Evolution API authentication key |

---

## Database Setup

1. Create a Supabase project at supabase.com
2. Copy the connection string (with PgBouncer pooling for Prisma)
3. Set `DATABASE_URL` in `.env.local`
4. Run migrations:
   ```bash
   npx prisma migrate dev     # Development (creates migration files)
   npx prisma migrate deploy  # Production (applies existing migrations)
   ```
5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

---

## Prisma Configuration

The project uses the `@prisma/adapter-pg` adapter (PrismaPg) for PostgreSQL via the `pg` npm package. This is configured in `prisma.config.ts`.

```typescript
// prisma.config.ts
import { PrismaPg } from "@prisma/adapter-pg";
```

The Prisma client in `src/lib/prisma.ts` is a singleton with:
- The PrismaPg adapter
- A soft-delete extension that auto-filters `deletedAt: null`
- A `setTenantContext()` helper that sets the `app.current_tenant_id` PostgreSQL variable (for future RLS)

---

## Next.js 16 Notes

This project uses **Next.js 16.2.9** which has breaking changes from earlier versions:

- Middleware entry point: `src/proxy.ts` exports a `proxy` function — not the default `middleware.ts` / `export default function middleware()` pattern.
- Always read `node_modules/next/dist/docs/` for current API before using Next.js features.

---

## Production Checklist

Before going live with a new environment:

- [ ] All required environment variables set
- [ ] `ENCRYPTION_KEY` is a cryptographically random 32-byte hex string (`openssl rand -hex 32`)
- [ ] `DATABASE_URL` points to the pooled PgBouncer URL (not direct connection)
- [ ] `npx prisma migrate deploy` run against production DB
- [ ] Supabase Auth URL configured with correct site URL and redirect URLs
- [ ] Security headers verified (use securityheaders.com)
- [ ] `npm run build` passes without errors
- [ ] `npm run lint` passes without errors
