// src/app/api/internal/tenants/[tenantId]/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, requireTenant, errorResponse, InternalApiError } from "@/lib/internal-api/auth";
import { generateSlots } from "@/lib/internal-api/availability";
import { AppointmentStatus } from "@prisma/client";

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireInternalAuth(request);
    const { tenantId } = await params;
    await requireTenant(tenantId);

    const { searchParams } = request.nextUrl;
    const serviceId = searchParams.get("serviceId");
    const dateStr = searchParams.get("date"); // "YYYY-MM-DD"
    const teamMemberIdParam = searchParams.get("teamMemberId");

    if (!serviceId || !dateStr) {
      throw new InternalApiError(422, "VALIDATION_ERROR", "serviceId and date are required");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new InternalApiError(422, "VALIDATION_ERROR", "date must be YYYY-MM-DD");
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null, isActive: true },
      select: { duration: true, bufferTime: true },
    });
    if (!service) {
      throw new InternalApiError(404, "SERVICE_NOT_FOUND", "Service not found");
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { timezone: true },
    });
    const timezone = tenant?.timezone ?? "UTC";

    // Determine day of week for requested date in tenant timezone
    const dateMidnight = new Date(`${dateStr}T00:00:00Z`);
    const dayOfWeek = new Date(
      dateMidnight.toLocaleString("en-US", { timeZone: timezone })
    ).getDay();

    // Find team members to check (all or one)
    const teamMemberWhere = teamMemberIdParam
      ? { id: teamMemberIdParam, tenantId, deletedAt: null, isActive: true }
      : { tenantId, deletedAt: null, isActive: true, services: { some: { serviceId } } };

    const teamMembers = await prisma.teamMember.findMany({
      where: teamMemberWhere,
      select: { id: true, name: true },
    });

    const allSlots: Array<{
      startAt: string;
      endAt: string;
      teamMemberId: string;
      teamMemberName: string;
    }> = [];

    for (const member of teamMembers) {
      const workingHours = await prisma.workingHours.findFirst({
        where: {
          tenantId,
          dayOfWeek,
          isOpen: true,
          OR: [{ teamMemberId: member.id }, { teamMemberId: null }],
        },
        orderBy: { teamMemberId: "desc" }, // prefer member-specific over tenant-wide
        select: { startTime: true, endTime: true },
      });

      const busyPeriods = await prisma.busyPeriod.findMany({
        where: {
          tenantId,
          teamMemberId: member.id,
          startAt: { gte: new Date(`${dateStr}T00:00:00Z`) },
          endAt: { lte: new Date(`${dateStr}T23:59:59Z`) },
        },
        select: { startAt: true, endAt: true },
      });

      const existingAppointments = await prisma.appointment.findMany({
        where: {
          tenantId,
          teamMemberId: member.id,
          deletedAt: null,
          status: {
            notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
          },
          startAt: { gte: new Date(`${dateStr}T00:00:00Z`) },
          endAt: { lte: new Date(`${dateStr}T23:59:59Z`) },
        },
        select: { startAt: true, endAt: true },
      });

      const slots = generateSlots({
        dateStr,
        timezone,
        workingHours,
        durationMinutes: service.duration,
        bufferMinutes: service.bufferTime,
        busyPeriods,
        existingAppointments,
      });

      for (const slot of slots) {
        allSlots.push({
          startAt: slot.startAt.toISOString(),
          endAt: slot.endAt.toISOString(),
          teamMemberId: member.id,
          teamMemberName: member.name,
        });
      }
    }

    // Sort by startAt
    allSlots.sort((a, b) => a.startAt.localeCompare(b.startAt));

    return NextResponse.json({ date: dateStr, slots: allSlots });
  } catch (e) {
    return errorResponse(e);
  }
}
