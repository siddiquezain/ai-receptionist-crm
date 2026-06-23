// src/app/api/internal/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireInternalAuth,
  errorResponse,
  InternalApiError,
} from "@/lib/internal-api/auth";
import {
  AppointmentStatus,
  AuditActorType,
  BookingChannel,
  NotificationChannel,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { addHours } from "date-fns";

const Schema = z.object({
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  serviceId: z.string().min(1),
  teamMemberId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  bookedVia: z.enum(["AI", "MANUAL", "SELF_SERVICE"]),
  conversationId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);

    const result = await prisma.$transaction(
      async (tx) => {
        const [customer, service, tenant] = await Promise.all([
          tx.customer.findFirst({
            where: { id: data.customerId, tenantId: data.tenantId, deletedAt: null },
            select: { id: true },
          }),
          tx.service.findFirst({
            where: { id: data.serviceId, tenantId: data.tenantId, deletedAt: null },
            select: { id: true, duration: true },
          }),
          tx.tenant.findFirst({
            where: { id: data.tenantId, deletedAt: null },
            select: { aiSettings: { select: { requireConfirm: true } } },
          }),
        ]);

        if (!tenant) throw new InternalApiError(404, "TENANT_NOT_FOUND", "Tenant not found");
        if (!customer) throw new InternalApiError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
        if (!service) throw new InternalApiError(404, "SERVICE_NOT_FOUND", "Service not found");

        const conflicts = await tx.appointment.findMany({
          where: {
            tenantId: data.tenantId,
            teamMemberId: data.teamMemberId,
            deletedAt: null,
            status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          select: { id: true },
        });

        if (conflicts.length > 0) {
          throw new InternalApiError(409, "SLOT_UNAVAILABLE", "This slot is no longer available");
        }

        const requireConfirm = tenant?.aiSettings?.requireConfirm ?? false;
        const status = requireConfirm ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED;

        const appointment = await tx.appointment.create({
          data: {
            tenantId: data.tenantId,
            customerId: data.customerId,
            serviceId: data.serviceId,
            teamMemberId: data.teamMemberId,
            startAt,
            endAt,
            status,
            bookedVia: data.bookedVia as BookingChannel,
            conversationId: data.conversationId ?? null,
            notes: data.notes ?? null,
            ...(status === AppointmentStatus.CONFIRMED ? { confirmedAt: new Date() } : {}),
          },
          select: { id: true, status: true, startAt: true, endAt: true },
        });

        const notifData = [
          { type: NotificationType.APPOINTMENT_CONFIRMATION, scheduledFor: new Date() },
          { type: NotificationType.APPOINTMENT_REMINDER_24H, scheduledFor: addHours(startAt, -24) },
          { type: NotificationType.APPOINTMENT_REMINDER_1H, scheduledFor: addHours(startAt, -1) },
          { type: NotificationType.STAFF_NEW_BOOKING, scheduledFor: new Date() },
        ];

        await tx.notificationJob.createMany({
          data: notifData.map((n) => ({
            tenantId: data.tenantId,
            type: n.type,
            channel: NotificationChannel.EMAIL,
            recipient: data.customerId,
            payload: {
              appointmentId: appointment.id,
              customerId: data.customerId,
              serviceId: data.serviceId,
              teamMemberId: data.teamMemberId,
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
            },
            scheduledFor: n.scheduledFor,
          })),
          skipDuplicates: true,
        });

        await tx.analyticsEvent.create({
          data: {
            tenantId: data.tenantId,
            event: "appointment.booked",
            properties: {
              channel: data.bookedVia,
              serviceId: data.serviceId,
              teamMemberId: data.teamMemberId,
            },
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: data.tenantId,
            actorType: AuditActorType.AI,
            action: "appointment.created",
            resource: "Appointment",
            resourceId: appointment.id,
            changes: { status, bookedVia: data.bookedVia },
          },
        });

        return appointment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({
      appointmentId: result.id,
      status: result.status,
      startAt: result.startAt.toISOString(),
      endAt: result.endAt.toISOString(),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
