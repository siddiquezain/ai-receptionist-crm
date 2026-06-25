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
