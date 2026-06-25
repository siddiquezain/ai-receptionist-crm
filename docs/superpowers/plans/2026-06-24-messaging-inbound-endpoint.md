# Messaging Inbound Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `POST /api/internal/messaging/inbound` to consume the normalized n8n payload, with authentication, `fromMe` guarding, provider-aware routing, idempotency, find-or-create customer/conversation, message persistence, and structured logging.

**Architecture:** In-place rewrite of the existing route and test file only. No new files, no new abstractions, no schema migration. Business logic lives entirely in the route handler inside a single Prisma transaction. Execution order is: auth → validate → fromMe guard → provider switch → Prisma transaction (tenant resolve → idempotency check → find/create customer → find/create conversation → save message) → return 200.

**Tech Stack:** Next.js App Router (Route Handler), Zod, Prisma, Vitest with mocked Prisma.

---

## Files

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/app/api/internal/messaging/inbound/route.ts` | The route handler — full rewrite |
| Modify | `src/__tests__/internal-api/messaging-inbound.test.ts` | Tests — full rewrite to new payload shape |

No other files change. Auth helper, Prisma schema, env vars, Zod, and Vitest config are all unchanged.

---

## Task 1: Rewrite the test file (TDD — tests fail first)

Write all tests against the new payload shape **before** touching the route. They will all fail because the route still uses the old schema. That's the point.

**Files:**
- Modify: `src/__tests__/internal-api/messaging-inbound.test.ts`

- [ ] **Step 1.1: Replace the entire test file**

Replace `src/__tests__/internal-api/messaging-inbound.test.ts` with:

```typescript
// src/__tests__/internal-api/messaging-inbound.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    messagingIntegration: { findUnique: vi.fn() },
    customer: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    conversation: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    message: { findUnique: vi.fn(), create: vi.fn() },
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
  provider: "evolution",
  event: "messages.upsert",
  instance: "test_tenant",
  instanceId: "77fe2b51-779d-4cb1-8f36-ae03b65b616f",
  externalMessageId: "AC87C2EC3508DD8ABCECEDB577BA8CFA",
  customerPhone: "919398581237",
  customerName: "MMK",
  messageType: "conversation",
  text: "Hello",
  timestamp: 1782295359,
  source: "android",
  fromMe: false,
};

/**
 * Builds a complete in-transaction mock.
 * All fields default to "not found" (null), override per test.
 */
function makeHappyPathTx(overrides: {
  existingCustomer?: object | null;
  existingConversation?: object | null;
  existingMessage?: object | null;
} = {}) {
  const {
    existingCustomer = null,
    existingConversation = null,
    existingMessage = null,
  } = overrides;

  return {
    messagingIntegration: {
      findUnique: vi.fn().mockResolvedValue({
        id: "mi1",
        tenantId: "t1",
        isActive: true,
      }),
    },
    message: {
      findUnique: vi.fn().mockResolvedValue(existingMessage),
      create: vi.fn().mockResolvedValue({ id: "msg1" }),
    },
    customer: {
      findFirst: vi.fn().mockResolvedValue(existingCustomer),
      create: vi.fn().mockResolvedValue({ id: "c1" }),
      update: vi.fn().mockResolvedValue({ id: "c1" }),
    },
    conversation: {
      findFirst: vi.fn().mockResolvedValue(existingConversation),
      findUnique: vi.fn().mockResolvedValue({ id: "conv1", customerId: "c1" }),
      create: vi.fn().mockResolvedValue({ id: "conv1" }),
    },
  };
}

describe("POST /api/internal/messaging/inbound", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Authentication ──────────────────────────────────────────────────────────

  it("returns 401 for missing auth header", async () => {
    const res = await POST(makeRequest(validBody, ""));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("INVALID_API_KEY");
  });

  it("returns 401 for wrong API key", async () => {
    const res = await POST(makeRequest(validBody, "Bearer wrong-key-here"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("INVALID_API_KEY");
  });

  // ── Payload validation ──────────────────────────────────────────────────────

  it("returns 400 VALIDATION_ERROR when externalMessageId is missing", async () => {
    const { externalMessageId: _omit, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when customerPhone is missing", async () => {
    const { customerPhone: _omit, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when timestamp is a string instead of a number", async () => {
    const res = await POST(makeRequest({ ...validBody, timestamp: "not-a-number" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when fromMe is missing", async () => {
    const { fromMe: _omit, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  // ── fromMe guard ────────────────────────────────────────────────────────────

  it("returns 200 { ignored: true } and skips all DB work when fromMe is true", async () => {
    const res = await POST(makeRequest({ ...validBody, fromMe: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ignored: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ── Provider switch ─────────────────────────────────────────────────────────

  it("returns 400 UNSUPPORTED_PROVIDER for an unknown provider", async () => {
    const res = await POST(makeRequest({ ...validBody, provider: "meta" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("UNSUPPORTED_PROVIDER");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ── Tenant resolution ───────────────────────────────────────────────────────

  it("returns 404 INTEGRATION_NOT_FOUND when no matching MessagingIntegration", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn({
          messagingIntegration: { findUnique: vi.fn().mockResolvedValue(null) },
        });
      }
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("INTEGRATION_NOT_FOUND");
  });

  it("returns 409 INTEGRATION_INACTIVE when integration exists but isActive is false", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn({
          messagingIntegration: {
            findUnique: vi.fn().mockResolvedValue({
              id: "mi1",
              tenantId: "t1",
              isActive: false,
            }),
          },
        });
      }
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("INTEGRATION_INACTIVE");
  });

  // ── Idempotency ─────────────────────────────────────────────────────────────

  it("returns 200 isDuplicate:true without creating records when externalMessageId already exists", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn(
          makeHappyPathTx({
            existingMessage: { id: "msg1", conversationId: "conv1" },
          })
        );
      }
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isDuplicate).toBe(true);
    expect(json.messageId).toBe("msg1");
    expect(json.conversationId).toBe("conv1");
  });

  // ── Happy path: new customer + new conversation ─────────────────────────────

  it("creates customer, conversation, and message; returns isNewConversation:true on first message", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn(makeHappyPathTx());
      }
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isDuplicate).toBe(false);
    expect(json.isNewConversation).toBe(true);
    expect(json.messageId).toBe("msg1");
    expect(json.customerId).toBe("c1");
    expect(json.conversationId).toBe("conv1");
    expect(json.tenantId).toBe("t1");
    expect(json.messagingIntegrationId).toBe("mi1");
  });

  // ── Happy path: existing customer + existing conversation ───────────────────

  it("reuses existing customer and conversation; returns isNewConversation:false", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn(
          makeHappyPathTx({
            existingCustomer: { id: "c1" },
            existingConversation: { id: "conv1" },
          })
        );
      }
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isDuplicate).toBe(false);
    expect(json.isNewConversation).toBe(false);
    expect(json.customerId).toBe("c1");
    expect(json.conversationId).toBe("conv1");
  });
});
```

- [ ] **Step 1.2: Run tests — confirm they all fail**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx vitest run src/__tests__/internal-api/messaging-inbound.test.ts 2>&1
```

Expected: Multiple failures. The old route uses `instanceName`/`from`/`body` fields that the new `validBody` doesn't send. If tests pass at this stage, something is wrong — stop and investigate.

---

## Task 2: Rewrite the route implementation

Now make those tests pass.

**Files:**
- Modify: `src/app/api/internal/messaging/inbound/route.ts`

- [ ] **Step 2.1: Replace the entire route file**

Replace `src/app/api/internal/messaging/inbound/route.ts` with:

```typescript
// src/app/api/internal/messaging/inbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireInternalAuth,
  errorResponse,
  InternalApiError,
} from "@/lib/internal-api/auth";
import {
  ConversationChannel,
  ConversationStatus,
  MessageRole,
  MessagingProvider,
} from "@prisma/client";

// ── Normalized n8n payload schema ─────────────────────────────────────────────
// Field mapping from normalized payload → DB:
//   instance        → MessagingIntegration.instanceName  (lookup key)
//   instanceId      → informational only, not persisted in Phase 4A
//   customerPhone   → Customer.phone
//   customerName    → Customer.name  (on creation only)
//   text            → Message.content
//   externalMessageId → Message.externalId  (idempotency key)
const Schema = z.object({
  provider: z.string().min(1),
  event: z.string().min(1),
  instance: z.string().min(1),
  instanceId: z.string().optional(),
  externalMessageId: z.string().min(1),
  customerPhone: z.string().min(1),
  customerName: z.string().optional(),
  messageType: z.string().min(1),
  text: z.string(),
  timestamp: z.number().int(),
  source: z.string().optional(),
  fromMe: z.boolean(),
});

export async function POST(request: NextRequest) {
  const startMs = Date.now();

  try {
    // 1. Authenticate
    await requireInternalAuth(request);

    // 2. Validate payload
    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    console.log("[messaging/inbound] received", {
      provider: data.provider,
      instance: data.instance,
      instanceId: data.instanceId ?? null,
      externalMessageId: data.externalMessageId,
      customerPhone: `****${data.customerPhone.slice(-4)}`,
      fromMe: data.fromMe,
    });

    // 3. fromMe guard — outbound messages must not be processed
    if (data.fromMe) {
      console.log("[messaging/inbound] ignored", {
        externalMessageId: data.externalMessageId,
        durationMs: Date.now() - startMs,
        result: "ignored",
      });
      return NextResponse.json({ ignored: true });
    }

    // 4. Provider switch — route to provider-specific logic
    switch (data.provider) {
      case "evolution":
        break;
      default:
        throw new InternalApiError(
          400,
          "UNSUPPORTED_PROVIDER",
          `Provider "${data.provider}" is not supported`
        );
    }

    // 5–9. All DB work runs in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 5. Resolve tenant via MessagingIntegration.instanceName
      const integration = await tx.messagingIntegration.findUnique({
        where: {
          provider_instanceName: {
            provider: MessagingProvider.EVOLUTION_API,
            instanceName: data.instance,
          },
        },
        select: { id: true, tenantId: true, isActive: true },
      });

      if (!integration) {
        throw new InternalApiError(
          404,
          "INTEGRATION_NOT_FOUND",
          "No integration found for this instance"
        );
      }
      if (!integration.isActive) {
        throw new InternalApiError(
          409,
          "INTEGRATION_INACTIVE",
          "Integration is inactive"
        );
      }

      const { tenantId } = integration;

      // 6. Idempotency — skip if this externalMessageId was already processed
      const existingMessage = await tx.message.findUnique({
        where: { externalId: data.externalMessageId },
        select: { id: true, conversationId: true },
      });

      if (existingMessage) {
        const conv = await tx.conversation.findUnique({
          where: { id: existingMessage.conversationId },
          select: { id: true, customerId: true },
        });

        console.log("[messaging/inbound] duplicate", {
          externalMessageId: data.externalMessageId,
          tenantId,
          durationMs: Date.now() - startMs,
          result: "duplicate",
        });

        return {
          tenantId,
          customerId: conv?.customerId ?? null,
          conversationId: existingMessage.conversationId,
          messageId: existingMessage.id,
          messagingIntegrationId: integration.id,
          isNewConversation: false,
          isDuplicate: true,
        };
      }

      // 7. Find or create Customer by (tenantId, customerPhone)
      let customer = await tx.customer.findFirst({
        where: { tenantId, phone: data.customerPhone, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            tenantId,
            phone: data.customerPhone,
            name: data.customerName ?? data.customerPhone,
          },
          select: { id: true },
        });
      } else {
        await tx.customer.update({
          where: { id: customer.id },
          data: { lastSeenAt: new Date() },
        });
      }

      // 8. Find or create Conversation by (tenantId, externalId, channel)
      //    externalId is scoped per-instance and per-phone so each customer
      //    gets one continuous thread per Evolution instance.
      const convExternalId = `${data.instance}:${data.customerPhone}`;
      let conversation = await tx.conversation.findFirst({
        where: {
          tenantId,
          externalId: convExternalId,
          channel: ConversationChannel.WHATSAPP,
          deletedAt: null,
        },
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

      // 9. Save Message
      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.USER,
          content: data.text,
          externalId: data.externalMessageId,
        },
        select: { id: true },
      });

      return {
        tenantId,
        customerId: customer.id,
        conversationId: conversation.id,
        messageId: message.id,
        messagingIntegrationId: integration.id,
        isNewConversation,
        isDuplicate: false,
      };
    });

    console.log("[messaging/inbound] processed", {
      provider: data.provider,
      instance: data.instance,
      tenantId: result.tenantId,
      externalMessageId: data.externalMessageId,
      isNewConversation: result.isNewConversation,
      durationMs: Date.now() - startMs,
      result: "processed",
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[messaging/inbound] error", {
      durationMs: Date.now() - startMs,
      result: "error",
      error: e instanceof Error ? e.message : String(e),
    });
    return errorResponse(e);
  }
}
```

---

## Task 3: Run tests — confirm all pass

**Files:** (read-only verification)

- [ ] **Step 3.1: Run the messaging inbound test suite**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx vitest run src/__tests__/internal-api/messaging-inbound.test.ts 2>&1
```

Expected output (all green):

```
✓ returns 401 for missing auth header
✓ returns 401 for wrong API key
✓ returns 400 VALIDATION_ERROR when externalMessageId is missing
✓ returns 400 VALIDATION_ERROR when customerPhone is missing
✓ returns 400 VALIDATION_ERROR when timestamp is a string instead of a number
✓ returns 400 VALIDATION_ERROR when fromMe is missing
✓ returns 200 { ignored: true } and skips all DB work when fromMe is true
✓ returns 400 UNSUPPORTED_PROVIDER for an unknown provider
✓ returns 404 INTEGRATION_NOT_FOUND when no matching MessagingIntegration
✓ returns 409 INTEGRATION_INACTIVE when integration exists but isActive is false
✓ returns 200 isDuplicate:true without creating records when externalMessageId already exists
✓ creates customer, conversation, and message; returns isNewConversation:true on first message
✓ reuses existing customer and conversation; returns isNewConversation:false

Test Files  1 passed (1)
Tests  13 passed (13)
```

If any test fails, read the error output carefully, fix the mismatch (do not change the test to match a wrong implementation), and re-run.

- [ ] **Step 3.2: Run the full test suite — confirm no regressions**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx vitest run 2>&1
```

Expected: All existing tests continue to pass. The count may differ but there should be 0 failures. If any pre-existing test now fails, investigate before proceeding — do not commit with a regression.

---

## Task 4: TypeScript check — confirm no type errors

- [ ] **Step 4.1: Run tsc**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1
```

Expected: No errors. If type errors appear, fix them before committing. Common issues to watch for:
- `MessagingProvider.EVOLUTION_API` import missing
- `prisma.$transaction` callback type mismatch (use `typeof fn === "function"` guard in tests)

---

## Task 5: Commit

- [ ] **Step 5.1: Stage only the two changed files and commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add \
  src/app/api/internal/messaging/inbound/route.ts \
  src/__tests__/internal-api/messaging-inbound.test.ts \
  docs/superpowers/specs/2026-06-24-messaging-inbound-endpoint-design.md \
  docs/superpowers/plans/2026-06-24-messaging-inbound-endpoint.md \
  && git commit -m "feat: rewrite messaging inbound endpoint for normalized n8n payload

- Update Zod schema to consume normalized n8n payload fields
  (instance, customerPhone, customerName, text, timestamp as int, fromMe)
- Add fromMe guard: return 200 { ignored: true } for outbound messages
- Add provider switch: 400 UNSUPPORTED_PROVIDER for unknown providers
- Remove Phase 4B+ code (analytics events, autoBook/requireConfirm)
- Use customerName on new Customer creation instead of phone as name
- Add structured logging (provider, instance, externalMessageId, durationMs)
- Rewrite tests: 13 cases covering auth, validation, fromMe, provider,
  tenant resolution, idempotency, happy path new+existing customer/conversation"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|-----------------|-----------|
| Auth with `N8N_API_KEY` | Task 2 route, Task 1 tests (auth cases) |
| Zod validation, 400 response | Task 2 route, Task 1 tests (validation cases) |
| `fromMe` guard → `{ ignored: true }` | Task 2 route, Task 1 test |
| Provider switch with `UNSUPPORTED_PROVIDER` | Task 2 route, Task 1 test |
| Resolve tenant via `instanceName` | Task 2 route, Task 1 tests (404, 409) |
| `instanceId` informational only | Task 2 route (accepted in schema, logged, not persisted) |
| Idempotency via `externalMessageId` | Task 2 route, Task 1 test (duplicate) |
| Find/create customer with `customerName` | Task 2 route, Task 1 tests (happy path) |
| Find/create conversation | Task 2 route, Task 1 tests (happy path) |
| Save message | Task 2 route, Task 1 tests (happy path) |
| Structured logging | Task 2 route |
| No analytics, AI, booking, notifications | Verified: removed from route |
| `200 OK` clean JSON response | Task 2 route, all passing tests |
