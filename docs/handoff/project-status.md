# Project Status

Last updated: 2026-06-23

---

## What's Complete

### Infrastructure
- [x] Next.js 16 App Router with TypeScript strict mode
- [x] Supabase Auth (email/password, OAuth callback)
- [x] PostgreSQL via Supabase + Prisma 7 (PrismaPg adapter)
- [x] Multi-tenant routing (`/[tenant]/...`)
- [x] `src/proxy.ts` middleware (auth guard + tenant slug injection)
- [x] Prisma soft-delete extension
- [x] Full database schema (20+ models, all enums)

### Authentication & Security
- [x] `requireAuth()` / `requireTenantAccess()` guards
- [x] RBAC — `requirePermission(role, permission)` on all server actions
- [x] 5 roles × 19 permissions matrix (`src/lib/permissions.ts`)
- [x] AES-256-GCM encryption for BYOK API keys (`src/lib/crypto.ts`)
- [x] `logAudit()` instrumented on 7 sensitive actions
- [x] Security headers in `next.config.ts` (HSTS, X-Frame-Options, etc.)
- [x] All 16 server actions have auth guards

### Features
- [x] Dashboard home — KPI stat strip, booking trend chart, upcoming appointments, inbox snapshot
- [x] Appointments — list, filters, detail slide-over, create, confirm, cancel, complete, no-show
- [x] Customer CRM — directory, search/filter, detail view (profile, history, activity), soft delete
- [x] AI Chat Inbox — conversation list, message thread, staff compose, assign, resolve, escalate
- [x] Analytics — booking trends, revenue, AI performance, peak hours heatmap, staff KPIs
- [x] Settings — workspace profile, team members (invite/deactivate), working hours, AI config
- [x] Multi-provider AI abstraction (OpenAI, Anthropic, Gemini, Grok skeleton)
- [x] Feature flags + entitlement overrides

### Design
- [x] Premium B2B SaaS UI (Stripe/Linear quality)
- [x] shadcn/ui component library (26 components)
- [x] TailwindCSS v4 with design tokens
- [x] Dark/light mode
- [x] Responsive design (all breakpoints)
- [x] Recharts v3 analytics visualizations

---

## What's Pending

### Phase 4 (Next Up)
- [ ] n8n workflow orchestrator setup
- [ ] Evolution API integration (WhatsApp)
- [ ] WhatsApp → n8n → AI auto-booking flow
- [ ] NotificationJob delivery (email, WhatsApp, SMS)
- [ ] Public self-service booking page (`/book/[tenant-slug]`)
- [ ] Signed webhook endpoint for n8n → dashboard
- [ ] Supabase RLS policies
- [ ] Calendar sync (Google + Outlook OAuth)
- [ ] Rate limiting on auth endpoints

### Deferred Security Items (from Phase 3.5 audit)
- [ ] Server-side logout (session invalidation)
- [ ] Environment variable validation at startup
- [ ] Structured logging (Pino/Axiom)
- [ ] Calendar OAuth token encryption (model ready, tokens not yet in use)
- [ ] Webhook signature verification

### Future Phases
- [ ] Stripe billing integration
- [ ] Plan-based feature gating enforcement
- [ ] Usage-based AI billing
- [ ] Performance optimization at scale

---

## Known Issues / Technical Debt

- Grok provider (`src/lib/ai/providers/grok.ts`) is a skeleton — not production-ready, do not enable for tenants
- No test suite — see [docs/development/testing.md](../development/testing.md)
- `DailySnapshot` is updated on mutations, not by a background job — will be inefficient at scale
- Client-side logout only (server-side logout deferred)
