# Master Roadmap

---

## Phase Overview

| Phase | Name | Status | Key Deliverable |
|---|---|---|---|
| 1 | Foundation | Complete | Auth, DB schema, multi-tenant shell |
| 2 | Core Features | Complete | Appointments, customers, inbox, analytics |
| 3 | UI & Premium Redesign | Complete | Production-quality UI (Stripe/Linear standard) |
| 3.5 | Security Hardening | Complete | RBAC enforcement, encryption, audit log |
| 4 | n8n + WhatsApp + Public Booking | Not Started | Automation, WhatsApp, self-service booking |
| 5 | Billing & Scaling | Future | Stripe, multi-seat pricing, performance |

---

## Phase 1 — Foundation

**Status:** Complete
**Objective:** Establish the technical foundation. Nothing customer-facing yet.

**Deliverables:**
- PostgreSQL schema via Prisma (all core models)
- Supabase Auth integration (email/password, OAuth callback)
- Next.js 16 App Router setup with TypeScript strict mode
- Multi-tenant routing (`/[tenant]/...`)
- `src/proxy.ts` middleware (auth guard + tenant slug injection)
- `requireAuth()` and `requireTenantAccess()` guards
- Dashboard shell (sidebar, topbar, layout)
- Environment setup, Prisma migrations

**Exit Criteria:** A user can register, log in, and see an empty dashboard shell scoped to their tenant.

---

## Phase 2 — Core Features

**Status:** Complete
**Objective:** Build all primary features to functional completeness.

**Deliverables:**
- Appointment management (create, view, update status, cancel)
- Customer CRM (directory, detail view with history, soft delete)
- AI Chat Inbox (conversations, messages, staff takeover, assignment)
- Analytics page (booking trends, revenue, AI performance, heatmap, staff KPIs)
- Settings: workspace profile, team members, AI provider config, working hours
- Server Actions for all mutations
- TanStack Query integration for client-side data
- Zod validation schemas

**Exit Criteria:** All major product features work end-to-end with real data.

---

## Phase 3 — UI & Premium Redesign

**Status:** Complete
**Objective:** Elevate the visual quality to production-grade, premium B2B SaaS standard.

**Deliverables:**
- Full redesign of dashboard components (stat cards, sidebar, topbar)
- shadcn/ui component library integration
- TailwindCSS v4 with custom design tokens
- Dark/light mode support
- Information-dense layouts (Stripe/Linear reference quality)
- Responsive design (sm/md/lg/xl/2xl breakpoints)
- Recharts v3 integration for analytics

**Exit Criteria:** The UI is visually consistent, premium, and matches the design spec at docs/superpowers/specs/2026-06-20-premium-redesign-design.md.

---

## Phase 3.5 — Security Hardening

**Status:** Complete (2026-06-23)
**Objective:** Close all critical and high-severity security gaps before Phase 4 integrations.

**Deliverables:**
- `requireTenantAccess()` + `requirePermission()` on all 16 server actions
- AES-256-GCM encryption for BYOK API keys (`src/lib/crypto.ts`)
- `AuditLog` model + `logAudit()` instrumented on 7 sensitive actions
- Security headers in `next.config.ts` (HSTS, X-Frame-Options, etc.)
- `src/proxy.ts` properly wired as Next.js 16 middleware entry
- Lint errors resolved (clean build)

**Exit Criteria:** All critical and high-severity findings from the Phase 3.5 security audit resolved. See [docs/security/phase-3.5-audit.md](../../docs/security/phase-3.5-audit.md).

---

## Phase 4 — n8n + WhatsApp + Public Booking

**Status:** Not Started
**Objective:** Activate automation, WhatsApp channel, and self-service booking for customers.

**Planned Deliverables:**
- n8n workflow orchestrator setup
- Evolution API integration (WhatsApp message ingress/egress)
- AI-driven auto-booking from WhatsApp via n8n
- NotificationJob delivery (email first, then WhatsApp + SMS)
- Public self-service booking page (`/book/[tenant]`)
- Webhook receiver in dashboard (signed, HMAC-verified)
- Supabase RLS policies
- Calendar sync (Google Calendar + Outlook)
- Rate limiting on auth endpoints

**Dependencies:**
- Phase 3.5 must be complete (security baseline required before exposing webhooks)
- n8n instance provisioned
- Evolution API instance provisioned

**Exit Criteria:** A customer can book an appointment via WhatsApp or the public booking page without any staff involvement. Staff receive a notification.

---

## Phase 5 — Billing & Scaling (Future)

**Status:** Future
**Objective:** Monetize the platform and prepare for multi-tenant scale.

**Planned Deliverables:**
- Stripe integration (subscription plans: STARTER / PRO / ENTERPRISE)
- Plan-based feature gating (via existing `FeatureFlag` + `EntitlementOverride` models)
- Multi-seat pricing
- Usage-based billing for AI tokens (using `AIUsageRecord`)
- Performance optimization (query caching, connection pooling tuning)
- Structured logging (Pino + Axiom/Datadog)
- Upstash rate limiting

**Dependencies:** Phase 4 complete, real tenants on platform.

---

## Phase Dependencies

```
Phase 1 (Foundation)
    └── Phase 2 (Core Features)
            └── Phase 3 (UI Redesign)
                    └── Phase 3.5 (Security)
                            └── Phase 4 (n8n + WhatsApp)
                                    └── Phase 5 (Billing)
```
