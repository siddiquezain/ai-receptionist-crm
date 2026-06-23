# Phase 4A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dashboard-side infrastructure for Phase 4: schema migrations, all internal API endpoints, webhook receiver, Settings → Integrations UI, Inbox WHATSAPP display, and public booking page.

**Architecture:** n8n calls authenticated `/api/internal/*` endpoints for all business state changes. The dashboard owns all business rules — AI key handling, conflict detection, audit logging. The proxy is updated to bypass Supabase auth for internal API and webhook routes.

**Tech Stack:** Next.js 16.2.9 App Router, Prisma 7 (PrismaPg adapter), Supabase SSR, Zod v4, date-fns-tz, Vitest

---

## Scope Note

This plan covers **dashboard code only** (Phases 4A, 4B-dashboard, 4E, 4F-partial). The following are **out of scope** — done in the n8n UI after infrastructure is provisioned:
- n8n WhatsApp Ingress workflow (Phase 4B)
- n8n AI Response workflow (Phase 4C)
- n8n Notification Poller workflow (Phase 4D)
- Supabase RLS policies (Phase 4F — requires Supabase dashboard access)
- Upstash rate limiting (Phase 4F — requires Upstash account)

---

## File Map

**New files:**
- `src/lib/internal-api/auth.ts` — bearer token validation + tenant lookup + error response helper
- `src/lib/internal-api/availability.ts` — slot calculation business logic (WorkingHours + BusyPeriod + Appointment conflict)
- `src/app/api/internal/messaging/inbound/route.ts`
- `src/app/api/internal/ai/chat/route.ts`
- `src/app/api/internal/tenants/[tenantId]/availability/route.ts`
- `src/app/api/internal/appointments/route.ts`
- `src/app/api/internal/customers/find-or-create/route.ts`
- `src/app/api/internal/notifications/route.ts`
- `src/app/api/internal/analytics/events/route.ts`
- `src/app/api/webhooks/n8n/route.ts`
- `src/lib/actions/integrations.ts` — server actions for MessagingIntegration CRUD
- `src/app/(dashboard)/[tenant]/settings/integrations/page.tsx`
- `src/components/settings/messaging-integration-form.tsx`
- `src/app/book/[tenant-slug]/page.tsx` — public booking page (Server Component)
- `src/app/book/[tenant-slug]/booking-client.tsx` — multi-step form (Client Component)
- `vitest.config.ts`
- `vitest.setup.ts`
- `src/__tests__/internal-api/auth.test.ts`
- `src/__tests__/internal-api/availability.test.ts`
- `src/__tests__/internal-api/messaging-inbound.test.ts`
- `src/__tests__/internal-api/ai-chat.test.ts`
- `src/__tests__/internal-api/appointments.test.ts`
- `src/__tests__/internal-api/webhooks-n8n.test.ts`

**Modified files:**
- `src/proxy.ts` — add `/api/internal/` and `/api/webhooks/` to bypass list
- `prisma/schema.prisma` — add `MessagingProvider` enum, `MessagingIntegration` model, `Conversation.messagingIntegrationId`, `Message.externalId`, `Tenant.messagingIntegrations`

---

## Task 1: Proxy Bypass + Tooling Setup

**Files:**
- Modify: `src/proxy.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Install packages**

```bash
npm install date-fns-tz
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Add internal API + webhook routes to proxy bypass**

In `src/proxy.ts`, update `PUBLIC_ROUTES`:

```typescript
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/api/internal/",
  "/api/webhooks/",
];
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```typescript
// vitest.setup.ts
process.env.N8N_API_KEY = "test-api-key-32-bytes-minimum-length-ok";
process.env.N8N_WEBHOOK_SECRET = "test-webhook-secret-32-bytes-min-ok";
process.env.ENCRYPTION_KEY = "a".repeat(64); // 64 hex chars for AES-256
process.env.DATABASE_URL = "postgresql://test"; // prevents prisma init errors in unit tests
```

- [ ] **Step 5: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Run tests (expect 0 tests, no failures)**

```bash
npm test
```

Expected output: `No test files found`

- [ ] **Step 7: Commit**

```bash
git add src/proxy.ts vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "chore: add vitest, date-fns-tz; bypass proxy auth for internal API + webhook routes"
```

---

## Task 2: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `MessagingProvider` enum after the existing enums block**

In `prisma/schema.prisma`, add after the `AuditActorType` enum:

```prisma
enum MessagingProvider {
  EVOLUTION_API
}
```

- [ ] **Step 2: Add `MessagingIntegration` model**

Add after the `CalendarIntegration` model:

```prisma
// ─── Messaging Integration ────────────────────────────────────────────────────

model MessagingIntegration {
  id              String            @id @default(cuid())
  tenantId        String
  provider        MessagingProvider
  instanceName    String
  displayName     String?
  phoneNumber     String?
  apiEndpoint     String?
  apiKey          String
  webhookSecret   String?
  isActive        Boolean           @default(true)
  lastConnectedAt DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  deletedAt       DateTime?

  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  conversations Conversation[]

  @@unique([provider, instanceName])
  @@index([tenantId, isActive])
}
```

- [ ] **Step 3: Add `messagingIntegrations` relation to `Tenant` model**

In the `Tenant` model, add after `calendarIntegrations CalendarIntegration[]`:

```prisma
messagingIntegrations MessagingIntegration[]
```

- [ ] **Step 4: Add `messagingIntegrationId` to `Conversation` model**

In the `Conversation` model, add after `externalId String?`:

```prisma
messagingIntegrationId String?
messagingIntegration   MessagingIntegration? @relation(fields: [messagingIntegrationId], references: [id])
```

- [ ] **Step 5: Add `externalId` to `Message` model**

In the `Message` model, add after `isDraft Boolean @default(false)`:

```prisma
externalId String? @unique
```

- [ ] **Step 6: Generate and run migration**

```bash
npx prisma migrate dev --name phase4a_messaging_integration
```

Expected: Migration file created and applied.

- [ ] **Step 7: Verify generated client**

```bash
npx prisma generate
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add MessagingIntegration model, Message.externalId, Conversation.messagingIntegrationId"
```

---

## Task 3: Internal API Auth Helper

**Files:**
- Create: `src/lib/internal-api/auth.ts`
- Create: `src/__tests__/internal-api/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/internal-api/auth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock prisma before importing auth
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findFirst: vi.fn(),
    },
  },
}));

import { requireInternalAuth, requireTenant, InternalApiError, errorResponse } from "@/lib/internal-api/auth";
import { prisma } from "@/lib/prisma";

function makeRequest(authHeader?: string) {
  return new NextRequest("http://localhost/api/internal/test", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("requireInternalAuth", () => {
  it("throws 401 when Authorization header is missing", async () => {
    await expect(requireInternalAuth(makeRequest())).rejects.toMatchObject({
      status: 401,
      code: "INVALID_API_KEY",
    });
  });

  it("throws 401 when token does not match N8N_API_KEY", async () => {
    await expect(requireInternalAuth(makeRequest("Bearer wrong-token"))).rejects.toMatchObject({
      status: 401,
      code: "INVALID_API_KEY",
    });
  });

  it("resolves when token matches N8N_API_KEY", async () => {
    await expect(
      requireInternalAuth(makeRequest(`Bearer ${process.env.N8N_API_KEY}`))
    ).resolves.toBeUndefined();
  });
});

describe("requireTenant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws 404 when tenant not found", async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);
    await expect(requireTenant("nonexistent-id")).rejects.toMatchObject({
      status: 404,
      code: "TENANT_NOT_FOUND",
    });
  });

  it("resolves when tenant exists", async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ id: "t1" } as never);
    await expect(requireTenant("t1")).resolves.toBeUndefined();
  });
});

describe("errorResponse", () => {
  it("returns 401 for InternalApiError with status 401", () => {
    const err = new InternalApiError(401, "INVALID_API_KEY", "Unauthorized");
    const res = errorResponse(err);
    expect(res.status).toBe(401);
  });

  it("returns 500 for unknown errors", () => {
    const res = errorResponse(new Error("unexpected"));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test src/__tests__/internal-api/auth.test.ts
```

Expected: `Cannot find module '@/lib/internal-api/auth'`

- [ ] **Step 3: Create `src/lib/internal-api/auth.ts`**

```typescript
// src/lib/internal-api/auth.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export class InternalApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "InternalApiError";
  }
}

/**
 * Validates the Authorization: Bearer {N8N_API_KEY} header.
 * Throws InternalApiError(401) if missing or invalid.
 */
export async function requireInternalAuth(request: NextRequest): Promise<void> {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    throw new InternalApiError(401, "INVALID_API_KEY", "Unauthorized");
  }
  const token = auth.slice(7);
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey || token !== apiKey) {
    throw new InternalApiError(401, "INVALID_API_KEY", "Unauthorized");
  }
}

/**
 * Validates that a tenantId refers to an existing, non-deleted Tenant.
 * Throws InternalApiError(404) if not found.
 */
export async function requireTenant(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) {
    throw new InternalApiError(404, "TENANT_NOT_FOUND", "Tenant not found");
  }
}

/**
 * Converts any error into a NextResponse with the correct status code.
 * Use as the catch handler in every internal API route.
 */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof InternalApiError) {
    return NextResponse.json(
      { error: e.message, code: e.code },
      { status: e.status }
    );
  }
  console.error("[internal-api]", e);
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test src/__tests__/internal-api/auth.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/internal-api/auth.ts src/__tests__/internal-api/auth.test.ts
git commit -m "feat: add internal API auth helper with bearer token validation"
```

---

## Task 4: Availability Logic

**Files:**
- Create: `src/lib/internal-api/availability.ts`
- Create: `src/__tests__/internal-api/availability.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/internal-api/availability.test.ts
import { describe, it, expect } from "vitest";
import { generateSlots } from "@/lib/internal-api/availability";

describe("generateSlots", () => {
  it("generates correct slots for a 60-min service with no buffer", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: { startTime: "09:00", endTime: "11:00" },
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [],
      existingAppointments: [],
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T09:00:00.000Z");
    expect(slots[0].endAt.toISOString()).toBe("2026-06-24T10:00:00.000Z");
    expect(slots[1].startAt.toISOString()).toBe("2026-06-24T10:00:00.000Z");
    expect(slots[1].endAt.toISOString()).toBe("2026-06-24T11:00:00.000Z");
  });

  it("excludes slots that overlap a busy period", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: { startTime: "09:00", endTime: "12:00" },
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [
        {
          startAt: new Date("2026-06-24T10:00:00Z"),
          endAt: new Date("2026-06-24T11:00:00Z"),
        },
      ],
      existingAppointments: [],
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T09:00:00.000Z");
    expect(slots[1].startAt.toISOString()).toBe("2026-06-24T11:00:00.000Z");
  });

  it("excludes slots that overlap an existing appointment", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: { startTime: "09:00", endTime: "12:00" },
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [],
      existingAppointments: [
        {
          startAt: new Date("2026-06-24T09:00:00Z"),
          endAt: new Date("2026-06-24T10:00:00Z"),
        },
      ],
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T10:00:00.000Z");
  });

  it("respects buffer time between slots", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: { startTime: "09:00", endTime: "12:00" },
      durationMinutes: 60,
      bufferMinutes: 15,
      busyPeriods: [],
      existingAppointments: [],
    });
    // With 60min service + 15min buffer = 75min per slot
    // 09:00-10:00 (service), 10:00-10:15 (buffer), then 10:15-11:15 (service ends 11:15)
    // 11:15-11:30 (buffer), then 11:30 start but 11:30+60=12:30 > 12:00, so no third slot
    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T09:00:00.000Z");
    expect(slots[1].startAt.toISOString()).toBe("2026-06-24T10:15:00.000Z");
  });

  it("returns empty array when working hours are closed", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: null,
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [],
      existingAppointments: [],
    });
    expect(slots).toHaveLength(0);
  });

  it("handles non-UTC timezone correctly", () => {
    // "2026-06-24" in America/New_York (UTC-4 in summer)
    // 09:00 New York = 13:00 UTC
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "America/New_York",
      workingHours: { startTime: "09:00", endTime: "10:00" },
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [],
      existingAppointments: [],
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T13:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test src/__tests__/internal-api/availability.test.ts
```

Expected: `Cannot find module '@/lib/internal-api/availability'`

- [ ] **Step 3: Create `src/lib/internal-api/availability.ts`**

```typescript
// src/lib/internal-api/availability.ts
import { fromZonedTime } from "date-fns-tz";
import { addMinutes } from "date-fns";

export interface TimeSlot {
  startAt: Date;
  endAt: Date;
}

interface GenerateSlotsInput {
  dateStr: string; // "YYYY-MM-DD"
  timezone: string; // e.g. "America/New_York"
  workingHours: { startTime: string; endTime: string } | null;
  durationMinutes: number;
  bufferMinutes: number;
  busyPeriods: Array<{ startAt: Date; endAt: Date }>;
  existingAppointments: Array<{ startAt: Date; endAt: Date }>;
}

/** Returns true if [aStart, aEnd) overlaps [bStart, bEnd) */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Generates available time slots for a given date, working hours, and service.
 * All returned dates are UTC.
 */
export function generateSlots(input: GenerateSlotsInput): TimeSlot[] {
  const {
    dateStr,
    timezone,
    workingHours,
    durationMinutes,
    bufferMinutes,
    busyPeriods,
    existingAppointments,
  } = input;

  if (!workingHours) return [];

  // Convert working hours boundaries to UTC
  const openAt = fromZonedTime(`${dateStr}T${workingHours.startTime}:00`, timezone);
  const closeAt = fromZonedTime(`${dateStr}T${workingHours.endTime}:00`, timezone);

  const blocked = [...busyPeriods, ...existingAppointments];
  const stepMinutes = durationMinutes + bufferMinutes;
  const slots: TimeSlot[] = [];

  let cursor = openAt;
  while (true) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    if (slotEnd > closeAt) break;

    const isBlocked = blocked.some((b) =>
      overlaps(cursor, slotEnd, b.startAt, b.endAt)
    );

    if (!isBlocked) {
      slots.push({ startAt: new Date(cursor), endAt: new Date(slotEnd) });
    }

    cursor = addMinutes(cursor, stepMinutes);
  }

  return slots;
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test src/__tests__/internal-api/availability.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/internal-api/availability.ts src/__tests__/internal-api/availability.test.ts
git commit -m "feat: add slot generation logic with timezone, buffer, and conflict filtering"
```

---

## Task 5: POST /api/internal/messaging/inbound

**Files:**
- Create: `src/app/api/internal/messaging/inbound/route.ts`
- Create: `src/__tests__/internal-api/messaging-inbound.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/internal-api/messaging-inbound.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findFirst: vi.fn() },
    messagingIntegration: { findUnique: vi.fn() },
    customer: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    conversation: { findFirst: vi.fn(), create: vi.fn() },
    message: { findUnique: vi.fn(), create: vi.fn() },
    analyticsEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/internal/messaging/inbound/route";
import { prisma } from "@/lib/prisma";

const VALID_KEY = `Bearer ${process.env.N8N_API_KEY}`;

function makeRequest(body: unknown, authHeader = VALID_KEY) {
  return new NextRequest("http://localhost/api/internal/messaging/inbound", {
    method: "POST",
    headers: { authorization: authHeader, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  instanceName: "acme-salon",
  provider: "EVOLUTION_API",
  externalMessageId: "ev_msg_123",
  from: "+14155551234",
  body: "Hi, I want to book",
  timestamp: "2026-06-23T14:30:00Z",
};

describe("POST /api/internal/messaging/inbound", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for missing auth", async () => {
    const res = await POST(makeRequest(validBody, ""));
    expect(res.status).toBe(401);
  });

  it("returns 422 for missing required fields", async () => {
    const res = await POST(makeRequest({ instanceName: "x" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when MessagingIntegration not found", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        vi.mocked(prisma.messagingIntegration.findUnique).mockResolvedValue(null);
        return fn(prisma);
      }
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("INTEGRATION_NOT_FOUND");
  });

  it("returns isDuplicate:true when externalMessageId already exists", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        const tx = {
          ...prisma,
          messagingIntegration: {
            findUnique: vi.fn().mockResolvedValue({
              id: "mi1",
              tenantId: "t1",
              isActive: true,
              tenant: { aiSettings: { autoBook: true, requireConfirm: false } },
            }),
          },
          customer: {
            findFirst: vi.fn().mockResolvedValue({ id: "c1" }),
            update: vi.fn().mockResolvedValue({ id: "c1" }),
          },
          conversation: {
            findFirst: vi.fn().mockResolvedValue({ id: "conv1" }),
          },
          message: {
            findUnique: vi.fn().mockResolvedValue({ id: "msg1" }),
          },
        };
        return fn(tx);
      }
    });
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ id: "t1" } as never);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isDuplicate).toBe(true);
    expect(json.messageId).toBe("msg1");
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test src/__tests__/internal-api/messaging-inbound.test.ts
```

Expected: `Cannot find module '@/app/api/internal/messaging/inbound/route'`

- [ ] **Step 3: Create the route**

```typescript
// src/app/api/internal/messaging/inbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, errorResponse, InternalApiError } from "@/lib/internal-api/auth";
import { AuditActorType, ConversationChannel, ConversationStatus, MessageRole } from "@prisma/client";

const Schema = z.object({
  instanceName: z.string().min(1),
  provider: z.enum(["EVOLUTION_API"]),
  externalMessageId: z.string().min(1),
  from: z.string().min(1),
  body: z.string(),
  timestamp: z.string().datetime(),
  mediaUrl: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireInternalAuth(request);

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve MessagingIntegration → tenantId
      const integration = await tx.messagingIntegration.findUnique({
        where: { provider_instanceName: { provider: data.provider, instanceName: data.instanceName } },
        select: {
          id: true,
          tenantId: true,
          isActive: true,
          tenant: {
            select: {
              aiSettings: { select: { autoBook: true, requireConfirm: true } },
            },
          },
        },
      });

      if (!integration) {
        throw new InternalApiError(404, "INTEGRATION_NOT_FOUND", "No integration found for this instance");
      }
      if (!integration.isActive) {
        throw new InternalApiError(409, "INTEGRATION_INACTIVE", "Integration is inactive");
      }

      const { tenantId } = integration;

      // 2. Upsert Customer by phone
      let customer = await tx.customer.findFirst({
        where: { tenantId, phone: data.from, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: { tenantId, phone: data.from, name: data.from },
          select: { id: true },
        });
      } else {
        await tx.customer.update({
          where: { id: customer.id },
          data: { updatedAt: new Date() },
        });
      }

      // 3. Find or create Conversation
      const convExternalId = `${data.instanceName}:${data.from}`;
      let conversation = await tx.conversation.findFirst({
        where: { tenantId, externalId: convExternalId, channel: ConversationChannel.WHATSAPP, deletedAt: null },
        select: { id: true },
      });
      const isNewConversation = !conversation;
      if (!conversation) {
        conversation = await tx.conversation.create({
          data: {
            tenantId,
            customerId: customer.id,
            channel: ConversationChannel.WHATSAPP,
            externalId: convExternalId,
            status: ConversationStatus.OPEN,
            aiHandled: true,
            messagingIntegrationId: integration.id,
          },
          select: { id: true },
        });
      }

      // 4. Idempotency check
      const existingMessage = await tx.message.findUnique({
        where: { externalId: data.externalMessageId },
        select: { id: true },
      });
      if (existingMessage) {
        return {
          tenantId,
          customerId: customer.id,
          conversationId: conversation.id,
          messageId: existingMessage.id,
          messagingIntegrationId: integration.id,
          isNewConversation: false,
          isDuplicate: true,
          autoBook: integration.tenant.aiSettings?.autoBook ?? true,
          requireConfirm: integration.tenant.aiSettings?.requireConfirm ?? false,
        };
      }

      // 5. Create Message
      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.USER,
          content: data.body,
          externalId: data.externalMessageId,
        },
        select: { id: true },
      });

      // 6. Analytics event for new conversations
      if (isNewConversation) {
        await tx.analyticsEvent.create({
          data: {
            tenantId,
            event: "conversation.message_received",
            properties: { channel: "WHATSAPP", customerId: customer.id },
          },
        });
      }

      return {
        tenantId,
        customerId: customer.id,
        conversationId: conversation.id,
        messageId: message.id,
        messagingIntegrationId: integration.id,
        isNewConversation,
        isDuplicate: false,
        autoBook: integration.tenant.aiSettings?.autoBook ?? true,
        requireConfirm: integration.tenant.aiSettings?.requireConfirm ?? false,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test src/__tests__/internal-api/messaging-inbound.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/internal/messaging/inbound/route.ts src/__tests__/internal-api/messaging-inbound.test.ts
git commit -m "feat: add POST /api/internal/messaging/inbound with idempotency and tenant resolution"
```

---

## Task 6: POST /api/internal/ai/chat

**Files:**
- Create: `src/app/api/internal/ai/chat/route.ts`
- Create: `src/__tests__/internal-api/ai-chat.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/internal-api/ai-chat.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findFirst: vi.fn() },
    aISettings: { findUnique: vi.fn() },
    conversation: { findFirst: vi.fn() },
    message: { create: vi.fn() },
    aIUsageRecord: { create: vi.fn() },
  },
}));

vi.mock("@/lib/ai", () => ({
  getAIProvider: vi.fn(() => ({
    chat: vi.fn().mockResolvedValue({
      content: "Hello! How can I help?",
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      model: "gpt-4o",
      provider: "openai",
    }),
  })),
  estimateCostUsd: vi.fn(() => 0.001),
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((v: string) => "decrypted-key"),
  isEncrypted: vi.fn(() => true),
}));

import { POST } from "@/app/api/internal/ai/chat/route";
import { prisma } from "@/lib/prisma";

const VALID_KEY = `Bearer ${process.env.N8N_API_KEY}`;

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/internal/ai/chat", {
    method: "POST",
    headers: { authorization: VALID_KEY, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/internal/ai/chat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for missing auth", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/internal/ai/chat", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 422 for missing fields", async () => {
    const res = await POST(makeRequest({ tenantId: "t1" }));
    expect(res.status).toBe(422);
  });

  it("returns 404 when tenant not found", async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);
    const res = await POST(
      makeRequest({ tenantId: "bad", conversationId: "conv1", messages: [] })
    );
    expect(res.status).toBe(404);
  });

  it("returns AI response with messageId on success", async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ id: "t1" } as never);
    vi.mocked(prisma.aISettings.findUnique).mockResolvedValue({
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: "You are helpful.",
      byokApiKey: "encrypted:key:value",
      fallbackProvider: null,
      fallbackModel: null,
    } as never);
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue({ id: "conv1" } as never);
    vi.mocked(prisma.message.create).mockResolvedValue({ id: "msg1" } as never);
    vi.mocked(prisma.aIUsageRecord.create).mockResolvedValue({} as never);

    const res = await POST(
      makeRequest({
        tenantId: "t1",
        conversationId: "conv1",
        messages: [{ role: "user", content: "Hi" }],
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.messageId).toBe("msg1");
    expect(json.content).toBe("Hello! How can I help?");
    expect(json.tokensUsed).toBe(30);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test src/__tests__/internal-api/ai-chat.test.ts
```

Expected: `Cannot find module '@/app/api/internal/ai/chat/route'`

- [ ] **Step 3: Create the route**

```typescript
// src/app/api/internal/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, requireTenant, errorResponse, InternalApiError } from "@/lib/internal-api/auth";
import { getAIProvider, estimateCostUsd } from "@/lib/ai";
import { decrypt, isEncrypted } from "@/lib/crypto";
import { MessageRole } from "@prisma/client";

const Schema = z.object({
  tenantId: z.string().min(1),
  conversationId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    await requireInternalAuth(request);

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const { tenantId, conversationId, messages } = parsed.data;

    await requireTenant(tenantId);

    const aiSettings = await prisma.aISettings.findUnique({
      where: { tenantId },
      select: {
        provider: true,
        model: true,
        temperature: true,
        maxTokens: true,
        systemPrompt: true,
        byokApiKey: true,
        fallbackProvider: true,
        fallbackModel: true,
      },
    });

    const settings = aiSettings ?? {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: null,
      byokApiKey: null,
      fallbackProvider: null,
      fallbackModel: null,
    };

    // Decrypt BYOK key if set — key never leaves the dashboard
    const apiKey =
      settings.byokApiKey && isEncrypted(settings.byokApiKey)
        ? decrypt(settings.byokApiKey)
        : undefined;

    const providerSettings = {
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      apiKey,
    };

    const allMessages = settings.systemPrompt
      ? [{ role: "system" as const, content: settings.systemPrompt }, ...messages]
      : messages;

    let aiResponse;
    try {
      const provider = getAIProvider(providerSettings);
      aiResponse = await provider.chat(allMessages, providerSettings);
    } catch (primaryErr) {
      // Try fallback provider if configured
      if (settings.fallbackProvider) {
        const fallbackSettings = {
          ...providerSettings,
          provider: settings.fallbackProvider,
          model: settings.fallbackModel ?? providerSettings.model,
          apiKey: undefined, // fallback uses platform key
        };
        try {
          const fallbackProvider = getAIProvider(fallbackSettings);
          aiResponse = await fallbackProvider.chat(allMessages, fallbackSettings);
        } catch {
          throw new InternalApiError(502, "AI_PROVIDER_ERROR", "AI provider failed");
        }
      } else {
        throw new InternalApiError(502, "AI_PROVIDER_ERROR", "AI provider failed");
      }
    }

    // Save assistant message + usage record
    const [message] = await Promise.all([
      prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: aiResponse.content,
          tokensUsed: aiResponse.totalTokens,
          provider: aiResponse.provider,
          model: aiResponse.model,
        },
        select: { id: true },
      }),
      prisma.aIUsageRecord.create({
        data: {
          tenantId,
          conversationId,
          provider: aiResponse.provider,
          model: aiResponse.model,
          promptTokens: aiResponse.promptTokens,
          completionTokens: aiResponse.completionTokens,
          totalTokens: aiResponse.totalTokens,
          estimatedCostUsd: estimateCostUsd(aiResponse.provider, aiResponse.model, aiResponse.totalTokens),
          isByok: !!apiKey,
        },
      }),
    ]);

    return NextResponse.json({
      messageId: message.id,
      content: aiResponse.content,
      tokensUsed: aiResponse.totalTokens,
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test src/__tests__/internal-api/ai-chat.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/internal/ai/chat/route.ts src/__tests__/internal-api/ai-chat.test.ts
git commit -m "feat: add POST /api/internal/ai/chat — AI inference with BYOK decryption, fallback provider"
```

---

## Task 7: GET /api/internal/tenants/[tenantId]/availability

**Files:**
- Create: `src/app/api/internal/tenants/[tenantId]/availability/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/internal/tenants/[tenantId]/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, requireTenant, errorResponse, InternalApiError } from "@/lib/internal-api/auth";
import { generateSlots } from "@/lib/internal-api/availability";
import { AppointmentStatus } from "@prisma/client";

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireInternalAuth(request);
    const { tenantId } = await params;
    await requireTenant(tenantId);

    const { searchParams } = request.nextUrl;
    const serviceId = searchParams.get("serviceId");
    const dateStr = searchParams.get("date"); // "YYYY-MM-DD"
    const teamMemberIdParam = searchParams.get("teamMemberId");

    if (!serviceId || !dateStr) {
      throw new InternalApiError(422, "VALIDATION_ERROR", "serviceId and date are required");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new InternalApiError(422, "VALIDATION_ERROR", "date must be YYYY-MM-DD");
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null, isActive: true },
      select: { duration: true, bufferTime: true },
    });
    if (!service) {
      throw new InternalApiError(404, "SERVICE_NOT_FOUND", "Service not found");
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { timezone: true },
    });
    const timezone = tenant?.timezone ?? "UTC";

    // Determine day of week for requested date in tenant timezone
    const dateMidnight = new Date(`${dateStr}T00:00:00Z`);
    const dayOfWeek = new Date(
      dateMidnight.toLocaleString("en-US", { timeZone: timezone })
    ).getDay();

    // Find team members to check (all or one)
    const teamMemberWhere = teamMemberIdParam
      ? { id: teamMemberIdParam, tenantId, deletedAt: null, isActive: true }
      : { tenantId, deletedAt: null, isActive: true, services: { some: { serviceId } } };

    const teamMembers = await prisma.teamMember.findMany({
      where: teamMemberWhere,
      select: { id: true, name: true },
    });

    const allSlots: Array<{
      startAt: string;
      endAt: string;
      teamMemberId: string;
      teamMemberName: string;
    }> = [];

    for (const member of teamMembers) {
      const workingHours = await prisma.workingHours.findFirst({
        where: {
          tenantId,
          dayOfWeek,
          isOpen: true,
          OR: [{ teamMemberId: member.id }, { teamMemberId: null }],
        },
        orderBy: { teamMemberId: "desc" }, // prefer member-specific over tenant-wide
        select: { startTime: true, endTime: true },
      });

      const busyPeriods = await prisma.busyPeriod.findMany({
        where: {
          tenantId,
          teamMemberId: member.id,
          startAt: { gte: new Date(`${dateStr}T00:00:00Z`) },
          endAt: { lte: new Date(`${dateStr}T23:59:59Z`) },
        },
        select: { startAt: true, endAt: true },
      });

      const existingAppointments = await prisma.appointment.findMany({
        where: {
          tenantId,
          teamMemberId: member.id,
          deletedAt: null,
          status: {
            notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
          },
          startAt: { gte: new Date(`${dateStr}T00:00:00Z`) },
          endAt: { lte: new Date(`${dateStr}T23:59:59Z`) },
        },
        select: { startAt: true, endAt: true },
      });

      const slots = generateSlots({
        dateStr,
        timezone,
        workingHours,
        durationMinutes: service.duration,
        bufferMinutes: service.bufferTime,
        busyPeriods,
        existingAppointments,
      });

      for (const slot of slots) {
        allSlots.push({
          startAt: slot.startAt.toISOString(),
          endAt: slot.endAt.toISOString(),
          teamMemberId: member.id,
          teamMemberName: member.name,
        });
      }
    }

    // Sort by startAt
    allSlots.sort((a, b) => a.startAt.localeCompare(b.startAt));

    return NextResponse.json({ date: dateStr, slots: allSlots });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/internal/tenants/
git commit -m "feat: add GET /api/internal/tenants/:id/availability with multi-staff slot generation"
```

---

## Task 8: POST /api/internal/appointments

**Files:**
- Create: `src/app/api/internal/appointments/route.ts`
- Create: `src/__tests__/internal-api/appointments.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/internal-api/appointments.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findFirst: vi.fn() },
    customer: { findFirst: vi.fn() },
    service: { findFirst: vi.fn() },
    appointment: { findMany: vi.fn(), create: vi.fn() },
    notificationJob: { findFirst: vi.fn(), createMany: vi.fn() },
    analyticsEvent: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } },
}));

import { POST } from "@/app/api/internal/appointments/route";
import { prisma } from "@/lib/prisma";

const VALID_KEY = `Bearer ${process.env.N8N_API_KEY}`;

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/internal/appointments", {
    method: "POST",
    headers: { authorization: VALID_KEY, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  tenantId: "t1",
  customerId: "c1",
  serviceId: "svc1",
  teamMemberId: "tm1",
  startAt: "2026-06-24T14:00:00Z",
  endAt: "2026-06-24T15:00:00Z",
  bookedVia: "AI",
  conversationId: "conv1",
};

describe("POST /api/internal/appointments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for missing auth", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/internal/appointments", { method: "POST", body: "{}" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 409 SLOT_UNAVAILABLE when conflict detected", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        const tx = {
          ...prisma,
          tenant: { findFirst: vi.fn().mockResolvedValue({ id: "t1" }) },
          customer: { findFirst: vi.fn().mockResolvedValue({ id: "c1" }) },
          service: { findFirst: vi.fn().mockResolvedValue({ id: "svc1", duration: 60 }) },
          appointment: {
            findMany: vi.fn().mockResolvedValue([{ id: "existing" }]),
          },
        };
        return fn(tx);
      }
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("SLOT_UNAVAILABLE");
  });

  it("returns 200 with appointmentId on success", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        const tx = {
          ...prisma,
          tenant: { findFirst: vi.fn().mockResolvedValue({ id: "t1", aiSettings: { requireConfirm: false } }) },
          customer: { findFirst: vi.fn().mockResolvedValue({ id: "c1" }) },
          service: { findFirst: vi.fn().mockResolvedValue({ id: "svc1", duration: 60 }) },
          appointment: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue({ id: "appt1", status: "CONFIRMED", startAt: new Date("2026-06-24T14:00:00Z"), endAt: new Date("2026-06-24T15:00:00Z") }),
          },
          notificationJob: { findFirst: vi.fn().mockResolvedValue(null), createMany: vi.fn() },
          analyticsEvent: { create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return fn(tx);
      }
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.appointmentId).toBe("appt1");
    expect(json.status).toBe("CONFIRMED");
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test src/__tests__/internal-api/appointments.test.ts
```

Expected: `Cannot find module '@/app/api/internal/appointments/route'`

- [ ] **Step 3: Create the route**

```typescript
// src/app/api/internal/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireInternalAuth,
  requireTenant,
  errorResponse,
  InternalApiError,
} from "@/lib/internal-api/auth";
import {
  AppointmentStatus,
  AuditActorType,
  BookingChannel,
  NotificationChannel,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { addHours } from "date-fns";

const Schema = z.object({
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  serviceId: z.string().min(1),
  teamMemberId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  bookedVia: z.enum(["AI", "MANUAL", "SELF_SERVICE"]),
  conversationId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    await requireInternalAuth(request);

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const data = parsed.data;
    await requireTenant(data.tenantId);

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);

    const result = await prisma.$transaction(
      async (tx) => {
        // Validate customer, service exist
        const [customer, service, tenant] = await Promise.all([
          tx.customer.findFirst({ where: { id: data.customerId, tenantId: data.tenantId, deletedAt: null }, select: { id: true } }),
          tx.service.findFirst({ where: { id: data.serviceId, tenantId: data.tenantId, deletedAt: null }, select: { id: true, duration: true } }),
          tx.tenant.findFirst({ where: { id: data.tenantId, deletedAt: null }, select: { aiSettings: { select: { requireConfirm: true } } } }),
        ]);

        if (!customer) throw new InternalApiError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
        if (!service) throw new InternalApiError(404, "SERVICE_NOT_FOUND", "Service not found");

        // Slot conflict check (serializable tx prevents race)
        const conflicts = await tx.appointment.findMany({
          where: {
            tenantId: data.tenantId,
            teamMemberId: data.teamMemberId,
            deletedAt: null,
            status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          select: { id: true },
        });

        if (conflicts.length > 0) {
          throw new InternalApiError(409, "SLOT_UNAVAILABLE", "This slot is no longer available");
        }

        const requireConfirm = tenant?.aiSettings?.requireConfirm ?? false;
        const status = requireConfirm ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED;

        const appointment = await tx.appointment.create({
          data: {
            tenantId: data.tenantId,
            customerId: data.customerId,
            serviceId: data.serviceId,
            teamMemberId: data.teamMemberId,
            startAt,
            endAt,
            status,
            bookedVia: data.bookedVia as BookingChannel,
            conversationId: data.conversationId ?? null,
            notes: data.notes ?? null,
            ...(status === AppointmentStatus.CONFIRMED ? { confirmedAt: new Date() } : {}),
          },
          select: { id: true, status: true, startAt: true, endAt: true },
        });

        // Create notification jobs (skip if duplicate)
        const notifData = [
          { type: NotificationType.APPOINTMENT_CONFIRMATION, scheduledFor: new Date() },
          { type: NotificationType.APPOINTMENT_REMINDER_24H, scheduledFor: addHours(startAt, -24) },
          { type: NotificationType.APPOINTMENT_REMINDER_1H, scheduledFor: addHours(startAt, -1) },
          { type: NotificationType.STAFF_NEW_BOOKING, scheduledFor: new Date() },
        ];

        await tx.notificationJob.createMany({
          data: notifData.map((n) => ({
            tenantId: data.tenantId,
            type: n.type,
            channel: NotificationChannel.EMAIL,
            recipient: data.customerId, // placeholder — real recipient resolved by n8n from payload
            payload: {
              appointmentId: appointment.id,
              customerId: data.customerId,
              serviceId: data.serviceId,
              teamMemberId: data.teamMemberId,
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
            },
            scheduledFor: n.scheduledFor,
          })),
          skipDuplicates: true,
        });

        await tx.analyticsEvent.create({
          data: {
            tenantId: data.tenantId,
            event: "appointment.booked",
            properties: {
              channel: data.bookedVia,
              serviceId: data.serviceId,
              teamMemberId: data.teamMemberId,
            },
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: data.tenantId,
            actorType: AuditActorType.AI,
            action: "appointment.created",
            resource: "Appointment",
            resourceId: appointment.id,
            changes: { status, bookedVia: data.bookedVia },
          },
        });

        return appointment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({
      appointmentId: result.id,
      status: result.status,
      startAt: result.startAt.toISOString(),
      endAt: result.endAt.toISOString(),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test src/__tests__/internal-api/appointments.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/internal/appointments/route.ts src/__tests__/internal-api/appointments.test.ts
git commit -m "feat: add POST /api/internal/appointments with serializable conflict check and notification job creation"
```

---

## Task 9: POST /api/internal/customers/find-or-create

**Files:**
- Create: `src/app/api/internal/customers/find-or-create/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/internal/customers/find-or-create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, requireTenant, errorResponse } from "@/lib/internal-api/auth";

const Schema = z.object({
  tenantId: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  name: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireInternalAuth(request);

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const { tenantId, phone, email, name } = parsed.data;
    await requireTenant(tenantId);

    // Look up by phone first, then email
    const existing = await prisma.customer.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ customerId: existing.id, created: false });
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        phone: phone ?? null,
        email: email ?? null,
        name: name ?? phone ?? email ?? "Unknown",
      },
      select: { id: true },
    });

    return NextResponse.json({ customerId: customer.id, created: true });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/internal/customers/
git commit -m "feat: add POST /api/internal/customers/find-or-create"
```

---

## Task 10: POST /api/internal/notifications + POST /api/internal/analytics/events

**Files:**
- Create: `src/app/api/internal/notifications/route.ts`
- Create: `src/app/api/internal/analytics/events/route.ts`

- [ ] **Step 1: Create notifications route**

```typescript
// src/app/api/internal/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, requireTenant, errorResponse } from "@/lib/internal-api/auth";
import { NotificationChannel, NotificationType } from "@prisma/client";

const Schema = z.object({
  tenantId: z.string().min(1),
  type: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel),
  recipient: z.string().min(1),
  payload: z.record(z.unknown()),
  scheduledFor: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    await requireInternalAuth(request);

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const data = parsed.data;
    await requireTenant(data.tenantId);

    const job = await prisma.notificationJob.create({
      data: {
        tenantId: data.tenantId,
        type: data.type,
        channel: data.channel,
        recipient: data.recipient,
        payload: data.payload,
        scheduledFor: new Date(data.scheduledFor),
      },
      select: { id: true },
    });

    return NextResponse.json({ notificationJobId: job.id });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 2: Create analytics events route**

```typescript
// src/app/api/internal/analytics/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, requireTenant, errorResponse } from "@/lib/internal-api/auth";

const Schema = z.object({
  tenantId: z.string().min(1),
  event: z.string().min(1),
  properties: z.record(z.unknown()),
  occurredAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireInternalAuth(request);

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const { tenantId, event, properties, occurredAt } = parsed.data;
    await requireTenant(tenantId);

    await prisma.analyticsEvent.create({
      data: {
        tenantId,
        event,
        properties,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/app/api/internal/notifications/ src/app/api/internal/analytics/
git commit -m "feat: add POST /api/internal/notifications and POST /api/internal/analytics/events"
```

---

## Task 11: POST /api/webhooks/n8n

**Files:**
- Create: `src/app/api/webhooks/n8n/route.ts`
- Create: `src/__tests__/internal-api/webhooks-n8n.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/internal-api/webhooks-n8n.test.ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

import { POST } from "@/app/api/webhooks/n8n/route";

function signBody(body: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

const SECRET = process.env.N8N_WEBHOOK_SECRET!;

function makeRequest(body: object, overrideSignature?: string) {
  const bodyStr = JSON.stringify(body);
  const sig = overrideSignature ?? signBody(bodyStr, SECRET);
  return new NextRequest("http://localhost/api/webhooks/n8n", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-n8n-signature": sig,
    },
    body: bodyStr,
  });
}

describe("POST /api/webhooks/n8n", () => {
  it("returns 401 when signature is missing", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/n8n", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "test", tenantId: "t1", payload: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when signature is invalid", async () => {
    const res = await POST(makeRequest({ action: "test", tenantId: "t1", payload: {} }, "sha256=invalid"));
    expect(res.status).toBe(401);
  });

  it("returns 200 for valid signed payload", async () => {
    const res = await POST(makeRequest({ action: "conversation.updated", tenantId: "t1", payload: {} }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 422 for valid signature but missing action", async () => {
    const res = await POST(makeRequest({ tenantId: "t1", payload: {} }));
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test src/__tests__/internal-api/webhooks-n8n.test.ts
```

Expected: `Cannot find module '@/app/api/webhooks/n8n/route'`

- [ ] **Step 3: Create the webhook route**

```typescript
// src/app/api/webhooks/n8n/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

const Schema = z.object({
  action: z.string().min(1),
  tenantId: z.string().min(1),
  payload: z.record(z.unknown()),
});

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-n8n-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature", code: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { action, tenantId, payload } = parsed.data;

  // Phase 4A: skeleton — log and acknowledge
  // Phase 4B+: route actions to domain handlers
  console.log("[webhook/n8n]", { action, tenantId, keys: Object.keys(payload) });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test src/__tests__/internal-api/webhooks-n8n.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/webhooks/n8n/route.ts src/__tests__/internal-api/webhooks-n8n.test.ts
git commit -m "feat: add POST /api/webhooks/n8n skeleton with HMAC-SHA256 signature verification"
```

---

## Task 12: Settings → Integrations Page

**Files:**
- Create: `src/lib/actions/integrations.ts`
- Create: `src/app/(dashboard)/[tenant]/settings/integrations/page.tsx`
- Create: `src/components/settings/messaging-integration-form.tsx`

- [ ] **Step 1: Create server actions for MessagingIntegration**

```typescript
// src/lib/actions/integrations.ts
"use server";

import { revalidatePath } from "next/cache";
import { MessagingProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess, AuthError } from "@/lib/server-auth";
import { requirePermission } from "@/lib/permissions";
import { encrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";

export type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

export async function saveMessagingIntegration(
  tenantId: string,
  tenantSlug: string,
  data: {
    provider: MessagingProvider;
    instanceName: string;
    displayName: string;
    apiEndpoint: string;
    apiKey: string;
    phoneNumber?: string;
  }
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, role } = await requireTenantAccess(tenantId);
    requirePermission(role, "integrations.manage");

    if (!data.instanceName.trim()) {
      return { success: false, error: "Instance name is required" };
    }
    if (!data.apiKey.trim()) {
      return { success: false, error: "API key is required" };
    }

    const encryptedApiKey = encrypt(data.apiKey);

    const existing = await prisma.messagingIntegration.findFirst({
      where: { tenantId, provider: data.provider, deletedAt: null },
      select: { id: true },
    });

    let integrationId: string;

    if (existing) {
      await prisma.messagingIntegration.update({
        where: { id: existing.id },
        data: {
          instanceName: data.instanceName,
          displayName: data.displayName || null,
          apiEndpoint: data.apiEndpoint || null,
          apiKey: encryptedApiKey,
          phoneNumber: data.phoneNumber || null,
          isActive: true,
        },
      });
      integrationId = existing.id;
    } else {
      const integration = await prisma.messagingIntegration.create({
        data: {
          tenantId,
          provider: data.provider,
          instanceName: data.instanceName,
          displayName: data.displayName || null,
          apiEndpoint: data.apiEndpoint || null,
          apiKey: encryptedApiKey,
          phoneNumber: data.phoneNumber || null,
        },
        select: { id: true },
      });
      integrationId = integration.id;
    }

    void logAudit({
      tenantId,
      actorId: userId,
      action: existing ? "messaging_integration.updated" : "messaging_integration.created",
      resource: "MessagingIntegration",
      resourceId: integrationId,
    });

    revalidatePath(`/${tenantSlug}/settings/integrations`);
    return { success: true, data: { id: integrationId } };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to save integration" };
  }
}

export async function disableMessagingIntegration(
  tenantId: string,
  tenantSlug: string,
  integrationId: string
): Promise<ActionResult> {
  try {
    const { userId, role } = await requireTenantAccess(tenantId);
    requirePermission(role, "integrations.manage");

    await prisma.messagingIntegration.update({
      where: { id: integrationId, tenantId },
      data: { isActive: false },
    });

    void logAudit({
      tenantId,
      actorId: userId,
      action: "messaging_integration.disabled",
      resource: "MessagingIntegration",
      resourceId: integrationId,
    });

    revalidatePath(`/${tenantSlug}/settings/integrations`);
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to disable integration" };
  }
}
```

- [ ] **Step 2: Create the integrations settings page**

```typescript
// src/app/(dashboard)/[tenant]/settings/integrations/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MessagingIntegrationForm } from "@/components/settings/messaging-integration-form";

export const metadata: Metadata = { title: "Integrations" };

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function IntegrationsPage({ params }: Props) {
  const { tenant: slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!tenant) redirect("/login");

  const integration = await prisma.messagingIntegration.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
    select: {
      id: true,
      provider: true,
      instanceName: true,
      displayName: true,
      phoneNumber: true,
      apiEndpoint: true,
      isActive: true,
      lastConnectedAt: true,
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Integrations</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Connect WhatsApp to receive and send messages from the Inbox.
        </p>
      </div>
      <MessagingIntegrationForm
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        existing={integration}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create the form component**

```typescript
// src/components/settings/messaging-integration-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { saveMessagingIntegration, disableMessagingIntegration } from "@/lib/actions/integrations";

interface Existing {
  id: string;
  provider: string;
  instanceName: string;
  displayName: string | null;
  phoneNumber: string | null;
  apiEndpoint: string | null;
  isActive: boolean;
  lastConnectedAt: Date | null;
}

interface Props {
  tenantId: string;
  tenantSlug: string;
  existing: Existing | null;
}

interface FormValues {
  instanceName: string;
  displayName: string;
  apiEndpoint: string;
  apiKey: string;
  phoneNumber: string;
}

export function MessagingIntegrationForm({ tenantId, tenantSlug, existing }: Props) {
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      instanceName: existing?.instanceName ?? "",
      displayName: existing?.displayName ?? "",
      apiEndpoint: existing?.apiEndpoint ?? "",
      apiKey: "",
      phoneNumber: existing?.phoneNumber ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const result = await saveMessagingIntegration(tenantId, tenantSlug, {
        provider: "EVOLUTION_API",
        instanceName: values.instanceName,
        displayName: values.displayName,
        apiEndpoint: values.apiEndpoint,
        apiKey: values.apiKey,
        phoneNumber: values.phoneNumber || undefined,
      });
      if (result.success) {
        toast.success("WhatsApp integration saved");
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (!existing) return;
    setDisabling(true);
    try {
      const result = await disableMessagingIntegration(tenantId, tenantSlug, existing.id);
      if (result.success) {
        toast.success("Integration disabled");
      } else {
        toast.error(result.error);
      }
    } finally {
      setDisabling(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">WhatsApp via Evolution API</h3>
          {existing ? (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {existing.isActive ? (
                <span className="text-green-500">Connected</span>
              ) : (
                <span className="text-[var(--text-muted)]">Disconnected</span>
              )}
              {existing.phoneNumber && ` · ${existing.phoneNumber}`}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Not connected</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Instance Name</label>
          <input
            {...register("instanceName", { required: "Required" })}
            placeholder="acme-salon"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          {errors.instanceName && (
            <p className="text-xs text-red-500">{errors.instanceName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Display Name</label>
          <input
            {...register("displayName")}
            placeholder="Main WhatsApp"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">API Endpoint</label>
          <input
            {...register("apiEndpoint")}
            placeholder="https://your-evolution-api.example.com"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">API Key</label>
          <input
            {...register("apiKey", { required: "Required" })}
            type="password"
            placeholder={existing ? "Leave blank to keep existing key" : "Paste your Evolution API key"}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          {errors.apiKey && (
            <p className="text-xs text-red-500">{errors.apiKey.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Phone Number (optional)</label>
          <input
            {...register("phoneNumber")}
            placeholder="+14155551234"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? "Saving…" : existing ? "Update Integration" : "Connect WhatsApp"}
          </button>

          {existing && existing.isActive && (
            <button
              type="button"
              onClick={handleDisable}
              disabled={disabling}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {disabling ? "Disabling…" : "Disable"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Add Integrations link to settings nav**

Find the settings sidebar navigation (likely in `src/app/(dashboard)/[tenant]/settings/layout.tsx`) and add an entry:

```typescript
// Locate the nav items array and add:
{ href: `/${slug}/settings/integrations`, label: "Integrations" }
```

- [ ] **Step 5: TypeScript check + test build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/integrations.ts src/app/(dashboard)/[tenant]/settings/integrations/ src/components/settings/messaging-integration-form.tsx
git commit -m "feat: add Settings → Integrations page for WhatsApp (MessagingIntegration) CRUD"
```

---

## Task 13: Inbox WHATSAPP Channel Badge

**Files:**
- Modify: `src/app/(dashboard)/[tenant]/inbox/page.tsx` (or client component therein)

- [ ] **Step 1: Read the current inbox page**

```bash
cat "src/app/(dashboard)/[tenant]/inbox/page.tsx"
```

- [ ] **Step 2: Add channel badge to conversation list items**

Find where conversations are rendered in the inbox. Add a channel indicator:

```typescript
// After the customer name or subject line in each conversation row, add:
{conversation.channel === "WHATSAPP" && (
  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
    WhatsApp
  </span>
)}
{conversation.channel === "WEB_CHAT" && (
  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
    Web Chat
  </span>
)}
```

- [ ] **Step 3: Ensure inbox query selects `channel`**

Find the inbox query (likely `src/lib/inbox-queries.ts`) and verify `channel` is in the select. If not, add it.

- [ ] **Step 4: Verify UI renders correctly**

```bash
npm run dev
```

Open the Inbox page. Confirm WEB_CHAT conversations show the badge (WHATSAPP conversations only appear after Phase 4B n8n setup).

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/[tenant]/inbox/ src/lib/inbox-queries.ts
git commit -m "feat: add channel badge (WhatsApp/Web Chat) to Inbox conversation list"
```

---

## Task 14: Public Booking Page

**Files:**
- Create: `src/app/book/[tenant-slug]/page.tsx`
- Create: `src/app/book/[tenant-slug]/booking-client.tsx`

- [ ] **Step 1: Create the Server Component page**

```typescript
// src/app/book/[tenant-slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingClient } from "./booking-client";

interface Props {
  params: Promise<{ "tenant-slug": string }>;
}

export async function generateMetadata({ params }: Props) {
  const { "tenant-slug": slug } = await params;
  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { name: true },
  });
  return { title: tenant ? `Book with ${tenant.name}` : "Book Appointment" };
}

export default async function PublicBookingPage({ params }: Props) {
  const { "tenant-slug": slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, name: true, slug: true, logo: true, timezone: true },
  });
  if (!tenant) notFound();

  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, deletedAt: null, isActive: true },
    select: { id: true, name: true, description: true, duration: true, price: true, currency: true },
    orderBy: { name: "asc" },
  });

  if (services.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{tenant.name}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">No services available for booking at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-12">
      <div className="mx-auto max-w-xl px-4">
        <div className="mb-8 text-center">
          {tenant.logo && (
            <img src={tenant.logo} alt={tenant.name} className="mx-auto mb-4 h-12 w-auto" />
          )}
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{tenant.name}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Book your appointment online</p>
        </div>
        <BookingClient tenantId={tenant.id} tenantSlug={tenant.slug} timezone={tenant.timezone} services={services} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the multi-step booking client component**

```typescript
// src/app/book/[tenant-slug]/booking-client.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  currency: string;
}

interface Slot {
  startAt: string;
  endAt: string;
  teamMemberId: string;
  teamMemberName: string;
}

interface Props {
  tenantId: string;
  tenantSlug: string;
  timezone: string;
  services: Service[];
}

type Step = "service" | "date" | "slot" | "details" | "confirm";

interface BookingState {
  service: Service | null;
  date: string;
  slot: Slot | null;
  customerId: string | null;
  appointmentId: string | null;
}

interface DetailsFormValues {
  name: string;
  email: string;
  phone: string;
}

export function BookingClient({ tenantId, tenantSlug, timezone, services }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [booking, setBooking] = useState<BookingState>({
    service: null,
    date: "",
    slot: null,
    customerId: null,
    appointmentId: null,
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<DetailsFormValues>();

  async function fetchSlots(serviceId: string, date: string) {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await fetch(
        `/api/internal/tenants/${tenantId}/availability?serviceId=${serviceId}&date=${date}`,
        {
          headers: { authorization: "" }, // public booking page uses no auth — see note below
        }
      );
      // NOTE: The availability endpoint requires N8N_API_KEY. The public booking page
      // must call a dedicated public endpoint instead. See TODO below.
      if (!res.ok) throw new Error("Failed to fetch availability");
      const data = await res.json();
      setSlots(data.slots);
    } catch {
      setError("Could not load available times. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function onSubmitDetails(values: DetailsFormValues) {
    if (!booking.service || !booking.slot) return;
    setSubmitting(true);
    setError(null);
    try {
      // Find or create customer
      const customerRes = await fetch("/api/internal/customers/find-or-create", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "" },
        body: JSON.stringify({
          tenantId,
          phone: values.phone || null,
          email: values.email,
          name: values.name,
        }),
      });
      if (!customerRes.ok) throw new Error("Failed to create customer");
      const { customerId } = await customerRes.json();

      // Create appointment
      const apptRes = await fetch("/api/internal/appointments", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "" },
        body: JSON.stringify({
          tenantId,
          customerId,
          serviceId: booking.service.id,
          teamMemberId: booking.slot.teamMemberId,
          startAt: booking.slot.startAt,
          endAt: booking.slot.endAt,
          bookedVia: "SELF_SERVICE",
        }),
      });

      if (apptRes.status === 409) {
        setError("This slot was just taken. Please choose another time.");
        setStep("slot");
        fetchSlots(booking.service.id, booking.date);
        return;
      }
      if (!apptRes.ok) throw new Error("Failed to create appointment");

      const apptData = await apptRes.json();
      setBooking((b) => ({ ...b, customerId, appointmentId: apptData.appointmentId }));
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "confirm") {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">You're booked!</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {booking.service?.name} on{" "}
          {booking.slot && new Date(booking.slot.startAt).toLocaleString("en-US", {
            timeZone: timezone,
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          A confirmation will be sent to your email.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "service" && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">Select a service</h2>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => { setBooking((b) => ({ ...b, service: s })); setStep("date"); }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
                  {s.description && (
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{s.description}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{s.duration} min</p>
                </div>
                {s.price != null && (
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {Number(s.price).toFixed(2)} {s.currency}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "date" && booking.service && (
        <div className="space-y-4">
          <button onClick={() => setStep("service")} className="text-xs text-[var(--accent)]">← Back</button>
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">Select a date</h2>
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)]"
            onChange={(e) => {
              const date = e.target.value;
              setBooking((b) => ({ ...b, date }));
              if (date && booking.service) {
                fetchSlots(booking.service.id, date);
                setStep("slot");
              }
            }}
          />
        </div>
      )}

      {step === "slot" && (
        <div className="space-y-4">
          <button onClick={() => setStep("date")} className="text-xs text-[var(--accent)]">← Back</button>
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">
            Available times on {booking.date}
          </h2>
          {loadingSlots ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No availability on this day. Please choose another date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={`${slot.startAt}-${slot.teamMemberId}`}
                  onClick={() => { setBooking((b) => ({ ...b, slot })); setStep("details"); }}
                  className="rounded-md border border-[var(--border)] py-2 text-xs text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  {new Date(slot.startAt).toLocaleTimeString("en-US", {
                    timeZone: timezone,
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "details" && booking.slot && (
        <div className="space-y-4">
          <button onClick={() => setStep("slot")} className="text-xs text-[var(--accent)]">← Back</button>
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">Your details</h2>
          <form onSubmit={handleSubmit(onSubmitDetails)} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Name</label>
              <input
                {...register("name", { required: "Required" })}
                placeholder="Jane Doe"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Email</label>
              <input
                {...register("email", { required: "Required", pattern: { value: /^\S+@\S+$/, message: "Invalid email" } })}
                type="email"
                placeholder="jane@example.com"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Phone (optional)</label>
              <input
                {...register("phone")}
                type="tel"
                placeholder="+14155551234"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[var(--accent)] py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {submitting ? "Booking…" : "Confirm Booking"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

> **Important:** The booking client above calls `/api/internal/*` endpoints without an API key. This works during development but **must be replaced** before Phase 4F. The correct approach is to create a separate `/api/public/` route group that validates by slug and calls the internal API server-side. This is a Phase 4F hardening item.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Test the booking page manually**

```bash
npm run dev
```

Navigate to `/book/<your-tenant-slug>`. Verify services appear. Test navigation through the steps.

- [ ] **Step 5: Commit**

```bash
git add src/app/book/
git commit -m "feat: add public booking page /book/[tenant-slug] with multi-step form"
```

---

## Task 15: Env Var Validation at Startup (Phase 4F partial)

**Files:**
- Modify: `src/env.ts` (new file if it doesn't exist)
- Modify: entry point that runs at startup

- [ ] **Step 1: Create `src/env.ts`**

```typescript
// src/env.ts
// Called during Next.js server startup. Throws clearly if required vars are missing.
// Import this at the top of src/lib/prisma.ts or any guaranteed-loaded module.

const required: Record<string, string> = {
  DATABASE_URL: "Supabase database connection string",
  NEXT_PUBLIC_SUPABASE_URL: "Supabase project URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase anon key",
  SUPABASE_SERVICE_ROLE_KEY: "Supabase service role key (server only)",
  ENCRYPTION_KEY: "64-char hex string for AES-256-GCM (generate with: openssl rand -hex 32)",
  N8N_API_KEY: "Shared secret for internal API auth (generate with: openssl rand -hex 32)",
  N8N_WEBHOOK_SECRET: "HMAC secret for n8n webhook verification",
};

const missing = Object.entries(required)
  .filter(([key]) => !process.env[key])
  .map(([key, desc]) => `  ${key}: ${desc}`);

if (missing.length > 0 && process.env.NODE_ENV !== "test") {
  throw new Error(
    `Missing required environment variables:\n${missing.join("\n")}\n\nCheck your .env.local file.`
  );
}
```

- [ ] **Step 2: Import env.ts in `src/lib/prisma.ts`**

At the top of `src/lib/prisma.ts`, add:

```typescript
import "@/env";
```

- [ ] **Step 3: Verify build still passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds (env vars are set in your local `.env.local`).

- [ ] **Step 4: Commit**

```bash
git add src/env.ts src/lib/prisma.ts
git commit -m "feat: validate required environment variables at startup"
```

---

## Task 16: Server-Side Logout (Phase 4F partial)

**Files:**
- Create: `src/app/api/auth/logout/route.ts`
- Modify: logout button component (wherever it calls Supabase client-side signOut)

- [ ] **Step 1: Create server-side logout route**

```typescript
// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
```

- [ ] **Step 2: Find the logout button**

```bash
grep -r "signOut" src/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 3: Replace client-side signOut with form POST to server route**

In the component that calls `supabase.auth.signOut()`, replace with:

```typescript
// Replace client signOut call with:
<form action="/api/auth/logout" method="POST">
  <button type="submit" className="...">Sign out</button>
</form>
```

This invalidates the session on the server, not just the client.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/logout/route.ts
git commit -m "feat: add server-side logout endpoint to invalidate Supabase session on server"
```

---

## Final Phase 4A Verification

- [ ] **Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Build check**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Manual verification checklist**

Test each endpoint with `curl` or Bruno/Postman:

```bash
# Should return 401 (missing auth)
curl -X POST http://localhost:3000/api/internal/messaging/inbound \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"test"}'

# Should return 401 (missing signature)
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -d '{"action":"test","tenantId":"t1","payload":{}}'

# Should return 422 (missing fields) after adding correct auth
curl -X POST http://localhost:3000/api/internal/ai/chat \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"t1"}'
```

---

## Phase 4B–4D: n8n Workflows

These steps are done in the **n8n UI**, not in this codebase. After provisioning:

1. Add a Supabase credential (read-only connection string)
2. Add an HTTP Request credential with `Authorization: Bearer {N8N_API_KEY}` header preset
3. Build **WhatsApp Ingress** workflow: Evolution API webhook trigger → verify HMAC → `POST /messaging/inbound` → `POST /ai/chat` → send reply via Evolution API
4. Build **Notification Poller** workflow: Schedule trigger (60s) → query `NotificationJob WHERE status='PENDING' AND scheduledFor<=NOW()` → UPDATE to PROCESSING → send via Resend/Evolution API → UPDATE to SENT/FAILED
5. Build **Stuck Job Recovery** workflow: Schedule trigger (5min) → query `NotificationJob WHERE status='PROCESSING' AND lastAttemptAt < NOW()-5min` → UPDATE to PENDING

Refer to the Phase 4 architecture spec for sequence diagrams and SQL patterns.
