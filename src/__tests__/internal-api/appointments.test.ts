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
