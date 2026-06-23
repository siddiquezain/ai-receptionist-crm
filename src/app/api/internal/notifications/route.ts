// src/app/api/internal/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, requireTenant, errorResponse } from "@/lib/internal-api/auth";
import { NotificationChannel, NotificationType, Prisma } from "@prisma/client";

const Schema = z.object({
  tenantId: z.string().min(1),
  type: z.enum([
    "APPOINTMENT_CONFIRMATION",
    "APPOINTMENT_REMINDER_24H",
    "APPOINTMENT_REMINDER_1H",
    "APPOINTMENT_CANCELLED",
    "APPOINTMENT_RESCHEDULED",
    "FOLLOW_UP",
    "STAFF_NEW_BOOKING",
    "STAFF_CANCELLATION",
  ] as const),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "IN_APP"] as const),
  recipient: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
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
        type: data.type as NotificationType,
        channel: data.channel as NotificationChannel,
        recipient: data.recipient,
        payload: data.payload as unknown as Prisma.InputJsonValue,
        scheduledFor: new Date(data.scheduledFor),
      },
      select: { id: true },
    });

    return NextResponse.json({ notificationJobId: job.id });
  } catch (e) {
    return errorResponse(e);
  }
}
