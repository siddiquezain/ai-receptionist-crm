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
