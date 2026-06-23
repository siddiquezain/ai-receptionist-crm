// src/app/api/internal/analytics/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, requireTenant, errorResponse } from "@/lib/internal-api/auth";
import { Prisma } from "@prisma/client";

const Schema = z.object({
  tenantId: z.string().min(1),
  event: z.string().min(1),
  properties: z.record(z.string(), z.unknown()),
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
        properties: properties as unknown as Prisma.InputJsonValue,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
