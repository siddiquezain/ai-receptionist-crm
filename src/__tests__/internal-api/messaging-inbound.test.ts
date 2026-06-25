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

  it("returns 200 { ignored:true, reason:'fromMe' } and skips all DB work when fromMe is true", async () => {
    const res = await POST(makeRequest({ ...validBody, fromMe: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ignored: true, reason: "fromMe" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does NOT skip pipeline when fromMe is false — reaches DB transaction", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(makeHappyPathTx());
    });
    const res = await POST(makeRequest({ ...validBody, fromMe: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Must NOT be an ignored response
    expect(json.ignored).toBeUndefined();
    expect(json.reason).toBeUndefined();
    // Must have gone through the pipeline
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(json.isDuplicate).toBe(false);
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
