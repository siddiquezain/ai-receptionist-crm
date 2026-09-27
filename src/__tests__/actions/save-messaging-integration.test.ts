/**
 * Regression test: saveMessagingIntegration must trim all string fields
 * before persisting them to the database.
 *
 * Bug history: instanceName (and other fields) were written verbatim from the
 * form submission, which allowed trailing ASCII spaces to be stored when users
 * copy-pasted values or browsers auto-filled with surrounding whitespace.
 * The empty-check guard used .trim() but the value passed to Prisma did not.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/server-auth", () => ({
  requireTenantAccess: vi.fn().mockResolvedValue({ userId: "u1", role: "OWNER" }),
  AuthError: class AuthError extends Error {},
}));

vi.mock("@/lib/permissions", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    messagingIntegration: {
      findFirst: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
    },
  },
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { saveMessagingIntegration } from "@/lib/actions/integrations";
import { prisma } from "@/lib/prisma";

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_INPUT = {
  provider:     "EVOLUTION_API" as const,
  instanceName: "acme-salon",
  displayName:  "Main WhatsApp",
  apiEndpoint:  "https://api.example.com",
  apiKey:       "secret-key",
  phoneNumber:  "+14155551234",
};

function mockCreate(id = "int-1") {
  vi.mocked(prisma.messagingIntegration.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.messagingIntegration.create).mockResolvedValue({ id } as any);
}

function mockUpdate(id = "int-1") {
  vi.mocked(prisma.messagingIntegration.findFirst).mockResolvedValue({ id } as any);
  vi.mocked(prisma.messagingIntegration.update).mockResolvedValue({ id } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("saveMessagingIntegration — whitespace trimming", () => {
  it("trims trailing spaces from instanceName before create", async () => {
    mockCreate();

    await saveMessagingIntegration("t1", "slug", {
      ...BASE_INPUT,
      instanceName: "acme-salon   ",
    });

    const created = vi.mocked(prisma.messagingIntegration.create).mock.calls[0][0];
    expect(created.data.instanceName).toBe("acme-salon");
  });

  it("trims trailing spaces from instanceName before update", async () => {
    mockUpdate();

    await saveMessagingIntegration("t1", "slug", {
      ...BASE_INPUT,
      instanceName: "acme-salon   ",
    });

    const updated = vi.mocked(prisma.messagingIntegration.update).mock.calls[0][0];
    expect(updated.data.instanceName).toBe("acme-salon");
  });

  it("trims leading and trailing spaces from instanceName", async () => {
    mockCreate();

    await saveMessagingIntegration("t1", "slug", {
      ...BASE_INPUT,
      instanceName: "  acme-salon  ",
    });

    const created = vi.mocked(prisma.messagingIntegration.create).mock.calls[0][0];
    expect(created.data.instanceName).toBe("acme-salon");
  });

  it("trims displayName before persistence", async () => {
    mockCreate();

    await saveMessagingIntegration("t1", "slug", {
      ...BASE_INPUT,
      displayName: "  Main WhatsApp  ",
    });

    const created = vi.mocked(prisma.messagingIntegration.create).mock.calls[0][0];
    expect(created.data.displayName).toBe("Main WhatsApp");
  });

  it("trims apiEndpoint before persistence", async () => {
    mockCreate();

    await saveMessagingIntegration("t1", "slug", {
      ...BASE_INPUT,
      apiEndpoint: "https://api.example.com   ",
    });

    const created = vi.mocked(prisma.messagingIntegration.create).mock.calls[0][0];
    expect(created.data.apiEndpoint).toBe("https://api.example.com");
  });

  it("trims phoneNumber before persistence", async () => {
    mockCreate();

    await saveMessagingIntegration("t1", "slug", {
      ...BASE_INPUT,
      phoneNumber: " +14155551234 ",
    });

    const created = vi.mocked(prisma.messagingIntegration.create).mock.calls[0][0];
    expect(created.data.phoneNumber).toBe("+14155551234");
  });

  it("returns error when instanceName is only whitespace", async () => {
    const result = await saveMessagingIntegration("t1", "slug", {
      ...BASE_INPUT,
      instanceName: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/instance name/i);
    }
    expect(prisma.messagingIntegration.create).not.toHaveBeenCalled();
    expect(prisma.messagingIntegration.update).not.toHaveBeenCalled();
  });

  it("returns error when apiKey is only whitespace", async () => {
    const result = await saveMessagingIntegration("t1", "slug", {
      ...BASE_INPUT,
      apiKey: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/api key/i);
    }
    expect(prisma.messagingIntegration.create).not.toHaveBeenCalled();
  });
});
