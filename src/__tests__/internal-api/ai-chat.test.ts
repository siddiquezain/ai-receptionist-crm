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
