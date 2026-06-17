contin# AI Appointment Booking SaaS — Design Specification

**Date:** 2026-06-17
**Status:** Approved
**Author:** Mohammed Siddique Zain

---

## 1. Overview

A production-ready, multi-tenant AI Appointment Booking SaaS. The platform enables businesses of all sizes — from solo operators to agencies managing multiple client businesses — to automate appointment booking via an AI receptionist that operates across web chat and WhatsApp.

The product must be world-class, premium B2B SaaS quality, comparable to Stripe, Linear, Vercel, Notion, HubSpot, Attio, Ramp, and Calendly. Every UI decision is justified against a real business question.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth |
| ORM | Prisma |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Realtime | Supabase Realtime |

---

## 3. Multi-Tenant Architecture

### Hierarchy (3-tier hybrid)

```
Platform (super-admin)
  ├── Agency Tenant
  │     ├── Sub-business 1
  │     ├── Sub-business 2
  │     └── Sub-business 3
  ├── Direct Business (solo operator)
  └── Direct Business (team)
```

A `Tenant` has an optional `parentTenantId`. If null, it is a root tenant (direct business or agency). If set, it is a sub-business managed by an agency. One self-referential foreign key handles the entire hierarchy.

### Tenant Isolation Strategy

- Every database table carries a `tenantId` column.
- Supabase Row-Level Security (RLS) policies enforce that a database session can only access rows belonging to its resolved tenant — even if application-level checks fail.
- Tenant context is resolved once in `middleware.ts` and injected into request headers. All downstream code reads from headers — no per-handler DB lookups for tenant resolution.

### URL Structure

Tenant context lives in the URL path: `/{tenant-slug}/dashboard`. Subdomain-based routing (`acme.yoursaas.com`) can be layered on via middleware rewriting at a later date with zero route changes.

---

## 4. Architectural Approach

**Single Next.js 15 app with route groups.** No Turborepo for MVP. Route groups (`(auth)`, `(dashboard)`, `(booking)`, `(marketing)`) create logical separation without polluting URLs. One deployment, one CI pipeline.

### Request Lifecycle

```
Browser Request
  → middleware.ts
      1. Read Supabase session cookie
      2. No session → redirect /login
      3. Session → extract tenant slug from URL
      4. Verify user membership in tenant
      5. Inject tenantId into request headers
  → Route Handler / Server Component
      - Reads tenantId from headers
      - All Prisma queries scoped to tenantId
      - Returns data
```

### Auth Bridge

Supabase Auth manages identity. Prisma manages application data. A `users` table stores `supabaseAuthId` as a foreign key, bridging the two systems. A `TenantMember` join table governs which tenants a user can access and at what role.

### Data Fetching Strategy

- **Server Components** fetch critical above-the-fold data (today's stats, upcoming appointments). Zero loading spinners on first paint.
- **Client Components + TanStack Query** handle interactive data (live inbox, chart filters, paginated tables). Background refetching keeps data fresh.
- **Supabase Realtime** broadcasts conversation and appointment events scoped to `tenantId`. Dashboard counters and inbox update without polling.

---

## 5. Folder Structure

```
appointment-saas-dashboard/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│   └── fonts/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   │
│   │   ├── (dashboard)/
│   │   │   └── [tenant]/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── appointments/
│   │   │       ├── customers/
│   │   │       ├── inbox/
│   │   │       ├── analytics/
│   │   │       ├── team/
│   │   │       ├── settings/
│   │   │       │   ├── working-hours/
│   │   │       │   ├── busy-hours/
│   │   │       │   ├── ai/
│   │   │       │   └── profile/
│   │   │       └── (agency)/
│   │   │           └── businesses/
│   │   │
│   │   ├── (booking)/
│   │   │   └── [tenant]/
│   │   │       └── [service]/
│   │   │
│   │   ├── (marketing)/
│   │   │   └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── webhooks/
│   │   │   │   └── whatsapp/
│   │   │   └── ai/
│   │   │       └── chat/
│   │   │
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── dashboard/           # Dashboard-specific components
│   │   │   ├── stat-card.tsx
│   │   │   ├── appointment-row.tsx
│   │   │   └── conversation-item.tsx
│   │   ├── charts/              # Recharts wrappers
│   │   ├── forms/               # RHF + Zod form components
│   │   └── layout/              # Sidebar, topbar, nav
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── prisma.ts
│   │   ├── ai/
│   │   │   ├── index.ts         # Unified AI interface
│   │   │   ├── providers/
│   │   │   │   ├── openai.ts
│   │   │   │   ├── anthropic.ts
│   │   │   │   ├── gemini.ts
│   │   │   │   └── grok.ts
│   │   │   └── types.ts
│   │   ├── tenant.ts
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── use-appointments.ts
│   │   ├── use-customers.ts
│   │   ├── use-conversations.ts
│   │   └── ...
│   │
│   ├── validators/
│   │   ├── appointment.ts
│   │   ├── customer.ts
│   │   ├── team-member.ts
│   │   └── ai-settings.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── middleware.ts
│
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── components.json
└── tsconfig.json
```

---

## 6. Database Schema

### Core Identity & Tenancy

```prisma
model User {
  id             String         @id @default(cuid())
  supabaseAuthId String         @unique
  email          String         @unique
  name           String?
  avatarUrl      String?
  createdAt      DateTime       @default(now())
  memberships    TenantMember[]
}

model Tenant {
  id             String         @id @default(cuid())
  name           String
  slug           String         @unique
  logo           String?
  plan           Plan           @default(STARTER)
  timezone       String         @default("UTC")   // IANA timezone string
  parentTenantId String?
  parent         Tenant?        @relation("AgencyClients", fields: [parentTenantId], references: [id])
  children       Tenant[]       @relation("AgencyClients")
  createdAt      DateTime       @default(now())
  deletedAt      DateTime?
  members        TenantMember[]
  services       Service[]
  appointments   Appointment[]
  customers      Customer[]
  conversations  Conversation[]
  teamMembers    TeamMember[]
  workingHours   WorkingHours[]
  busyPeriods    BusyPeriod[]
  aiSettings     AISettings?
}

model TenantMember {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  @@unique([userId, tenantId])
}

enum Role  { OWNER ADMIN MANAGER STAFF VIEWER }
enum Plan  { STARTER PRO ENTERPRISE }
```

### Services & Scheduling

```prisma
model Service {
  id           String              @id @default(cuid())
  tenantId     String
  name         String
  description  String?
  duration     Int
  bufferTime   Int                 @default(0)
  price        Decimal?
  currency     String              @default("USD")
  isActive     Boolean             @default(true)
  maxPerDay    Int?                // null = unlimited
  maxPerSlot   Int?                // null = 1 (single booking per slot)
  createdAt    DateTime            @default(now())
  deletedAt    DateTime?
  tenant       Tenant              @relation(fields: [tenantId], references: [id])
  appointments Appointment[]
  teamMembers  TeamMemberService[]
}

model WorkingHours {
  id           String      @id @default(cuid())
  tenantId     String
  teamMemberId String?
  dayOfWeek    Int
  startTime    String
  endTime      String
  isOpen       Boolean     @default(true)
  tenant       Tenant      @relation(fields: [tenantId], references: [id])
  teamMember   TeamMember? @relation(fields: [teamMemberId], references: [id])
  // NOTE: @@unique([tenantId, teamMemberId, dayOfWeek]) is intentionally omitted.
  // PostgreSQL allows multiple NULLs in unique constraints, so this would not
  // prevent duplicate business-level rows (where teamMemberId IS NULL).
  // Uniqueness for business-level hours (teamMemberId = null) is enforced at
  // the application layer. A raw migration adds two partial unique indexes:
  //   UNIQUE (tenantId, dayOfWeek) WHERE teamMemberId IS NULL
  //   UNIQUE (tenantId, teamMemberId, dayOfWeek) WHERE teamMemberId IS NOT NULL
}

model BusyPeriod {
  id             String      @id @default(cuid())
  tenantId       String
  teamMemberId   String?
  title          String?
  startAt        DateTime
  endAt          DateTime
  isRecurring    Boolean     @default(false)
  recurrenceRule String?     // RRULE string e.g. "FREQ=WEEKLY;BYDAY=FR" — required when isRecurring = true
  createdAt      DateTime    @default(now())
  tenant         Tenant      @relation(fields: [tenantId], references: [id])
  teamMember     TeamMember? @relation(fields: [teamMemberId], references: [id])
}
```

### Appointments

```prisma
model Appointment {
  id                 String            @id @default(cuid())
  tenantId           String
  customerId         String
  serviceId          String
  teamMemberId       String?
  conversationId     String?
  startAt            DateTime          // stored in UTC
  endAt              DateTime          // stored in UTC
  status             AppointmentStatus @default(PENDING)
  notes              String?
  bookedVia          BookingChannel    @default(AI)
  confirmedAt        DateTime?
  cancelledAt        DateTime?
  cancellationReason String?
  createdAt          DateTime          @default(now())
  deletedAt          DateTime?
  tenant             Tenant            @relation(fields: [tenantId], references: [id])
  customer           Customer          @relation(fields: [customerId], references: [id])
  service            Service           @relation(fields: [serviceId], references: [id])
  teamMember         TeamMember?       @relation(fields: [teamMemberId], references: [id])
  conversation       Conversation?     @relation(fields: [conversationId], references: [id])
}

enum AppointmentStatus { PENDING CONFIRMED CANCELLED COMPLETED NO_SHOW RESCHEDULED }
enum BookingChannel    { AI MANUAL SELF_SERVICE }
```

### Customer CRM

```prisma
model Customer {
  id            String         @id @default(cuid())
  tenantId      String
  name          String
  email         String?
  phone         String?
  avatarUrl     String?
  notes         String?
  tags          String[]
  source        String?
  createdAt     DateTime       @default(now())
  lastSeenAt    DateTime?
  deletedAt     DateTime?
  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  appointments  Appointment[]
  conversations Conversation[]
  @@unique([tenantId, phone])
  @@unique([tenantId, email])
}
```

### AI Chat Inbox

```prisma
model Conversation {
  id               String              @id @default(cuid())
  tenantId         String
  customerId       String?
  channel          ConversationChannel
  externalId       String?
  status           ConversationStatus  @default(OPEN)
  assignedToId     String?
  aiHandled        Boolean             @default(true)
  summary          String?
  tags             String[]
  extractedContext Json?               // { customerName, service, preferredTime }
  memoryVersion    Int                 @default(0)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  deletedAt        DateTime?
  tenant           Tenant              @relation(fields: [tenantId], references: [id])
  customer         Customer?           @relation(fields: [customerId], references: [id])
  assignedTo       TeamMember?         @relation(fields: [assignedToId], references: [id])
  messages         Message[]
  appointments     Appointment[]
  notes            ConversationNote[]
  attachments      Attachment[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String
  tokensUsed     Int?
  provider       String?
  model          String?
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}

enum ConversationChannel { WEB_CHAT WHATSAPP }
enum ConversationStatus  { OPEN RESOLVED ESCALATED ARCHIVED }
enum MessageRole         { USER ASSISTANT SYSTEM }
```

### Team & AI Settings

```prisma
model TeamMember {
  id                    String              @id @default(cuid())
  tenantId              String
  userId                String?
  name                  String
  email                 String
  role                  String?
  avatarUrl             String?
  isActive              Boolean             @default(true)
  maxAppointmentsPerDay Int?
  inviteToken           String?             @unique
  createdAt             DateTime            @default(now())
  deletedAt             DateTime?
  tenant                Tenant              @relation(fields: [tenantId], references: [id])
  services              TeamMemberService[]
  appointments          Appointment[]
  workingHours          WorkingHours[]
  busyPeriods           BusyPeriod[]
  conversations         Conversation[]
  conversationNotes     ConversationNote[]
  calendarIntegrations  CalendarIntegration[]
}

model TeamMemberService {
  teamMemberId String
  serviceId    String
  teamMember   TeamMember @relation(fields: [teamMemberId], references: [id])
  service      Service    @relation(fields: [serviceId], references: [id])
  @@id([teamMemberId, serviceId])
}

model AISettings {
  id               String   @id @default(cuid())
  tenantId         String   @unique
  provider         String   @default("openai")
  model            String   @default("gpt-4o")
  fallbackProvider String?
  fallbackModel    String?
  temperature      Float    @default(0.7)
  systemPrompt     String?
  maxTokens        Int      @default(1000)
  byokApiKey       String?  // AES-256 encrypted at rest — never returned to client
  autoBook         Boolean  @default(true)
  requireConfirm   Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  tenant           Tenant   @relation(fields: [tenantId], references: [id])
}
```

---

## 7. AI Service Layer

### Adapter Pattern

All application code imports from `lib/ai/index.ts` only. Provider files are never imported directly.

```
/api/ai/chat
  → lib/ai/index.ts → getAIProvider(tenant.aiSettings.provider)
      ├── OpenAIProvider
      ├── AnthropicProvider
      ├── GeminiProvider
      └── GrokProvider
```

### Subscription Tiers

| Tier | AI Access |
|---|---|
| Starter | Platform-managed OpenAI (GPT-4o), no API key required |
| Pro | BYOK — connect own OpenAI or Anthropic key |
| Enterprise | Multi-provider, custom models, fallback routing |

### Booking Intent Detection

When the AI identifies a booking intent in the conversation, it triggers the booking flow:
1. Check availability via working hours + busy periods + existing appointments
2. If `autoBook = true`: book instantly, send confirmation
3. If `requireConfirm = true`: create `PENDING` appointment, notify staff

---

## 8. Dashboard Information Architecture

### Navigation

Primary (daily use): Dashboard, Appointments, Customers, Inbox, Analytics
Configuration (infrequent): Working Hours, Busy Hours, Team Members, AI Settings, Profile
Agency only: Businesses

### Page 1 — Dashboard

Answers: What needs attention now? How is today tracking? What's the rest of today?

- **Stat strip (4 KPIs):** Appointments today, Pending confirmations, Open conversations, Booking conversion rate. Each shows current value, delta vs. yesterday, 7-day sparkline.
- **7-day appointment trend:** Bar chart, muted colors.
- **Inbox snapshot:** Top 3 unresolved conversations (customer, last message, time elapsed).
- **Upcoming appointments table:** Next 5 appointments — customer, service, staff, time, status.
- **Today's timeline (right rail):** Hour-by-hour booked vs. open slots.
- **Team availability strip:** Who is in, busy, or offline.

### Page 2 — Appointments

Answers: What is scheduled? What is each booking's status? How was it booked?

- Calendar view (month/week/day) + list view toggle
- Filters: date, status, service, staff, booking channel
- Slide-over panel: full detail, history, confirm/reschedule/cancel/complete actions
- New appointment modal: React Hook Form + Zod

### Page 3 — Customers (CRM)

Answers: Who are my customers? Which need follow-up? What is their history?

- Searchable table: name, phone, email, last appointment, total appointments, tags
- Customer detail panel: contact info, appointment timeline, linked conversations, notes, book shortcut

### Page 4 — AI Chat Inbox

Answers: Which conversations need human attention? What is the AI saying? Did conversations lead to bookings?

- 3-column layout (conversation list / message thread / context panel)
- Status tabs: Open, Escalated, Resolved
- Realtime message updates via Supabase Realtime
- Staff takeover mode: type and send directly
- Context panel: customer card, linked appointment, AI summary, assign to staff, close

### Page 5 — Analytics

Answers: Is the business growing? When are peak times? How is the AI performing?

| Section | Visualization |
|---|---|
| Booking overview | Bar chart (bookings per day/week/month) |
| Revenue tracking | Line chart |
| AI performance | Funnel: conversations → bookings |
| Peak hours | 7×24 heatmap grid |
| Services breakdown | Horizontal bar chart |
| Staff performance | Table with mini-bars |

Global date range picker. CSV export per section.

### Pages 6–10 — Settings

- **Working Hours:** Day-by-day open/closed toggle, time range, per-staff overrides
- **Busy Hours:** Calendar-style block interface, whole-day or partial, optional recurring, business or staff scope
- **Team Members:** Invite flow, assign services, individual working hours, deactivate without deleting
- **AI Settings:** Provider & model, behavior (temperature, auto-book), personality (system prompt, tone), usage chart
- **Profile:** Business name, logo, slug, timezone, currency, danger zone

### Agency Page — Businesses

- Table of sub-businesses: name, plan, appointments this month, last activity, health indicator
- Add business, switch/impersonate workspace

---

## 9. Design System

### Philosophy

Minimal but information-dense. Enterprise-grade. Modern without being flashy. Fast to scan. Every element earns its place.

Reference products: Stripe, Linear, Vercel, Notion, Attio, Ramp, Calendly.

### Typography

**Geist** (Vercel) — purpose-built for interfaces. Monospace variant for data and numbers. Inter fallback.

Scale: 12 / 13 / 14 / 16 / 18 / 24 / 32px. Line height 1.5 for body, 1.2 for headings.

### Color Palette

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--bg` | `#0a0a0a` | `#fafafa` | Page background |
| `--surface` | `#111111` | `#ffffff` | Card / panel background |
| `--border` | `#1f1f1f` | `#e5e5e5` | Dividers, input borders |
| `--text-primary` | `#fafafa` | `#0a0a0a` | Headings, key data |
| `--text-muted` | `#737373` | `#737373` | Labels, secondary text |
| `--accent` | `#2563eb` | `#2563eb` | CTAs, active nav, links |
| `--success` | `#22c55e` | `#16a34a` | Confirmed, active |
| `--warning` | `#f59e0b` | `#d97706` | Pending, needs action |
| `--danger` | `#ef4444` | `#dc2626` | Cancelled, errors |

Single accent color. No gradients on functional UI. Status colors used semantically only.

### Spacing

4px base unit. Common values: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px. Components breathe but never waste space.

### Border Radius

- Cards: `6px`
- Inputs, buttons: `6px`
- Badges, avatars: `9999px` (full)

### Motion

- Panel slides: `150ms ease-out`
- Hover states: `100ms ease`
- No spring animations on data tables
- No decorative entrance animations

### Density

Tables default to compact density (Linear-style). No giant row heights. Data is the hero.

### Accessibility

WCAG AA compliant. Minimum 4.5:1 contrast ratio for body text. Focus rings on all interactive elements. Screen reader labels on icon-only buttons.

---

## 10. Realtime Channels

| Channel | Trigger | Consumer |
|---|---|---|
| `conversations:[tenantId]` | New inbound message | Inbox — live message append |
| `appointments:[tenantId]` | New booking created | Dashboard counter, today's timeline |

Both channels are scoped to `tenantId`. No cross-tenant event leakage.

---

## 11. Key Architectural Decisions Summary

| Decision | Rationale |
|---|---|
| Single Next.js app, route groups | Lowest overhead for MVP. One deployment. Easy to extract later. |
| Tenant slug in URL path | Works locally without wildcard DNS. Subdomains addable via middleware later. |
| Supabase RLS on every table | Database-level isolation. Application bugs cannot leak cross-tenant data. |
| `parentTenantId` self-reference | Handles full 3-tier agency hierarchy with one FK. No separate Agency model. |
| Adapter pattern for AI providers | Business logic never imports a provider directly. Swap providers without touching routes. |
| Server Components for above-fold data | Zero loading spinners on first paint. Critical KPIs render immediately. |
| `TeamMember` separate from `User` | Staff can be invited before they have a platform account. HR data decoupled from auth. |
| `Message` stores `tokensUsed` + `model` | Per-tenant AI usage analytics without a separate logging service. |
| `BookingChannel` enum on `Appointment` | Analytics can answer: how many bookings came from AI vs. manual vs. self-service? |
| No billing in MVP | Clean scope boundary. Stripe Billing is an additive feature, not structural. |

---

## 12. Multi-Tenancy — Extended

### Soft Delete

All user-facing entities carry a `deletedAt DateTime?` field. A `null` value means active; a non-null value means logically deleted. Application queries always filter `deletedAt IS NULL` by default. Hard deletes are never performed by the application — only by an offline data retention job run by the platform operator.

Models that require soft delete: `Tenant`, `Customer`, `Appointment`, `Conversation`, `TeamMember`, `Service`.

Prisma middleware enforces the default filter globally so no individual query needs to remember it:

```typescript
// lib/prisma.ts — soft delete middleware
prisma.$use(async (params, next) => {
  const softDeleteModels = ['Customer','Appointment','Conversation','TeamMember','Service']
  if (softDeleteModels.includes(params.model ?? '')) {
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.action = 'findFirst'
      params.args.where = { ...params.args.where, deletedAt: null }
    }
    if (params.action === 'findMany') {
      params.args ??= {}
      params.args.where = { ...params.args.where, deletedAt: null }
    }
  }
  return next(params)
})
```

### Audit Log

Every write operation that mutates user-owned data is recorded in an `AuditLog` table.

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  tenantId   String
  actorId    String?            // userId — null if system/AI action
  actorType  AuditActorType     // USER | SYSTEM | AI
  action     String             // "appointment.confirmed", "customer.deleted", etc.
  resource   String             // model name: "Appointment"
  resourceId String             // the affected record's id
  changes    Json?              // { before: {...}, after: {...} }
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([tenantId, resource, resourceId])
}

enum AuditActorType { USER SYSTEM AI }
```

Audit writes are fire-and-forget (non-blocking). They must never fail a business transaction. Implementation: write to audit log in a `try/catch` that swallows errors and logs to the platform error tracker.

### Row-Level Security Strategy

Every table that carries `tenantId` gets the following RLS pattern applied in a raw Supabase migration:

```sql
-- Enable RLS
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only see rows for their current tenant
CREATE POLICY "tenant_isolation" ON "Appointment"
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::text
  );
```

The `app.current_tenant_id` session variable is set by the application at the start of each database transaction via a Prisma middleware:

```typescript
// Set tenant context before every query
await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
```

The platform's service-role key (used only for admin operations) bypasses RLS. It is never exposed to the frontend or passed through user-facing API routes.

### Workspace Switching

A `User` can belong to multiple tenants via `TenantMember`. The current active tenant is stored in a `Set-Cookie` (httpOnly, SameSite=Lax) called `active_tenant`. Switching workspaces:

1. User clicks workspace switcher in the sidebar
2. POST `/api/auth/switch-tenant` with `{ tenantId }`
3. Server verifies membership, sets `active_tenant` cookie
4. Redirect to `/{new-tenant-slug}/dashboard`

No re-authentication needed. The Supabase session remains unchanged.

---

## 13. RBAC & Permissions

### Roles

The `Role` enum is expanded from 3 to 5 roles to support real team structures:

```prisma
enum Role {
  OWNER    // Full control. Can delete workspace. One per tenant.
  ADMIN    // Full control except delete workspace. Manages team, billing.
  MANAGER  // Manages appointments, customers, team schedules. Cannot touch AI/billing settings.
  STAFF    // Manages own appointments and schedule only.
  VIEWER   // Read-only access to dashboard and analytics.
}
```

### Permission Matrix

| Feature | OWNER | ADMIN | MANAGER | STAFF | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| View dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| View analytics | ✓ | ✓ | ✓ | ✗ | ✓ |
| Manage appointments (all) | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage own appointments | ✓ | ✓ | ✓ | ✓ | ✗ |
| View customers | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit customers | ✓ | ✓ | ✓ | ✗ | ✗ |
| View inbox | ✓ | ✓ | ✓ | ✓ | ✓ |
| Send messages / takeover | ✓ | ✓ | ✓ | ✓ | ✗ |
| Manage team members | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage working hours | ✓ | ✓ | ✓ | own only | ✗ |
| Manage services | ✓ | ✓ | ✓ | ✗ | ✗ |
| Configure AI settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage integrations | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage webhooks | ✓ | ✓ | ✗ | ✗ | ✗ |
| View billing / usage | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit profile / branding | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete workspace | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage sub-businesses (agency) | ✓ | ✓ | ✗ | ✗ | ✗ |

Permission checks live in `lib/permissions.ts`. Server Components and Route Handlers call `requirePermission(tenantMember, 'appointments.manage')` — a single function that throws a 403 if the role lacks the permission. Never check roles inline in components.

### Feature Flags & Subscription Entitlements

Feature flags are separate from billing. This allows the platform operator to enable beta features per-tenant regardless of plan, and to override entitlements for enterprise deals.

```prisma
model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique    // "ai_byok", "calendar_sync", "webhooks"
  description String
  enabledFor  Plan[]              // plans where this is on by default
  createdAt   DateTime @default(now())
}

model EntitlementOverride {
  id        String   @id @default(cuid())
  tenantId  String
  flagKey   String               // references FeatureFlag.key
  enabled   Boolean
  reason    String?              // "enterprise deal", "beta tester"
  expiresAt DateTime?
  createdAt DateTime @default(now())

  @@unique([tenantId, flagKey])
}
```

Entitlement resolution at runtime:

```typescript
// lib/entitlements.ts
export async function hasFeature(tenantId: string, plan: Plan, flagKey: string): Promise<boolean> {
  // 1. Check EntitlementOverride — highest priority
  const override = await prisma.entitlementOverride.findUnique({
    where: { tenantId_flagKey: { tenantId, flagKey } }
  })
  if (override && (!override.expiresAt || override.expiresAt > new Date())) {
    return override.enabled
  }
  // 2. Fall back to plan-level default from FeatureFlag
  const flag = await prisma.featureFlag.findUnique({ where: { key: flagKey } })
  return flag?.enabledFor.includes(plan) ?? false
}
```

---

## 14. Scheduling Engine

### Timezone Strategy

**Rule: all `DateTime` values are stored in UTC. All display is in the tenant's configured timezone.**

- `Tenant.timezone` stores an IANA timezone string (e.g., `"America/New_York"`).
- `WorkingHours.startTime` / `endTime` store wall-clock strings (`"09:00"`), which are interpreted in the tenant's timezone when computing availability windows.
- Slot availability computation converts everything to UTC before comparison. The AI and booking page always work in UTC internally.
- The frontend uses `Intl.DateTimeFormat` with the tenant timezone for all display. Never store display-local times.

```prisma
// Add to Tenant model
timezone  String  @default("UTC")   // IANA timezone string
```

### Availability Algorithm

When computing available slots for a given service + staff member + date:

```
1. Load WorkingHours for (tenantId, teamMemberId OR business-level, dayOfWeek)
   → Convert startTime/endTime to UTC DateTime for the requested date using tenant timezone
2. Load BusyPeriods overlapping the requested date (including expanded recurring rules via rrule.js)
3. Load existing Appointments for the staff member on that date (status ≠ CANCELLED)
   → Each appointment blocks [startAt, endAt + bufferTime]
4. Subtract busy periods and booked slots from working hours window
5. Divide remaining time into slots of service.duration minutes
6. Return slots as UTC DateTime pairs
```

### Double-Booking Prevention

Optimistic locking is insufficient for concurrent booking. Prevention is enforced at the database level with a **serializable transaction + conflict check**:

```typescript
// lib/scheduling/book.ts
await prisma.$transaction(async (tx) => {
  // 1. Re-check availability inside the transaction
  const conflict = await tx.appointment.findFirst({
    where: {
      tenantId,
      teamMemberId,
      status: { notIn: ['CANCELLED'] },
      OR: [
        { startAt: { lt: endAt }, endAt: { gt: startAt } }  // overlap check
      ]
    }
  })
  if (conflict) throw new BookingConflictError()

  // 2. Create appointment — if another request races here, the conflict check catches it
  return tx.appointment.create({ data: { ... } })
}, { isolationLevel: 'Serializable' })
```

A unique partial index on `(tenantId, teamMemberId, startAt)` where `status NOT IN ('CANCELLED')` provides an additional DB-level guard.

### Appointment Limits

```prisma
// Add to Service model
maxPerDay      Int?    // null = unlimited per day
maxPerSlot     Int?    // concurrent bookings per time slot (e.g. group classes)

// Add to TeamMember model
maxAppointmentsPerDay Int?   // null = unlimited
```

When `maxPerDay` is set, the availability algorithm checks today's confirmed appointment count for that service before returning slots.

### Google Calendar Integration

```prisma
model CalendarIntegration {
  id              String   @id @default(cuid())
  tenantId        String
  teamMemberId    String?              // null = business-level
  provider        CalendarProvider     // GOOGLE | OUTLOOK
  accessToken     String               // AES-256 encrypted
  refreshToken    String               // AES-256 encrypted
  tokenExpiresAt  DateTime
  calendarId      String               // Google/Outlook calendar ID to sync
  syncDirection   SyncDirection        // READ_ONLY | WRITE_ONLY | BIDIRECTIONAL
  lastSyncedAt    DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())

  tenant          Tenant              @relation(fields: [tenantId], references: [id])
  teamMember      TeamMember?         @relation(fields: [teamMemberId], references: [id])
}

enum CalendarProvider { GOOGLE OUTLOOK }
enum SyncDirection    { READ_ONLY WRITE_ONLY BIDIRECTIONAL }
```

**Sync strategy:**
- `READ_ONLY`: External calendar events are pulled as `BusyPeriod` records. The platform's built-in calendar remains the source of truth for bookings.
- `WRITE_ONLY`: New appointments confirmed on the platform are pushed to the external calendar.
- `BIDIRECTIONAL`: Both. Conflicts resolved by timestamp — most recent write wins.

A background job runs every 15 minutes to pull external calendar changes. Webhook subscriptions (Google Push Notifications, Outlook webhooks) are used when available to get near-realtime updates.

### Holidays & Business Closures

Business closures and holidays are modeled as `BusyPeriod` records with `teamMemberId = null` (business-level). Examples:

- Single-day closure: one `BusyPeriod` with `isRecurring = false`
- Annual holiday (e.g., Christmas): `isRecurring = true`, `recurrenceRule = "FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25"`
- Summer vacation: one `BusyPeriod` block spanning the date range

The availability algorithm always checks business-level busy periods before computing staff-level slots.

---

## 15. AI Layer — Extended

### Conversation Memory Strategy

The AI receptionist maintains context within a conversation using a **rolling window + compression** approach:

1. **Rolling window:** The last N messages (default 20) are always sent as full context.
2. **Summary compression:** When a conversation exceeds 20 messages, the oldest messages beyond the window are compressed by the AI into a `summary` string stored on the `Conversation` record. Subsequent requests prepend the summary as a SYSTEM message.
3. **Structured memory:** Key extracted facts (customer name, requested service, preferred time, last appointment) are stored in `Conversation.extractedContext` as JSON, injected as a compact SYSTEM message on every request.

```prisma
// Add to Conversation model
extractedContext Json?    // { customerName, service, preferredTime, notes }
memoryVersion    Int      @default(0)   // incremented each time summary is regenerated
```

### AI Prompt Versioning

System prompts are versioned so changes can be rolled back and A/B tested without touching code.

```prisma
model AIPromptVersion {
  id           String   @id @default(cuid())
  tenantId     String
  version      Int
  systemPrompt String
  changelog    String?
  isActive     Boolean  @default(false)   // only one active per tenant
  activatedAt  DateTime?
  createdAt    DateTime @default(now())
  createdById  String?

  @@unique([tenantId, version])
  @@index([tenantId, isActive])
}
```

When `AISettings.systemPrompt` is null, the platform falls back to the tenant's active `AIPromptVersion`. When neither exists, a platform-level default prompt is used.

### AI Usage Tracking

Every AI call produces a `AIUsageRecord`. This is the source of truth for usage-based billing, analytics, and BYOK cost monitoring.

```prisma
model AIUsageRecord {
  id               String   @id @default(cuid())
  tenantId         String
  conversationId   String?
  messageId        String?
  provider         String   // "openai" | "anthropic" | "gemini" | "grok"
  model            String   // "gpt-4o" | "claude-3-5-sonnet" etc.
  promptTokens     Int
  completionTokens Int
  totalTokens      Int
  estimatedCostUsd Decimal  // calculated at write time using provider pricing table
  isByok           Boolean  @default(false)   // was this a BYOK call?
  createdAt        DateTime @default(now())

  @@index([tenantId, createdAt])
}
```

The `estimatedCostUsd` is computed from a static pricing table in `lib/ai/pricing.ts`. Actual billed cost may differ (Supabase batches API calls); this is an estimate for the usage dashboard.

---

## 16. Conversations — Extended Schema

### Internal Notes

Staff can leave internal notes on a conversation that are never shown to the customer.

```prisma
model ConversationNote {
  id             String       @id @default(cuid())
  conversationId String
  authorId       String       // TeamMember.id
  content        String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  conversation   Conversation @relation(fields: [conversationId], references: [id])
  author         TeamMember   @relation(fields: [authorId], references: [id])
}
```

### Conversation Tags

```prisma
// Add to Conversation model
tags  String[]   // e.g. ["urgent", "VIP", "billing-issue"]
```

Tags on `Conversation` are separate from tags on `Customer`. Conversation tags describe the nature of the interaction; customer tags describe the person.

### Attachments

Customers and staff can send file attachments in conversations. Files are stored in Supabase Storage, never in the database. The `Attachment` model stores a reference.

```prisma
model Attachment {
  id             String         @id @default(cuid())
  tenantId       String
  messageId      String?
  conversationId String?
  uploadedById   String?        // TeamMember.id if staff, null if customer
  storageKey     String         // Supabase Storage object path
  fileName       String
  mimeType       String
  sizeBytes      Int
  createdAt      DateTime       @default(now())

  message        Message?       @relation(fields: [messageId], references: [id])
  conversation   Conversation?  @relation(fields: [conversationId], references: [id])
}
```

**File upload security:**
- Uploads go through a server-side Route Handler (`/api/upload`), never directly to Supabase Storage from the browser with service-role credentials.
- The handler validates: file size (max 10 MB), MIME type allowlist (`image/*`, `application/pdf`, `text/plain`), and virus scanning flag (Supabase Storage can be configured with a ClamAV integration).
- Supabase Storage bucket policy: private by default. Files are served via signed URLs with a 1-hour TTL, generated on demand by the server.

---

## 17. Analytics Architecture

### Event-Driven Model

Analytics are built on an append-only `AnalyticsEvent` table. Application code emits events on key actions. Reports are computed from events, not recalculated from live transactional tables.

```prisma
model AnalyticsEvent {
  id         String   @id @default(cuid())
  tenantId   String
  event      String   // "appointment.booked", "conversation.started", "appointment.no_show"
  properties Json     // event-specific payload
  occurredAt DateTime @default(now())

  @@index([tenantId, event, occurredAt])
}
```

**Canonical event taxonomy:**

| Event | Properties |
|---|---|
| `appointment.booked` | `{ appointmentId, serviceId, teamMemberId, bookedVia, customerId }` |
| `appointment.confirmed` | `{ appointmentId }` |
| `appointment.cancelled` | `{ appointmentId, reason }` |
| `appointment.completed` | `{ appointmentId }` |
| `appointment.no_show` | `{ appointmentId }` |
| `conversation.started` | `{ conversationId, channel }` |
| `conversation.escalated` | `{ conversationId, assignedToId }` |
| `conversation.resolved` | `{ conversationId, aiHandled }` |
| `ai.message_sent` | `{ conversationId, provider, model, tokens, costUsd }` |
| `customer.created` | `{ customerId, source }` |
| `booking_page.viewed` | `{ serviceId, source }` |

### Daily Snapshots

To avoid expensive full-table aggregations on large datasets, a background job runs nightly and materializes key metrics into a `DailySnapshot` table.

```prisma
model DailySnapshot {
  id                     String   @id @default(cuid())
  tenantId               String
  date                   DateTime // UTC midnight of the snapshot day
  appointmentsBooked     Int
  appointmentsConfirmed  Int
  appointmentsCancelled  Int
  appointmentsCompleted  Int
  appointmentsNoShow     Int
  conversationsStarted   Int
  conversationsResolved  Int
  conversationsEscalated Int
  aiMessagesCount        Int
  aiTokensUsed           Int
  aiEstimatedCostUsd     Decimal
  bookingConversionRate  Decimal  // conversations / bookings
  newCustomersCount      Int
  revenueUsd             Decimal

  @@unique([tenantId, date])
  @@index([tenantId, date])
}
```

Analytics dashboard queries `DailySnapshot` for date-range aggregations. Raw `AnalyticsEvent` is queried only for drill-down detail views and CSV export.

### KPI Definitions

| KPI | Definition | Source |
|---|---|---|
| Appointments today | COUNT appointments WHERE date = today AND status ≠ CANCELLED | DailySnapshot |
| Pending confirmations | COUNT appointments WHERE status = PENDING | Live query |
| Open conversations | COUNT conversations WHERE status = OPEN | Live query |
| Booking conversion rate | bookings ÷ conversations × 100 | DailySnapshot |
| No-show rate | no_shows ÷ confirmed × 100 | DailySnapshot |
| Avg. response time | AVG(first assistant message.createdAt - conversation.createdAt) | AnalyticsEvent |
| AI handoff rate | escalated ÷ total conversations × 100 | DailySnapshot |
| Revenue | SUM(appointment.service.price) WHERE status = COMPLETED | DailySnapshot |

### Export Architecture

Every analytics table and data grid exposes a `/export` endpoint that streams CSV. Implementation uses Node.js streams to avoid loading full datasets into memory:

```typescript
// Route: GET /api/[tenant]/analytics/appointments/export
// Streams Prisma cursor query → CSV rows → Response
```

---

## 18. Notifications & Background Jobs

### Notification Model

```prisma
model NotificationJob {
  id           String             @id @default(cuid())
  tenantId     String
  type         NotificationType
  channel      NotificationChannel
  recipient    String             // email address, phone number, or WhatsApp number
  payload      Json               // template variables: { customerName, appointmentTime, ... }
  status       JobStatus          @default(PENDING)
  scheduledFor DateTime           // when to send
  attempts     Int                @default(0)
  lastAttemptAt DateTime?
  failureReason String?
  sentAt       DateTime?
  createdAt    DateTime           @default(now())

  @@index([status, scheduledFor])
  @@index([tenantId, type])
}

enum NotificationType {
  APPOINTMENT_CONFIRMATION
  APPOINTMENT_REMINDER_24H
  APPOINTMENT_REMINDER_1H
  APPOINTMENT_CANCELLED
  APPOINTMENT_RESCHEDULED
  FOLLOW_UP
  STAFF_NEW_BOOKING
  STAFF_CANCELLATION
}

enum NotificationChannel { EMAIL WHATSAPP SMS IN_APP }
enum JobStatus { PENDING PROCESSING SENT FAILED CANCELLED }
```

### Provider Abstraction

Notification providers follow the same adapter pattern as AI providers. All code calls `lib/notifications/index.ts → sendNotification(job)`, which dispatches to the correct provider:

```
lib/notifications/
  ├── index.ts           # sendNotification(job: NotificationJob): Promise<void>
  ├── providers/
  │   ├── email/
  │   │   ├── resend.ts  # default email provider
  │   │   └── sendgrid.ts
  │   ├── whatsapp/
  │   │   └── twilio.ts  # WhatsApp Business API via Twilio
  │   └── sms/
  │       └── twilio.ts
  └── templates/         # Handlebars templates per NotificationType
```

### Retry Strategy

The background job runner (implemented using `pg-boss` or a simple Supabase Edge Function cron) processes `NotificationJob` records:

1. Fetch `PENDING` jobs where `scheduledFor <= now()`, lock row with `SELECT FOR UPDATE SKIP LOCKED`
2. Set status to `PROCESSING`
3. Call provider
4. On success: set `status = SENT`, record `sentAt`
5. On failure: increment `attempts`, set `status = FAILED` if `attempts >= 3`, otherwise reset to `PENDING` with `scheduledFor = now() + exponential_backoff(attempts)`

Exponential backoff: 5 min → 30 min → 2 hours. After 3 failures, alert the platform error tracker and leave `status = FAILED`.

---

## 19. Security

### Secret Encryption

All secrets stored in the database (BYOK API keys, OAuth tokens) are encrypted using AES-256-GCM before write and decrypted after read. The encryption key is stored as an environment variable (`ENCRYPTION_KEY`), never in the database.

```typescript
// lib/crypto.ts
export function encrypt(plaintext: string): string  // returns base64(iv + ciphertext + tag)
export function decrypt(ciphertext: string): string
```

Prisma middleware intercepts writes/reads to `AISettings.byokApiKey` and `CalendarIntegration.accessToken` / `refreshToken` automatically.

### Secret Rotation Strategy

1. A new `ENCRYPTION_KEY_v2` environment variable is added.
2. A migration script reads all encrypted secrets, decrypts with `v1`, re-encrypts with `v2`, writes back.
3. `ENCRYPTION_KEY` is swapped for `v2` and `v1` is removed.
4. The script runs in a maintenance window. It processes records in batches of 100 with a small sleep between batches to avoid locking.

### Rate Limiting

Rate limiting is applied at the middleware layer using a Redis-backed sliding window counter (Upstash Redis on Vercel Edge):

| Endpoint | Limit |
|---|---|
| `POST /api/ai/chat` | 60 requests / minute per tenant |
| `POST /api/auth/*` | 10 requests / minute per IP |
| `POST /api/webhooks/whatsapp` | 200 requests / minute (Twilio sends batches) |
| All other API routes | 200 requests / minute per tenant |

On limit breach: return `429 Too Many Requests` with `Retry-After` header.

### Input Validation

All API route handlers validate input with Zod before touching the database. The same Zod schema is used client-side (React Hook Form) and server-side. No raw `req.body` is ever passed to Prisma.

### Audit Log Coverage

All writes to the following models generate an `AuditLog` entry: `Appointment`, `Customer`, `TeamMember`, `AISettings`, `WorkingHours`, `BusyPeriod`, `TenantMember`, `Tenant` (profile changes).

### Content Security Policy

Next.js `next.config.ts` sets strict CSP headers. No inline scripts. `script-src 'self'`. Supabase and AI provider domains are explicitly allowlisted.

---

## 20. Extensibility

### Webhook Framework

```prisma
model Webhook {
  id          String           @id @default(cuid())
  tenantId    String
  url         String
  secret      String           // HMAC-SHA256 signing secret, shown once to user
  events      String[]         // ["appointment.booked", "conversation.escalated"]
  isActive    Boolean          @default(true)
  createdAt   DateTime         @default(now())

  deliveries  WebhookDelivery[]
}

model WebhookDelivery {
  id           String          @id @default(cuid())
  webhookId    String
  event        String
  payload      Json
  statusCode   Int?
  responseBody String?
  duration     Int?            // ms
  attempts     Int             @default(0)
  status       JobStatus       @default(PENDING)
  createdAt    DateTime        @default(now())

  webhook      Webhook         @relation(fields: [webhookId], references: [id])
}
```

Webhooks are fired as background jobs (same `NotificationJob` retry pattern). Each delivery is signed with `HMAC-SHA256(secret, JSON.stringify(payload))` and the signature is sent in `X-Signature-256` header so receivers can verify authenticity.

### Public API Readiness

The API is designed for versioning from day one:

- All external-facing routes live under `/api/v1/`
- Internal (dashboard) routes live under `/api/` without a version prefix
- Route handlers return consistent response shapes:
  ```typescript
  { data: T, meta?: { page, total } }           // success
  { error: { code: string, message: string } }  // failure
  ```
- API keys for public API access (future): `ApiKey` model with hashed key, scope, and rate limit tier. Never store the raw key — only `SHA256(key)`.

### Integration Layer

```
lib/integrations/
  ├── index.ts              # registry of available integrations
  ├── google-calendar/
  │   ├── auth.ts           # OAuth2 flow
  │   ├── sync.ts           # pull/push logic
  │   └── webhooks.ts       # Google push notification handler
  ├── outlook/
  │   └── ...
  └── types.ts              # Integration interface
```

Each integration implements a common `Integration` interface:
```typescript
interface Integration {
  connect(tenantId: string, code: string): Promise<void>
  disconnect(tenantId: string): Promise<void>
  sync(tenantId: string): Promise<SyncResult>
}
```

---

## 21. Billing Readiness

### Usage Tracking (MVP)

Billing is not implemented in MVP, but **usage is tracked from day one** so it can be wired to Stripe Billing later without a migration.

```prisma
model UsageRecord {
  id         String      @id @default(cuid())
  tenantId   String
  metric     UsageMetric
  quantity   Int
  recordedAt DateTime    @default(now())
  periodStart DateTime
  periodEnd   DateTime

  @@index([tenantId, metric, periodStart])
}

enum UsageMetric {
  AI_MESSAGES      // count of AI messages sent
  AI_TOKENS        // total tokens consumed
  APPOINTMENTS     // total appointments booked
  TEAM_MEMBERS     // active team member seats
  CONVERSATIONS    // total conversations started
}
```

A nightly job aggregates `AnalyticsEvent` and `AIUsageRecord` into `UsageRecord` per billing period. When Stripe is introduced, `UsageRecord` maps directly to Stripe Usage-Based Billing line items.

### Subscription Model

The `Plan` enum is the subscription tier. Plan-gated features use `hasFeature()` from the entitlements system, not inline `tenant.plan` checks. This means:

- Adding a new plan never requires searching for `if plan === 'PRO'` strings in application code
- Plan changes take effect immediately via the `EntitlementOverride` system without redeployment

---

## 22. Frontend Architecture

### Component Hierarchy

```
app/(dashboard)/[tenant]/page.tsx        ← Server Component (data fetch)
  └── DashboardShell                     ← Client boundary
        ├── StatStrip                    ← reads from props (server-fetched)
        │     └── StatCard × 4
        ├── AppointmentTrendChart        ← TanStack Query (client)
        ├── InboxSnapshot                ← TanStack Query (client)
        ├── UpcomingAppointmentsTable    ← TanStack Query (client)
        └── TodayTimeline               ← TanStack Query + Supabase Realtime
```

All shared primitives (`Button`, `Badge`, `Table`, `Dialog`, `Sheet`) come from shadcn/ui and are never modified directly — they are composed in `components/dashboard/` and `components/forms/`.

### Loading, Empty, and Error States

Every data-fetching component handles three states explicitly. No component renders `undefined` or throws during loading.

| State | Pattern |
|---|---|
| **Loading** | Skeleton components that match the shape of the loaded content. No full-page spinners except for initial auth. |
| **Empty** | Purposeful empty states with a headline, one-sentence description, and a single CTA ("Book your first appointment"). Never just a blank area. |
| **Error** | Inline error with a retry button. Full-page error boundaries catch unhandled throws and show a recovery path. |

Skeleton components are built as variants of the real components using `data-loading` attribute + Tailwind `animate-pulse`.

### Responsive Breakpoints

| Breakpoint | Width | Layout change |
|---|---|---|
| `sm` | 640px | Mobile: sidebar becomes bottom nav |
| `md` | 768px | Tablet: sidebar becomes icon-only rail |
| `lg` | 1024px | Desktop: full sidebar with labels |
| `xl` | 1280px | Wide: right-rail panels appear |
| `2xl` | 1536px | Ultra-wide: content max-width capped at 1400px |

The dashboard shell uses CSS Grid with named areas. Sidebar, main content, and right rail are grid areas that collapse gracefully at each breakpoint.

### Dark / Light Mode

Implemented via `next-themes`. The `class` strategy is used (`dark` class on `<html>`). Design tokens in `globals.css` use CSS custom properties that switch based on the class:

```css
:root        { --bg: #fafafa; --surface: #ffffff; ... }
.dark        { --bg: #0a0a0a; --surface: #111111; ... }
```

No Tailwind `dark:` utility classes in component JSX — all theming is done through CSS variables consumed by Tailwind via `@theme` in v4. This keeps components clean and makes the design tokens the single source of truth.

### Accessibility

- WCAG AA minimum contrast (4.5:1 for body, 3:1 for large text)
- All interactive elements reachable by keyboard with visible focus ring
- `aria-label` on all icon-only buttons
- Dialogs trap focus and return focus on close
- Tables use `<caption>` and `scope` attributes
- Form inputs always paired with `<label>` — never `placeholder` as a label substitute
- Color is never the sole indicator of status — badges always include text

---

## 23. Updated Key Decisions

| Decision | Rationale |
|---|---|
| Soft delete on all entities | Preserves referential integrity and appointment history. Hard deletes only via operator tooling. |
| AuditLog as fire-and-forget | Audit writes must never block or fail a business transaction. |
| 5-role RBAC with permission matrix | Supports real team structures from day one without code changes as roles evolve. |
| Entitlements independent of billing | Plan changes and enterprise overrides never require code changes or redeploys. |
| All DateTimes stored in UTC | Eliminates an entire class of timezone bugs. Tenant timezone only used for display. |
| Serializable transaction for booking | Database-enforced double-booking prevention, not application-level optimistic locking. |
| DailySnapshot for analytics | Prevents full-table scans on large event tables. Dashboards are always fast. |
| Event taxonomy documented upfront | Analytics are only as good as the events feeding them. Defining events before coding prevents gaps. |
| Notification jobs with retry | Reminders are business-critical. A failed first attempt must not mean a missed reminder. |
| Usage records from day one | Billing can be added without a data migration. Every metric that matters commercially is already tracked. |
| Webhook HMAC signing | Receivers can verify authenticity without trusting the network. |
| Versioned public API from day one | Prevents breaking changes from affecting integrations when the API evolves. |
