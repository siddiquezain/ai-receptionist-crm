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
