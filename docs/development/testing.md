# Testing

---

## Current State

**There is no test suite in this project.** As of Phase 3.5, no unit, integration, or E2E tests have been written. The codebase passes `npm run lint` and `npm run build` cleanly.

This is a known gap. This document describes the recommended approach for adding tests in Phase 4 or 5.

---

## Recommended Testing Strategy

### Unit Tests — Utilities

Priority targets in `src/lib/`:

| File | What to test |
|---|---|
| `permissions.ts` | All 19 permissions × 5 roles — verify the matrix is correct |
| `crypto.ts` | encrypt → decrypt round-trip, isEncrypted detection, invalid input |
| `entitlements.ts` | Feature flag resolution order (override > plan default) |
| `ai/pricing.ts` | Cost calculations for each provider/model |

These are pure functions with no external dependencies — easiest to test.

**Recommended framework:** Vitest (fast, TypeScript-native, compatible with Next.js)

```bash
npm install -D vitest @vitest/coverage-v8
```

### Integration Tests — Server Actions

Server actions are the most critical code paths. Test them with a real database connection (do not mock Prisma — too many false positives from mock divergence).

Recommended approach:
- Use a test Supabase project or a local PostgreSQL instance
- Run `prisma migrate deploy` before tests
- Use `prisma.$transaction()` with rollback for test isolation

Priority server actions to test:
1. `createAppointment` — conflict detection (two bookings at same time)
2. `requireTenantAccess` — cross-tenant access attempt must be rejected
3. `updateAISettings` — BYOK key encrypted before storage

### E2E Tests — Critical User Journeys

Use Playwright (already available via MCP in the development environment).

Critical journeys:
1. Register → verify workspace created → see empty dashboard
2. Create appointment → confirm → mark complete
3. Invite team member → they accept → they can view but not manage (STAFF role)
4. Set BYOK API key → verify it is not visible in plain text in DB or UI

---

## What Not to Test

- shadcn/ui components — these are library code
- Prisma query output — test the behavior, not the ORM syntax
- CSS / visual appearance — use Playwright screenshots for visual regression only if needed

---

## Running Lint & Type Check

Before any merge:

```bash
npm run lint        # ESLint
npx tsc --noEmit    # Type check without building
npm run build       # Full production build
```

All three must pass cleanly.
