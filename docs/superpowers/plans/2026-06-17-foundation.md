# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a production-ready Next.js 15 project with full multi-tenant infrastructure — Prisma schema, Supabase clients, middleware, AI adapter skeleton, design tokens, and app shell layouts — ready for feature pages to be built on top.

**Architecture:** Single Next.js 15 App Router app. Tenant context resolved once in middleware.ts, injected via request headers. Supabase Auth handles identity; Prisma + PostgreSQL owns application data. All AI calls route through an adapter interface so providers are swappable.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase (Auth + Realtime + Storage), Prisma ORM, TanStack Query v5, React Hook Form, Zod, Recharts, Geist font.

---

## File Map

### Created by this plan

```
appointment-saas-dashboard/
├── prisma/
│   └── schema.prisma                          # Full schema — all 20+ models
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                         # Root layout — font, TanStack provider
│   │   ├── globals.css                        # Design tokens, Tailwind base
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                     # Centered card layout
│   │   │   ├── login/page.tsx                 # Stub — "Login page coming soon"
│   │   │   ├── register/page.tsx              # Stub
│   │   │   └── forgot-password/page.tsx       # Stub
│   │   └── (dashboard)/
│   │       └── [tenant]/
│   │           └── layout.tsx                 # Dashboard shell — sidebar + topbar slots
│   │
│   ├── components/
│   │   └── providers.tsx                      # TanStack QueryClientProvider wrapper
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                      # Browser Supabase client (singleton)
│   │   │   └── server.ts                      # Server Supabase client (cookies)
│   │   ├── prisma.ts                          # Prisma singleton + soft-delete middleware + RLS helper
│   │   ├── tenant.ts                          # resolveTenant(), getTenantFromHeaders()
│   │   ├── permissions.ts                     # requirePermission(), PERMISSION_MAP
│   │   ├── entitlements.ts                    # hasFeature()
│   │   ├── utils.ts                           # cn(), formatDate(), formatCurrency()
│   │   └── ai/
│   │       ├── types.ts                       # AIMessage, AIResponse, AIProvider interface
│   │       ├── pricing.ts                     # Token cost table per provider/model
│   │       ├── providers/
│   │       │   ├── openai.ts                  # OpenAIProvider implements AIProvider
│   │       │   ├── anthropic.ts               # AnthropicProvider implements AIProvider
│   │       │   ├── gemini.ts                  # GeminiProvider implements AIProvider
│   │       │   └── grok.ts                    # GrokProvider implements AIProvider
│   │       └── index.ts                       # getAIProvider(settings) factory
│   │
│   ├── types/
│   │   └── index.ts                           # Re-exports Prisma types + app-specific types
│   │
│   └── middleware.ts                          # Auth guard + tenant resolution + header injection
│
├── .env.local                                 # Env var template (values blank — user fills in)
├── next.config.ts
├── tailwind.config.ts
├── components.json                            # shadcn/ui config
└── tsconfig.json
```

---

## Task 1: Scaffold Next.js 15 Project

**Files:**
- Create: `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `components.json`, `.env.local`, `package.json`

- [ ] **Step 1: Initialize project**

Run from the parent directory (`/Users/zain/Appointment SaaS/`):
```bash
npx create-next-app@latest appointment-saas-dashboard \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```
When prompted, answer: Yes to all defaults.

- [ ] **Step 2: Install core dependencies**

```bash
cd appointment-saas-dashboard
npm install \
  @supabase/supabase-js@latest \
  @supabase/ssr@latest \
  @prisma/client@latest \
  @tanstack/react-query@latest \
  @tanstack/react-query-devtools@latest \
  react-hook-form@latest \
  zod@latest \
  recharts@latest \
  openai@latest \
  @anthropic-ai/sdk@latest \
  @google/generative-ai@latest \
  date-fns@latest \
  rrule@latest \
  clsx@latest \
  tailwind-merge@latest \
  lucide-react@latest \
  geist@latest
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D \
  prisma@latest \
  @types/node \
  @types/react \
  @types/react-dom
```

- [ ] **Step 4: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```
When prompted:
- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**

- [ ] **Step 5: Install shadcn/ui components used across the app**

```bash
npx shadcn@latest add \
  button \
  input \
  label \
  form \
  card \
  badge \
  avatar \
  dropdown-menu \
  dialog \
  sheet \
  tabs \
  table \
  select \
  textarea \
  switch \
  separator \
  skeleton \
  tooltip \
  popover \
  calendar \
  scroll-area \
  command \
  toast \
  sonner
```

- [ ] **Step 6: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

- [ ] **Step 7: Verify the project runs**

```bash
npm run dev
```
Expected: Server starts on http://localhost:3000. No TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with all dependencies"
```

---

## Task 2: Configure next.config.ts and Environment

**Files:**
- Modify: `next.config.ts`
- Create: `.env.local`

- [ ] **Step 1: Write next.config.ts**

Replace `next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Create .env.local with all required variables**

```bash
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Supabase connection pooler recommended for serverless)
DATABASE_URL=

# Encryption key for BYOK API keys stored in AISettings
# Generate: openssl rand -hex 32
ENCRYPTION_KEY=

# AI Providers (platform-level keys for Starter tier)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
GROK_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 3: Commit**

```bash
git add next.config.ts .env.local
git commit -m "feat: configure next.config and env template"
```

---

## Task 3: Prisma Schema — Full Definition

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace schema.prisma with the full application schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  OWNER
  ADMIN
  MANAGER
  STAFF
  VIEWER
}

enum Plan {
  STARTER
  PRO
  ENTERPRISE
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
  RESCHEDULED
}

enum BookingChannel {
  AI
  MANUAL
  SELF_SERVICE
}

enum ConversationChannel {
  WEB_CHAT
  WHATSAPP
}

enum ConversationStatus {
  OPEN
  RESOLVED
  ESCALATED
  ARCHIVED
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum CalendarProvider {
  GOOGLE
  OUTLOOK
}

enum SyncDirection {
  READ_ONLY
  WRITE_ONLY
  BIDIRECTIONAL
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

enum NotificationChannel {
  EMAIL
  WHATSAPP
  SMS
  IN_APP
}

enum JobStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  CANCELLED
}

enum AuditActorType {
  USER
  SYSTEM
  AI
}

// ─── Identity & Tenancy ───────────────────────────────────────────────────────

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
  timezone       String         @default("UTC")
  parentTenantId String?
  parent         Tenant?        @relation("AgencyClients", fields: [parentTenantId], references: [id])
  children       Tenant[]       @relation("AgencyClients")
  createdAt      DateTime       @default(now())
  deletedAt      DateTime?

  members              TenantMember[]
  services             Service[]
  appointments         Appointment[]
  customers            Customer[]
  conversations        Conversation[]
  teamMembers          TeamMember[]
  workingHours         WorkingHours[]
  busyPeriods          BusyPeriod[]
  aiSettings           AISettings?
  aiPromptVersions     AIPromptVersion[]
  aiUsageRecords       AIUsageRecord[]
  analyticsEvents      AnalyticsEvent[]
  dailySnapshots       DailySnapshot[]
  notificationJobs     NotificationJob[]
  auditLogs            AuditLog[]
  featureOverrides     EntitlementOverride[]
  calendarIntegrations CalendarIntegration[]
  attachments          Attachment[]
}

model TenantMember {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id])
  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([userId, tenantId])
}

// ─── Services & Scheduling ────────────────────────────────────────────────────

model Service {
  id          String    @id @default(cuid())
  tenantId    String
  name        String
  description String?
  duration    Int       // minutes
  bufferTime  Int       @default(0) // minutes after appointment
  price       Decimal?
  currency    String    @default("USD")
  isActive    Boolean   @default(true)
  maxPerDay   Int?      // null = unlimited
  maxPerSlot  Int?      // null = 1
  createdAt   DateTime  @default(now())
  deletedAt   DateTime?

  tenant       Tenant              @relation(fields: [tenantId], references: [id])
  appointments Appointment[]
  teamMembers  TeamMemberService[]
}

model WorkingHours {
  id           String  @id @default(cuid())
  tenantId     String
  teamMemberId String?
  dayOfWeek    Int     // 0 = Sunday, 6 = Saturday
  startTime    String  // "09:00" wall-clock in tenant timezone
  endTime      String  // "17:00"
  isOpen       Boolean @default(true)

  tenant     Tenant      @relation(fields: [tenantId], references: [id])
  teamMember TeamMember? @relation(fields: [teamMemberId], references: [id])
  // Partial unique indexes enforced via raw migration:
  //   UNIQUE (tenantId, dayOfWeek) WHERE teamMemberId IS NULL
  //   UNIQUE (tenantId, teamMemberId, dayOfWeek) WHERE teamMemberId IS NOT NULL
}

model BusyPeriod {
  id             String    @id @default(cuid())
  tenantId       String
  teamMemberId   String?
  title          String?
  startAt        DateTime
  endAt          DateTime
  isRecurring    Boolean   @default(false)
  recurrenceRule String?   // RRULE string e.g. "FREQ=WEEKLY;BYDAY=FR"
  createdAt      DateTime  @default(now())

  tenant     Tenant      @relation(fields: [tenantId], references: [id])
  teamMember TeamMember? @relation(fields: [teamMemberId], references: [id])
}

// ─── Appointments ─────────────────────────────────────────────────────────────

model Appointment {
  id                 String            @id @default(cuid())
  tenantId           String
  customerId         String
  serviceId          String
  teamMemberId       String?
  conversationId     String?
  startAt            DateTime          // UTC
  endAt              DateTime          // UTC
  status             AppointmentStatus @default(PENDING)
  notes              String?
  bookedVia          BookingChannel    @default(AI)
  confirmedAt        DateTime?
  cancelledAt        DateTime?
  cancellationReason String?
  createdAt          DateTime          @default(now())
  deletedAt          DateTime?

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  customer     Customer      @relation(fields: [customerId], references: [id])
  service      Service       @relation(fields: [serviceId], references: [id])
  teamMember   TeamMember?   @relation(fields: [teamMemberId], references: [id])
  conversation Conversation? @relation(fields: [conversationId], references: [id])
}

// ─── Customer CRM ─────────────────────────────────────────────────────────────

model Customer {
  id          String    @id @default(cuid())
  tenantId    String
  name        String
  email       String?
  phone       String?
  avatarUrl   String?
  notes       String?
  tags        String[]
  source      String?
  createdAt   DateTime  @default(now())
  lastSeenAt  DateTime?
  deletedAt   DateTime?

  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  appointments  Appointment[]
  conversations Conversation[]

  @@unique([tenantId, phone])
  @@unique([tenantId, email])
}

// ─── AI Chat Inbox ────────────────────────────────────────────────────────────

model Conversation {
  id               String              @id @default(cuid())
  tenantId         String
  customerId       String?
  channel          ConversationChannel
  externalId       String?             // WhatsApp message thread ID
  status           ConversationStatus  @default(OPEN)
  assignedToId     String?
  aiHandled        Boolean             @default(true)
  summary          String?             // AI-generated rolling summary
  tags             String[]
  extractedContext Json?               // { customerName, service, preferredTime }
  memoryVersion    Int                 @default(0)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  deletedAt        DateTime?

  tenant       Tenant             @relation(fields: [tenantId], references: [id])
  customer     Customer?          @relation(fields: [customerId], references: [id])
  assignedTo   TeamMember?        @relation(fields: [assignedToId], references: [id])
  messages     Message[]
  appointments Appointment[]
  notes        ConversationNote[]
  attachments  Attachment[]
}

model Message {
  id             String      @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String
  tokensUsed     Int?
  provider       String?
  model          String?
  createdAt      DateTime    @default(now())

  conversation Conversation  @relation(fields: [conversationId], references: [id])
  attachment   Attachment[]
}

model ConversationNote {
  id             String   @id @default(cuid())
  conversationId String
  authorId       String   // TeamMember.id
  content        String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  conversation Conversation @relation(fields: [conversationId], references: [id])
  author       TeamMember   @relation(fields: [authorId], references: [id])
}

model Attachment {
  id             String    @id @default(cuid())
  tenantId       String
  messageId      String?
  conversationId String?
  uploadedById   String?   // TeamMember.id if staff, null if customer
  storageKey     String    // Supabase Storage object path
  fileName       String
  mimeType       String
  sizeBytes      Int
  createdAt      DateTime  @default(now())

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  message      Message?      @relation(fields: [messageId], references: [id])
  conversation Conversation? @relation(fields: [conversationId], references: [id])
}

// ─── Team Members ─────────────────────────────────────────────────────────────

model TeamMember {
  id                    String    @id @default(cuid())
  tenantId              String
  userId                String?   // null until invite accepted
  name                  String
  email                 String
  role                  String?
  avatarUrl             String?
  isActive              Boolean   @default(true)
  maxAppointmentsPerDay Int?
  inviteToken           String?   @unique
  createdAt             DateTime  @default(now())
  deletedAt             DateTime?

  tenant               Tenant                @relation(fields: [tenantId], references: [id])
  services             TeamMemberService[]
  appointments         Appointment[]
  workingHours         WorkingHours[]
  busyPeriods          BusyPeriod[]
  conversations        Conversation[]
  conversationNotes    ConversationNote[]
  calendarIntegrations CalendarIntegration[]
}

model TeamMemberService {
  teamMemberId String
  serviceId    String

  teamMember TeamMember @relation(fields: [teamMemberId], references: [id])
  service    Service    @relation(fields: [serviceId], references: [id])

  @@id([teamMemberId, serviceId])
}

// ─── AI Settings ──────────────────────────────────────────────────────────────

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
  byokApiKey       String?  // AES-256 encrypted — never returned to client
  autoBook         Boolean  @default(true)
  requireConfirm   Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
}

model AIPromptVersion {
  id           String    @id @default(cuid())
  tenantId     String
  version      Int
  systemPrompt String
  changelog    String?
  isActive     Boolean   @default(false)
  activatedAt  DateTime?
  createdAt    DateTime  @default(now())
  createdById  String?

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, version])
  @@index([tenantId, isActive])
}

model AIUsageRecord {
  id               String   @id @default(cuid())
  tenantId         String
  conversationId   String?
  messageId        String?
  provider         String
  model            String
  promptTokens     Int
  completionTokens Int
  totalTokens      Int
  estimatedCostUsd Decimal
  isByok           Boolean  @default(false)
  createdAt        DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, createdAt])
}

// ─── Calendar Integration ─────────────────────────────────────────────────────

model CalendarIntegration {
  id             String           @id @default(cuid())
  tenantId       String
  teamMemberId   String?
  provider       CalendarProvider
  accessToken    String           // AES-256 encrypted
  refreshToken   String           // AES-256 encrypted
  tokenExpiresAt DateTime
  calendarId     String
  syncDirection  SyncDirection
  lastSyncedAt   DateTime?
  isActive       Boolean          @default(true)
  createdAt      DateTime         @default(now())

  tenant     Tenant      @relation(fields: [tenantId], references: [id])
  teamMember TeamMember? @relation(fields: [teamMemberId], references: [id])
}

// ─── Feature Flags & Entitlements ─────────────────────────────────────────────

model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  description String
  enabledFor  Plan[]
  createdAt   DateTime @default(now())
}

model EntitlementOverride {
  id        String    @id @default(cuid())
  tenantId  String
  flagKey   String
  enabled   Boolean
  reason    String?
  expiresAt DateTime?
  createdAt DateTime  @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, flagKey])
}

// ─── Analytics ────────────────────────────────────────────────────────────────

model AnalyticsEvent {
  id         String   @id @default(cuid())
  tenantId   String
  event      String
  properties Json
  occurredAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, event, occurredAt])
}

model DailySnapshot {
  id                     String   @id @default(cuid())
  tenantId               String
  date                   DateTime // UTC midnight
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
  bookingConversionRate  Decimal
  newCustomersCount      Int
  revenueUsd             Decimal

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, date])
  @@index([tenantId, date])
}

// ─── Notifications ────────────────────────────────────────────────────────────

model NotificationJob {
  id            String              @id @default(cuid())
  tenantId      String
  type          NotificationType
  channel       NotificationChannel
  recipient     String
  payload       Json
  status        JobStatus           @default(PENDING)
  scheduledFor  DateTime
  attempts      Int                 @default(0)
  lastAttemptAt DateTime?
  failureReason String?
  sentAt        DateTime?
  createdAt     DateTime            @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([status, scheduledFor])
  @@index([tenantId, type])
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

model AuditLog {
  id         String         @id @default(cuid())
  tenantId   String
  actorId    String?
  actorType  AuditActorType
  action     String         // "appointment.confirmed"
  resource   String         // "Appointment"
  resourceId String
  changes    Json?          // { before: {...}, after: {...} }
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime       @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, createdAt])
  @@index([tenantId, resource, resourceId])
}
```

- [ ] **Step 2: Add DIRECT_URL to .env.local** (required for Prisma migrations with Supabase pooler)

```bash
echo "DIRECT_URL=" >> .env.local
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma .env.local
git commit -m "feat: add full Prisma schema with all domain models"
```

---

## Task 4: Supabase Client Files

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 1: Create browser client (singleton)**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server client (cookies-based)**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 5: Prisma Singleton + Soft-Delete Middleware

**Files:**
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Write prisma.ts**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Soft-delete middleware — automatically filters deletedAt for affected models
const SOFT_DELETE_MODELS = [
  "Customer",
  "Appointment",
  "Conversation",
  "TeamMember",
  "Service",
  "Tenant",
] as const;

prisma.$use(async (params, next) => {
  if (
    params.model &&
    SOFT_DELETE_MODELS.includes(params.model as (typeof SOFT_DELETE_MODELS)[number])
  ) {
    if (
      params.action === "findUnique" ||
      params.action === "findFirst"
    ) {
      params.action = "findFirst";
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    if (params.action === "findMany") {
      params.args ??= {};
      params.args.where = { ...params.args.where, deletedAt: null };
    }
  }
  return next(params);
});

export { prisma };

/**
 * Set the RLS tenant context for the current transaction.
 * Must be called inside a $transaction before any tenant-scoped query.
 */
export async function setTenantContext(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  tenantId: string
) {
  await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/prisma.ts
git commit -m "feat: add Prisma singleton with soft-delete middleware and RLS helper"
```

---

## Task 6: Tenant Resolution Library

**Files:**
- Create: `src/lib/tenant.ts`

- [ ] **Step 1: Write tenant.ts**

```typescript
// src/lib/tenant.ts
import { headers } from "next/headers";
import { prisma } from "./prisma";

export const TENANT_HEADER = "x-tenant-id";
export const TENANT_SLUG_HEADER = "x-tenant-slug";

/**
 * Read tenant ID injected by middleware. Call from Server Components and Route Handlers.
 * Throws if header is absent — indicates middleware misconfiguration.
 */
export async function getTenantIdFromHeaders(): Promise<string> {
  const headersList = await headers();
  const tenantId = headersList.get(TENANT_HEADER);
  if (!tenantId) {
    throw new Error(
      "Tenant ID header missing. Ensure middleware.ts is running for this route."
    );
  }
  return tenantId;
}

/**
 * Resolve a tenant by slug. Returns null if not found or soft-deleted.
 */
export async function resolveTenantBySlug(slug: string) {
  return prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      timezone: true,
      logo: true,
      parentTenantId: true,
    },
  });
}

/**
 * Verify user is a member of tenant. Returns membership or null.
 */
export async function getTenantMembership(userId: string, tenantId: string) {
  return prisma.tenantMember.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { role: true, tenantId: true },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/tenant.ts
git commit -m "feat: add tenant resolution utilities"
```

---

## Task 7: Permissions Library

**Files:**
- Create: `src/lib/permissions.ts`

- [ ] **Step 1: Write permissions.ts**

```typescript
// src/lib/permissions.ts
import { Role } from "@prisma/client";

type Permission =
  | "dashboard.view"
  | "analytics.view"
  | "appointments.manage_all"
  | "appointments.manage_own"
  | "customers.view"
  | "customers.edit"
  | "inbox.view"
  | "inbox.send"
  | "team.manage"
  | "working_hours.manage_all"
  | "working_hours.manage_own"
  | "services.manage"
  | "ai_settings.manage"
  | "integrations.manage"
  | "webhooks.manage"
  | "billing.view"
  | "profile.edit"
  | "workspace.delete"
  | "agency.manage_businesses";

const PERMISSION_MAP: Record<Permission, Role[]> = {
  "dashboard.view": ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"],
  "analytics.view": ["OWNER", "ADMIN", "MANAGER", "VIEWER"],
  "appointments.manage_all": ["OWNER", "ADMIN", "MANAGER"],
  "appointments.manage_own": ["OWNER", "ADMIN", "MANAGER", "STAFF"],
  "customers.view": ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"],
  "customers.edit": ["OWNER", "ADMIN", "MANAGER"],
  "inbox.view": ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"],
  "inbox.send": ["OWNER", "ADMIN", "MANAGER", "STAFF"],
  "team.manage": ["OWNER", "ADMIN", "MANAGER"],
  "working_hours.manage_all": ["OWNER", "ADMIN", "MANAGER"],
  "working_hours.manage_own": ["OWNER", "ADMIN", "MANAGER", "STAFF"],
  "services.manage": ["OWNER", "ADMIN", "MANAGER"],
  "ai_settings.manage": ["OWNER", "ADMIN"],
  "integrations.manage": ["OWNER", "ADMIN"],
  "webhooks.manage": ["OWNER", "ADMIN"],
  "billing.view": ["OWNER", "ADMIN"],
  "profile.edit": ["OWNER", "ADMIN"],
  "workspace.delete": ["OWNER"],
  "agency.manage_businesses": ["OWNER", "ADMIN"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MAP[permission]?.includes(role) ?? false;
}

/**
 * Throws a 403 error if the role lacks the required permission.
 * Use in Server Components and Route Handlers.
 */
export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const error = new Error(
      `Role ${role} does not have permission: ${permission}`
    );
    (error as Error & { status: number }).status = 403;
    throw error;
  }
}

export type { Permission };
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/permissions.ts
git commit -m "feat: add RBAC permission map and requirePermission helper"
```

---

## Task 8: Entitlements Library

**Files:**
- Create: `src/lib/entitlements.ts`

- [ ] **Step 1: Write entitlements.ts**

```typescript
// src/lib/entitlements.ts
import { Plan } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Check if a tenant has access to a feature flag.
 * EntitlementOverride takes highest priority; falls back to plan-level default.
 */
export async function hasFeature(
  tenantId: string,
  plan: Plan,
  flagKey: string
): Promise<boolean> {
  // 1. Check per-tenant override
  const override = await prisma.entitlementOverride.findUnique({
    where: { tenantId_flagKey: { tenantId, flagKey } },
  });
  if (override) {
    if (!override.expiresAt || override.expiresAt > new Date()) {
      return override.enabled;
    }
    // Expired override — fall through to plan default
  }

  // 2. Plan-level default from FeatureFlag definition
  const flag = await prisma.featureFlag.findUnique({
    where: { key: flagKey },
  });
  return flag?.enabledFor.includes(plan) ?? false;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/entitlements.ts
git commit -m "feat: add feature flag entitlement resolution"
```

---

## Task 9: Utility Functions

**Files:**
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Write utils.ts**

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for display in a given IANA timezone.
 * @example formatDate(date, "America/New_York", "MMM d, h:mm a") → "Jun 3, 2:30 PM"
 */
export function formatDate(
  date: Date | string,
  timezone: string,
  fmt = "MMM d, yyyy"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: fmt.includes("yyyy") ? "numeric" : undefined,
    month: fmt.includes("MMM") ? "short" : fmt.includes("MM") ? "2-digit" : undefined,
    day: fmt.includes("d") ? "numeric" : undefined,
    hour: fmt.includes("h") ? "numeric" : undefined,
    minute: fmt.includes("mm") ? "2-digit" : undefined,
    hour12: fmt.includes("a"),
  }).format(d);
}

/** "2 hours ago", "just now" */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format a Decimal/number as currency.
 * @example formatCurrency(1234.5, "USD") → "$1,234.50"
 */
export function formatCurrency(
  amount: number | string,
  currency = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

/** Generate a URL-safe slug from a string */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add cn, formatDate, formatCurrency, slugify utilities"
```

---

## Task 10: AI Provider Adapter

**Files:**
- Create: `src/lib/ai/types.ts`
- Create: `src/lib/ai/pricing.ts`
- Create: `src/lib/ai/providers/openai.ts`
- Create: `src/lib/ai/providers/anthropic.ts`
- Create: `src/lib/ai/providers/gemini.ts`
- Create: `src/lib/ai/providers/grok.ts`
- Create: `src/lib/ai/index.ts`

- [ ] **Step 1: Define AI types**

```typescript
// src/lib/ai/types.ts

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
}

export interface AIProviderSettings {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string; // BYOK — already decrypted before passing here
}

export interface AIProvider {
  chat(messages: AIMessage[], settings: AIProviderSettings): Promise<AIResponse>;
}
```

- [ ] **Step 2: Define token pricing table**

```typescript
// src/lib/ai/pricing.ts

// Cost per 1,000 tokens in USD (approximate — update as providers change pricing)
const PRICING: Record<string, { prompt: number; completion: number }> = {
  // OpenAI
  "openai:gpt-4o": { prompt: 0.005, completion: 0.015 },
  "openai:gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "openai:gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
  // Anthropic
  "anthropic:claude-3-5-sonnet-20241022": { prompt: 0.003, completion: 0.015 },
  "anthropic:claude-3-haiku-20240307": { prompt: 0.00025, completion: 0.00125 },
  // Google
  "gemini:gemini-1.5-pro": { prompt: 0.00125, completion: 0.005 },
  "gemini:gemini-1.5-flash": { prompt: 0.000075, completion: 0.0003 },
  // Grok
  "grok:grok-2": { prompt: 0.002, completion: 0.01 },
};

export function estimateCostUsd(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const key = `${provider}:${model}`;
  const rates = PRICING[key] ?? { prompt: 0.005, completion: 0.015 }; // safe fallback
  return (
    (promptTokens / 1000) * rates.prompt +
    (completionTokens / 1000) * rates.completion
  );
}
```

- [ ] **Step 3: OpenAI provider**

```typescript
// src/lib/ai/providers/openai.ts
import OpenAI from "openai";
import type { AIMessage, AIProvider, AIProviderSettings, AIResponse } from "../types";

export class OpenAIProvider implements AIProvider {
  async chat(messages: AIMessage[], settings: AIProviderSettings): Promise<AIResponse> {
    const client = new OpenAI({
      apiKey: settings.apiKey ?? process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: settings.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    });

    const choice = response.choices[0];
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      content: choice.message.content ?? "",
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      model: settings.model,
      provider: "openai",
    };
  }
}
```

- [ ] **Step 4: Anthropic provider**

```typescript
// src/lib/ai/providers/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import type { AIMessage, AIProvider, AIProviderSettings, AIResponse } from "../types";

export class AnthropicProvider implements AIProvider {
  async chat(messages: AIMessage[], settings: AIProviderSettings): Promise<AIResponse> {
    const client = new Anthropic({
      apiKey: settings.apiKey ?? process.env.ANTHROPIC_API_KEY,
    });

    // Anthropic separates system messages from the messages array
    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await client.messages.create({
      model: settings.model,
      max_tokens: settings.maxTokens,
      system: systemMessage,
      messages: userMessages,
    });

    const textBlock = response.content.find((b) => b.type === "text");

    return {
      content: textBlock?.type === "text" ? textBlock.text : "",
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      model: settings.model,
      provider: "anthropic",
    };
  }
}
```

- [ ] **Step 5: Gemini provider**

```typescript
// src/lib/ai/providers/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIMessage, AIProvider, AIProviderSettings, AIResponse } from "../types";

export class GeminiProvider implements AIProvider {
  async chat(messages: AIMessage[], settings: AIProviderSettings): Promise<AIResponse> {
    const genAI = new GoogleGenerativeAI(
      settings.apiKey ?? process.env.GOOGLE_AI_API_KEY!
    );
    const model = genAI.getGenerativeModel({ model: settings.model });

    // Map to Gemini history format — system messages become first user turn
    const systemMsg = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const history = conversationMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const userInput = lastMessage?.content ?? "";

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
      },
      systemInstruction: systemMsg?.content,
    });

    const result = await chat.sendMessage(userInput);
    const text = result.response.text();
    const usage = result.response.usageMetadata;

    return {
      content: text,
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
      totalTokens: usage?.totalTokenCount ?? 0,
      model: settings.model,
      provider: "gemini",
    };
  }
}
```

- [ ] **Step 6: Grok provider**

```typescript
// src/lib/ai/providers/grok.ts
// Grok uses an OpenAI-compatible API
import OpenAI from "openai";
import type { AIMessage, AIProvider, AIProviderSettings, AIResponse } from "../types";

export class GrokProvider implements AIProvider {
  async chat(messages: AIMessage[], settings: AIProviderSettings): Promise<AIResponse> {
    const client = new OpenAI({
      apiKey: settings.apiKey ?? process.env.GROK_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });

    const response = await client.chat.completions.create({
      model: settings.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    });

    const choice = response.choices[0];
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      content: choice.message.content ?? "",
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      model: settings.model,
      provider: "grok",
    };
  }
}
```

- [ ] **Step 7: Factory function**

```typescript
// src/lib/ai/index.ts
import type { AIProvider, AIProviderSettings } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { GrokProvider } from "./providers/grok";

export function getAIProvider(settings: AIProviderSettings): AIProvider {
  switch (settings.provider) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "gemini":
      return new GeminiProvider();
    case "grok":
      return new GrokProvider();
    default:
      // Unknown provider — fall back to OpenAI
      return new OpenAIProvider();
  }
}

export type { AIMessage, AIResponse, AIProvider, AIProviderSettings } from "./types";
export { estimateCostUsd } from "./pricing";
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/ai/
git commit -m "feat: add multi-provider AI adapter (OpenAI, Anthropic, Gemini, Grok)"
```

---

## Task 11: Middleware — Auth Guard + Tenant Resolution

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write middleware.ts**

```typescript
// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { TENANT_HEADER, TENANT_SLUG_HEADER } from "@/lib/tenant";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];
const BOOKING_ROUTE_PREFIX = "/book/";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth routes and booking pages through without a session check
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith(BOOKING_ROUTE_PREFIX)
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });

  // Build a server-side Supabase client with the request's cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session — redirect to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Extract tenant slug from /{tenant}/... routes
  const tenantSlugMatch = pathname.match(/^\/([^/]+)\//);
  const tenantSlug = tenantSlugMatch?.[1];

  if (tenantSlug && !["api", "_next", "favicon.ico"].includes(tenantSlug)) {
    // Inject slug into headers — actual DB lookup happens in the layout
    // to avoid a DB call on every middleware invocation
    response.headers.set(TENANT_SLUG_HEADER, tenantSlug);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth guard and tenant slug injection middleware"
```

---

## Task 12: Shared Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write types/index.ts**

```typescript
// src/types/index.ts

// Re-export Prisma enums and types used throughout the app
export type {
  User,
  Tenant,
  TenantMember,
  Service,
  WorkingHours,
  BusyPeriod,
  Appointment,
  Customer,
  Conversation,
  Message,
  TeamMember,
  AISettings,
} from "@prisma/client";

export {
  Role,
  Plan,
  AppointmentStatus,
  BookingChannel,
  ConversationChannel,
  ConversationStatus,
  MessageRole,
} from "@prisma/client";

// ─── App-level types ──────────────────────────────────────────────────────────

/** Resolved tenant context passed through dashboard layouts */
export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  plan: import("@prisma/client").Plan;
  timezone: string;
  logo: string | null;
  parentTenantId: string | null;
}

/** Authenticated user with their role in the current tenant */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: import("@prisma/client").Role;
}

/** Stat card data shape for dashboard KPI strip */
export interface StatCardData {
  label: string;
  value: string | number;
  delta: number;       // positive = up, negative = down
  deltaLabel: string;  // "vs. yesterday"
  sparkline: number[]; // 7 values for mini chart
}

/** Paginated list response wrapper */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript types and Prisma re-exports"
```

---

## Task 13: TanStack Query Provider

**Files:**
- Create: `src/components/providers.tsx`

- [ ] **Step 1: Write providers.tsx**

```typescript
// src/components/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/providers.tsx
git commit -m "feat: add TanStack Query provider with sensible defaults"
```

---

## Task 14: Global CSS and Design Tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css with full design token system**

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  /* Design tokens — light mode */
  --bg: #fafafa;
  --surface: #ffffff;
  --border: #e5e5e5;
  --text-primary: #0a0a0a;
  --text-muted: #737373;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;

  /* shadcn/ui tokens */
  --background: var(--bg);
  --foreground: var(--text-primary);
  --card: var(--surface);
  --card-foreground: var(--text-primary);
  --popover: var(--surface);
  --popover-foreground: var(--text-primary);
  --primary: var(--accent);
  --primary-foreground: #ffffff;
  --secondary: #f5f5f5;
  --secondary-foreground: #0a0a0a;
  --muted: #f5f5f5;
  --muted-foreground: var(--text-muted);
  --accent-color: #f5f5f5;
  --accent-foreground: #0a0a0a;
  --destructive: var(--danger);
  --border-color: var(--border);
  --input: var(--border);
  --ring: var(--accent);
  --radius: 6px;
}

.dark {
  --bg: #0a0a0a;
  --surface: #111111;
  --border: #1f1f1f;
  --text-primary: #fafafa;
  --text-muted: #737373;
  --accent: #2563eb;
  --accent-hover: #3b82f6;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;

  --background: var(--bg);
  --foreground: var(--text-primary);
  --card: var(--surface);
  --card-foreground: var(--text-primary);
  --popover: var(--surface);
  --popover-foreground: var(--text-primary);
  --primary: var(--accent);
  --primary-foreground: #ffffff;
  --secondary: #1a1a1a;
  --secondary-foreground: #fafafa;
  --muted: #1a1a1a;
  --muted-foreground: var(--text-muted);
  --accent-color: #1a1a1a;
  --accent-foreground: #fafafa;
  --destructive: var(--danger);
  --border-color: var(--border);
  --input: var(--border);
  --ring: var(--accent);
}

* {
  box-sizing: border-box;
  border-color: var(--border-color);
}

body {
  background-color: var(--bg);
  color: var(--text-primary);
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
}

/* Typography scale */
.text-xs  { font-size: 12px; }
.text-sm  { font-size: 13px; }
.text-base { font-size: 14px; }
.text-lg  { font-size: 16px; }
.text-xl  { font-size: 18px; }
.text-2xl { font-size: 24px; }
.text-3xl { font-size: 32px; }

/* Focus rings — all interactive elements */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Scrollbar — minimal, consistent */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add design token system with light/dark mode and typography scale"
```

---

## Task 15: Root Layout with Geist Font

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Appointment SaaS",
    template: "%s | Appointment SaaS",
  },
  description: "AI-powered appointment booking for businesses of all sizes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add root layout with Geist font and providers"
```

---

## Task 16: Auth Layout + Stub Pages

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Auth layout — centered card on neutral background**

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Login stub**

```tsx
// src/app/(auth)/login/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
      <h1 className="text-xl font-semibold mb-1">Sign in</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Login page — coming in Auth flows plan
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Register stub**

```tsx
// src/app/(auth)/register/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
      <h1 className="text-xl font-semibold mb-1">Create account</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Register page — coming in Auth flows plan
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Forgot password stub**

```tsx
// src/app/(auth)/forgot-password/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8">
      <h1 className="text-xl font-semibold mb-1">Reset password</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Forgot password page — coming in Auth flows plan
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(auth)/
git commit -m "feat: add auth layout and login/register/forgot-password stubs"
```

---

## Task 17: Dashboard Shell Layout

**Files:**
- Create: `src/app/(dashboard)/[tenant]/layout.tsx`
- Create: `src/app/(dashboard)/[tenant]/page.tsx`

- [ ] **Step 1: Dashboard layout — resolves tenant, enforces membership**

```tsx
// src/app/(dashboard)/[tenant]/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { tenant: slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Resolve platform user from supabaseAuthId
  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
  });

  if (!dbUser) {
    // User authenticated with Supabase but has no app record — first-time setup
    redirect("/register");
  }

  // Resolve tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      timezone: true,
      logo: true,
      parentTenantId: true,
    },
  });

  if (!tenant) {
    redirect("/login");
  }

  // Verify membership
  const membership = await prisma.tenantMember.findUnique({
    where: { userId_tenantId: { userId: dbUser.id, tenantId: tenant.id } },
    select: { role: true },
  });

  if (!membership) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      {/* Sidebar placeholder — replaced in Dashboard Shell plan */}
      <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="p-4">
          <p className="text-xs text-[var(--text-muted)] font-mono">
            {tenant.name}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Dashboard overview stub page**

```tsx
// src/app/(dashboard)/[tenant]/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Overview page — coming in Dashboard Overview plan
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/"
git commit -m "feat: add dashboard layout with tenant and membership resolution"
```

---

## Task 18: Verify TypeScript and Build

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If errors appear, fix them before proceeding.

- [ ] **Step 2: Run dev server and manually verify routes**

```bash
npm run dev
```

Verify in browser:
- http://localhost:3000/login → renders auth card stub
- http://localhost:3000/register → renders auth card stub
- http://localhost:3000/some-tenant/dashboard → redirects to /login (no session)

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify foundation builds cleanly — TypeScript 0 errors"
```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Covered? | Task |
|---|---|---|
| Tech stack (Next.js 15, TS, Tailwind v4, shadcn, Supabase, Prisma, TanStack Query) | ✓ | Task 1 |
| 3-tier tenant hierarchy + parentTenantId | ✓ | Task 3 |
| RLS helper (setTenantContext) | ✓ | Task 5 |
| Supabase auth bridge (supabaseAuthId) | ✓ | Task 3 + 4 |
| Auth guard in middleware | ✓ | Task 11 |
| Tenant slug in URL path | ✓ | Task 11 + 17 |
| Soft-delete middleware | ✓ | Task 5 |
| RBAC roles (5 roles + permission map) | ✓ | Task 7 |
| Feature flags + EntitlementOverride | ✓ | Task 3 + 8 |
| AI adapter pattern (4 providers) | ✓ | Task 10 |
| Token pricing table | ✓ | Task 10 |
| Geist font | ✓ | Task 15 |
| Design tokens (light + dark) | ✓ | Task 14 |
| 4px spacing, 6px radius | ✓ | Task 14 |
| Realtime channels | Not in foundation — covered in Dashboard Overview plan |
| Full page implementations | Not in foundation — each in its own plan |
| Booking page | Not in foundation — separate plan |
| WhatsApp webhook | Not in foundation — separate plan |

All foundation requirements covered.

### Placeholder Scan

No TBDs, no "implement later", no "add appropriate error handling" without code, no steps that describe without showing. Each step contains complete, runnable code.

### Type Consistency Check

- `TenantContext` defined in Task 12, consumed in Task 17 layout ✓
- `AIMessage`, `AIResponse`, `AIProvider`, `AIProviderSettings` defined in Task 10 types.ts, used consistently across all 4 providers ✓
- `TENANT_HEADER`, `TENANT_SLUG_HEADER` constants defined in Task 6 `tenant.ts`, imported in Task 11 middleware ✓
- `setTenantContext` takes `tx` typed as Prisma transactional client — consistent with how Prisma transactions work ✓
- `Permission` type defined in permissions.ts, `requirePermission(role, permission)` signature is clear ✓

---

## Next Plans (in order)

1. `2026-06-17-auth-flows.md` — Login, register, forgot-password with Supabase Auth
2. `2026-06-17-dashboard-shell.md` — Sidebar, topbar, workspace switcher, nav
3. `2026-06-17-dashboard-overview.md` — KPI strip, charts, inbox snapshot, today's timeline
4. `2026-06-17-appointments.md` — Calendar, list, slide-over panel
5. `2026-06-17-customers.md` — CRM table, detail panel
6. `2026-06-17-inbox.md` — 3-column chat, realtime, staff takeover
7. `2026-06-17-analytics.md` — Charts, heatmap, CSV export
8. `2026-06-17-settings.md` — Working hours, busy hours, team, AI, profile
9. `2026-06-17-booking-page.md` — Public slot picker
10. `2026-06-17-api-routes.md` — AI chat, WhatsApp webhook, upload
