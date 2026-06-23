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
