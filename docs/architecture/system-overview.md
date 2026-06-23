# System Overview

## Summary

This is a multi-tenant AI appointment SaaS dashboard. It is the **operator-facing control plane** — businesses use it to manage their appointments, customers, team, and AI chat inbox. It is not the customer-facing booking surface (that is a future Phase 4 deliverable).

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CUSTOMER / END USER                       │
│          (WhatsApp, Web Chat, future: public booking page)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Evolution  │
                    │    API      │  ← WhatsApp gateway (Phase 4)
                    └──────┬──────┘
                           │ webhook
                    ┌──────▼──────┐
                    │     n8n     │  ← Workflow orchestrator (Phase 4)
                    │ (automation)│    Owns: AI execution, scheduling
                    └──────┬──────┘    logic, notification dispatch
                           │ webhook / DB writes
          ┌────────────────▼────────────────────────┐
          │           SUPABASE (PostgreSQL)          │
          │         Single source of truth           │
          └────────────────┬────────────────────────┘
                           │ Prisma ORM (PrismaPg adapter)
          ┌────────────────▼────────────────────────┐
          │      DASHBOARD (this repository)         │
          │  Next.js 16 App Router, TypeScript       │
          │                                          │
          │  • UI rendering (React 19 + Tailwind)    │
          │  • CRUD via Server Actions               │
          │  • Analytics presentation                │
          │  • AI Chat Inbox (in-browser)            │
          │  • Workspace configuration               │
          └────────────────┬────────────────────────┘
                           │ (future) webhook calls
          ┌────────────────▼────────────────────────┐
          │         AI PROVIDERS (Phase 4+)          │
          │  OpenAI / Anthropic / Gemini / Grok      │
          │  (currently: in-dashboard inbox only)    │
          └─────────────────────────────────────────┘

          ┌─────────────────────────────────────────┐
          │           SUPABASE AUTH                  │
          │  OAuth2, email/password, SSR sessions    │
          └─────────────────────────────────────────┘
```

---

## System Responsibilities At a Glance

| System | Owns | Does NOT own |
|---|---|---|
| **Dashboard** | UI, CRUD, config, analytics display, in-browser AI chat | Workflow logic, automation, WhatsApp routing |
| **Supabase** | Auth, PostgreSQL storage, realtime subscriptions | Business logic |
| **Prisma** | ORM layer, migrations, soft-delete enforcement | Auth, business rules |
| **n8n** (Phase 4) | Appointment automation, AI-driven booking, notification dispatch | Data persistence, UI |
| **Evolution API** (Phase 4) | WhatsApp message ingress/egress | Business logic |
| **AI Providers** | Inference (text generation) | Data storage, orchestration |

See [responsibilities.md](responsibilities.md) for the full ownership breakdown.

---

## Request Flow — Dashboard

```
Browser
  │
  ▼ HTTPS request
src/proxy.ts (Next.js 16 middleware)
  │  • Validates Supabase session via getUser()
  │  • Extracts tenant slug from URL → injects x-tenant-slug header
  │  • Redirects unauthenticated users to /login
  ▼
Next.js App Router (page.tsx / layout.tsx)
  │  • requireAuth() — verifies user identity
  │  • requireTenantAccess(tenantId) — verifies membership
  │  • Renders Server Component tree
  ▼
Server Action (lib/actions/*.ts) [on mutations]
  │  • requireTenantAccess()
  │  • requirePermission(role, permission)
  │  • Prisma query
  │  • logAudit() — fire-and-forget
  ▼
Prisma (lib/prisma.ts)
  │  • Soft-delete extension auto-filters deletedAt
  │  • setTenantContext() injects RLS variable
  ▼
Supabase PostgreSQL
```

---

## Request Flow — Future n8n Integration

```
Evolution API (WhatsApp)
  │ webhook
  ▼
n8n workflow
  │  • AI inference (Gemini or other)
  │  • Scheduling logic
  │  • Writes to Supabase directly (or via dashboard webhook endpoint)
  │  • Creates NotificationJob records
  ▼
Supabase PostgreSQL
  │
  ▼ (dashboard reads on next page load / realtime subscription)
Dashboard UI
```

---

## Key Design Decisions

1. **Supabase is the single source of truth.** All data lives in PostgreSQL. The dashboard and n8n both read/write the same database.
2. **Dashboard is a UI layer, not an orchestration layer.** It accepts user input and persists it. n8n handles the "what happens next" logic.
3. **Multi-tenancy is enforced at the ORM layer.** Every query includes `tenantId`. The proxy injects the slug; server actions resolve it to an ID and verify membership.
4. **Soft deletes everywhere.** The Prisma extension automatically filters `deletedAt: null` on all reads, and mutations set `deletedAt` instead of calling `.delete()`.
5. **AI keys never leave the server unencrypted.** BYOK keys are AES-256-GCM encrypted in the database and decrypted only at runtime within the server action.

---

## Environment Topology

- **Development:** `npm run dev` — Next.js dev server on port 3000, Supabase hosted (or local via Supabase CLI)
- **Production:** Vercel (or equivalent Node.js host), same Supabase project

See [deployment.md](deployment.md) for environment variables and setup.
