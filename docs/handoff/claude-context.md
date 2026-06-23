# Project Context — AI Appointment SaaS Dashboard

> **This is the single entry point for new Claude Code sessions.**
> Read this file first. Follow links for deeper context.

---

## Vision

A premium, multi-tenant B2B SaaS platform that lets service businesses manage appointments, customers, and AI-powered conversations from a single dashboard. The product targets professional service businesses (salons, clinics, consultancies) and their reseller agencies.

Design standard: **Stripe / Linear / Notion quality.** Information-dense, minimal, fast to scan. Not a generic admin dashboard.

---

## Current Stage

**Phase 3.5 (Security Hardening) — Complete as of 2026-06-23.**

The codebase is clean, lint-free, and production-ready for all features built to date. No active development phase. Next planned work is Phase 4 (n8n + WhatsApp + public booking page).

See [current-phase.md](current-phase.md) and [master-roadmap.md](../roadmap/master-roadmap.md).

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2.9 |
| Language | TypeScript (strict) | 5 |
| UI | React + TailwindCSS + shadcn/ui | 19 / v4 |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Server state | TanStack React Query | v5 |
| ORM | Prisma with PrismaPg adapter | 7 |
| Database | PostgreSQL via Supabase | — |
| Auth | Supabase SSR (`@supabase/ssr`) | — |
| Charts | Recharts | v3 |
| AI SDKs | `@anthropic-ai/sdk`, `openai`, `@google/generative-ai` | — |

**Next.js 16 note:** This version has breaking changes. The middleware entry point is `src/proxy.ts` (exports `proxy` function), not `middleware.ts`. Read `node_modules/next/dist/docs/` before making framework-level changes.

---

## Architecture Boundary (Critical — Read Before Writing Code)

This dashboard has a strict responsibility boundary. Violating it creates architectural drift that is expensive to undo.

**Dashboard owns:**
- UI rendering and navigation
- CRUD operations on all core models via Server Actions
- Analytics presentation (charts, KPIs, snapshots)
- Workspace configuration (AI settings, team, services, working hours)
- AI Chat Inbox (view conversations, send staff messages, assign, resolve)

**Dashboard does NOT own:**
- Business workflow orchestration → **n8n owns this**
- AI inference at scale / auto-booking triggers → **n8n + AI providers**
- WhatsApp message routing → **Evolution API + n8n**
- Scheduling conflict resolution beyond basic CRUD → **n8n**
- Sending notifications → **n8n reads NotificationJob queue**

See [ADR-001](../adr/ADR-001-dashboard-responsibilities.md) and [ADR-002](../adr/ADR-002-n8n-architecture.md).

---

## Multi-Tenant Model

**URL structure:** `/{tenant-slug}/{section}`

**Three-tier hierarchy:**

```
Platform (us)
  └── Agency Tenant (optional, parentTenantId set)
        └── Business Tenant (standard working unit)
```

Every database query is scoped to `tenantId`. The proxy middleware (`src/proxy.ts`) extracts the slug from the URL and injects it as the `x-tenant-slug` header. All server actions call `requireTenantAccess(tenantId)` to verify the authenticated user is a member before any mutation.

See [ADR-006](../adr/ADR-006-multi-tenant-isolation.md) and [authentication.md](../architecture/authentication.md).

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/                   # /login, /register, /forgot-password
│   ├── (dashboard)/[tenant]/     # All authenticated routes
│   │   ├── dashboard/            # KPI overview
│   │   ├── appointments/         # Calendar & list
│   │   ├── customers/[id]/       # CRM + detail view
│   │   ├── inbox/                # AI chat + conversations
│   │   ├── analytics/            # Charts & reports
│   │   └── settings/             # Profile, team, AI, working hours
│   └── api/auth/callback/        # Supabase OAuth callback
├── components/
│   ├── ui/                       # shadcn/ui primitives (26 components)
│   ├── dashboard/                # KPI widgets, sidebar, topbar
│   ├── appointments/             # Table, slide-over, filters, badges
│   ├── customers/                # Table, detail panels, activity
│   ├── inbox/                    # Thread, message bubbles, input, AI log
│   ├── analytics/                # Charts, heatmap, breakdowns
│   └── settings/                 # Profile, team, AI, hours forms
├── lib/
│   ├── actions/                  # Server Actions (mutations only)
│   │   ├── appointments.ts
│   │   ├── customers.ts
│   │   ├── inbox.ts
│   │   └── settings.ts
│   ├── ai/                       # Multi-provider AI abstraction
│   │   ├── index.ts              # getAIProvider() factory
│   │   ├── types.ts              # AIProvider interface
│   │   ├── pricing.ts            # Cost estimation per provider/model
│   │   └── providers/            # openai, anthropic, gemini, grok
│   ├── supabase/
│   │   ├── server.ts             # Server-side Supabase client
│   │   └── client.ts             # Browser-safe Supabase client
│   ├── prisma.ts                 # Prisma client + soft-delete extension
│   ├── server-auth.ts            # requireAuth(), requireTenantAccess()
│   ├── permissions.ts            # requirePermission(role, permission) + RBAC matrix
│   ├── crypto.ts                 # AES-256-GCM encrypt/decrypt
│   ├── audit.ts                  # logAudit() — fire-and-forget
│   ├── tenant.ts                 # Tenant context helpers
│   ├── entitlements.ts           # Feature flag resolution
│   └── *-queries.ts              # Prisma read helpers (no mutations)
├── validators/                   # Zod schemas (shared across forms + actions)
└── proxy.ts                      # Next.js 16 middleware (auth guard + tenant header)
```

---

## RBAC

5 roles: `OWNER` > `ADMIN` > `MANAGER` > `STAFF` > `VIEWER`

19 permissions defined in `src/lib/permissions.ts`. Key ones:

| Permission | Roles |
|---|---|
| `appointments.manage_all` | OWNER, ADMIN, MANAGER |
| `appointments.manage_own` | + STAFF |
| `customers.edit` | OWNER, ADMIN, MANAGER |
| `inbox.send` | OWNER, ADMIN, MANAGER, STAFF |
| `ai_settings.manage` | OWNER, ADMIN |
| `workspace.delete` | OWNER only |

All server actions call `requirePermission(role, permission)` after verifying tenant membership.

---

## AI Architecture (Dashboard Layer)

The dashboard has a multi-provider abstraction for the **Inbox chat** feature:

```
getAIProvider(settings) → OpenAIProvider | AnthropicProvider | GeminiProvider | GrokProvider
```

Each provider implements `AIProvider` from `src/lib/ai/types.ts`. Provider is selected per tenant via `AISettings.provider`. BYOK keys are decrypted at runtime from `AISettings.byokApiKey` (stored as `iv:authTag:ciphertext`).

**This layer handles only in-dashboard conversations.** Future AI automation (n8n workflows, auto-booking from WhatsApp) runs inside n8n — not through this layer. See [ADR-003](../adr/ADR-003-ai-execution.md).

---

## Security Principles

- Every server action calls `requireTenantAccess()` then `requirePermission(role, permission)`
- BYOK API keys: AES-256-GCM encrypted at rest (`iv:authTag:ciphertext`)
- Sessions validated server-side via `supabase.auth.getUser()` — never `getSession()`
- Security headers in `next.config.ts` (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
- `AuditLog` table is append-only — `logAudit()` is fire-and-forget and never blocks mutations
- All `deletedAt`-capable models use soft delete via Prisma extension (hard deletes never happen)

See [security.md](../architecture/security.md) and [docs/security/phase-3.5-audit.md](../../docs/security/phase-3.5-audit.md).

---

## Coding Conventions

- **Server Actions** live in `src/lib/actions/*.ts`. Always `"use server"`. First two lines are always auth guards.
- **Query functions** live in `src/lib/*-queries.ts`. Prisma reads only — no mutations.
- **Zod schemas** in `src/validators/` — used for form validation and server action input parsing.
- **Component structure:** Page (`page.tsx`) fetches and passes data → `*-client.tsx` owns interactivity → presentational leaf components.
- **Naming:** `camelCase` functions/variables, `PascalCase` components/types, `kebab-case` filenames.
- **No `any`.** TypeScript strict mode is enforced. No `eslint-disable` suppressions.
- **No hard deletes.** Set `deletedAt`, never `prisma.model.delete()`.

See [coding-standards.md](../development/coding-standards.md) and [conventions.md](../development/conventions.md).

---

## Completed Phases Summary

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation (DB, auth, shell) | Complete |
| 2 | Core Features (appointments, customers, inbox, analytics) | Complete |
| 3 | UI & Premium Redesign | Complete |
| 3.5 | Security Hardening | Complete |

---

## Key Documents

| Document | Purpose |
|---|---|
| [system-overview.md](../architecture/system-overview.md) | Full architecture narrative & diagram |
| [responsibilities.md](../architecture/responsibilities.md) | System ownership table |
| [database.md](../architecture/database.md) | All Prisma models, enums, relationships |
| [authentication.md](../architecture/authentication.md) | Supabase SSR auth flow in detail |
| [security.md](../architecture/security.md) | RBAC matrix, encryption, audit log |
| [integrations.md](../architecture/integrations.md) | AI providers, WhatsApp, Evolution API, Calendar |
| [deployment.md](../architecture/deployment.md) | Build, env vars, Supabase setup |
| [master-roadmap.md](../roadmap/master-roadmap.md) | All phases with status & exit criteria |
| [completed-phases.md](../roadmap/completed-phases.md) | Deliverables per completed phase |
| [future-phases.md](../roadmap/future-phases.md) | Phase 4+ plans & dependencies |
| [ADR index](../adr/) | All architectural decisions |
| [coding-standards.md](../development/coding-standards.md) | Code conventions |
| [project-structure.md](../development/project-structure.md) | Folder-by-folder guide |
| [conventions.md](../development/conventions.md) | Patterns: actions, queries, components |
| [troubleshooting.md](../development/troubleshooting.md) | Common errors and fixes |
| [booking-lifecycle.md](../workflows/booking-lifecycle.md) | Appointment state machine |
| [conversation-lifecycle.md](../workflows/conversation-lifecycle.md) | Conversation state machine |
| [project-status.md](project-status.md) | What's done and what's pending |
| [next-steps.md](next-steps.md) | Exactly what to work on next |
| [phase-3.5-audit.md](../../docs/security/phase-3.5-audit.md) | Security audit report (reference) |
