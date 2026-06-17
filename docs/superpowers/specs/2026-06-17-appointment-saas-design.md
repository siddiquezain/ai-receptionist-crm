# AI Appointment Booking SaaS — Design Specification

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
  parentTenantId String?
  parent         Tenant?        @relation("AgencyClients", fields: [parentTenantId], references: [id])
  children       Tenant[]       @relation("AgencyClients")
  createdAt      DateTime       @default(now())
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

enum Role  { OWNER ADMIN MEMBER }
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
  createdAt    DateTime            @default(now())
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
  @@unique([tenantId, teamMemberId, dayOfWeek])
}

model BusyPeriod {
  id           String      @id @default(cuid())
  tenantId     String
  teamMemberId String?
  title        String?
  startAt      DateTime
  endAt        DateTime
  isRecurring  Boolean     @default(false)
  createdAt    DateTime    @default(now())
  tenant       Tenant      @relation(fields: [tenantId], references: [id])
  teamMember   TeamMember? @relation(fields: [teamMemberId], references: [id])
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
  startAt            DateTime
  endAt              DateTime
  status             AppointmentStatus @default(PENDING)
  notes              String?
  bookedVia          BookingChannel    @default(AI)
  confirmedAt        DateTime?
  cancelledAt        DateTime?
  cancellationReason String?
  createdAt          DateTime          @default(now())
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
  id           String              @id @default(cuid())
  tenantId     String
  customerId   String?
  channel      ConversationChannel
  externalId   String?
  status       ConversationStatus  @default(OPEN)
  assignedToId String?
  aiHandled    Boolean             @default(true)
  summary      String?
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  tenant       Tenant              @relation(fields: [tenantId], references: [id])
  customer     Customer?           @relation(fields: [customerId], references: [id])
  assignedTo   TeamMember?         @relation(fields: [assignedToId], references: [id])
  messages     Message[]
  appointments Appointment[]
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
  id            String              @id @default(cuid())
  tenantId      String
  userId        String?
  name          String
  email         String
  role          String?
  avatarUrl     String?
  isActive      Boolean             @default(true)
  inviteToken   String?             @unique
  createdAt     DateTime            @default(now())
  tenant        Tenant              @relation(fields: [tenantId], references: [id])
  services      TeamMemberService[]
  appointments  Appointment[]
  workingHours  WorkingHours[]
  busyPeriods   BusyPeriod[]
  conversations Conversation[]
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
  byokApiKey       String?
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
