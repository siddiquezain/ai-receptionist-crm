"use server";

import { revalidatePath } from "next/cache";
import { AppointmentStatus, BookingChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess, AuthError } from "@/lib/server-auth";
import { requirePermission } from "@/lib/permissions";
import { getAppointmentDetail } from "@/lib/appointments-queries";
import type { AppointmentDetail } from "@/lib/appointments-queries";

export type ActionResult = { success: boolean; error?: string };

export async function fetchAppointmentDetail(
  tenantId: string,
  appointmentId: string
): Promise<AppointmentDetail | null> {
  await requireTenantAccess(tenantId);
  return getAppointmentDetail(tenantId, appointmentId);
}

export async function updateAppointment(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string,
  data: {
    serviceId: string;
    teamMemberId: string | null;
    startAt: string;
    endAt: string;
    notes: string;
    status: AppointmentStatus;
  }
): Promise<ActionResult> {
  try {
    const { role } = await requireTenantAccess(tenantId);
    requirePermission(role, "appointments.manage_all");

    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Appointment not found" };

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    if (endAt <= startAt) {
      return { success: false, error: "End time must be after start time" };
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        serviceId: data.serviceId,
        teamMemberId: data.teamMemberId || null,
        startAt,
        endAt,
        notes: data.notes || null,
        status: data.status,
        ...(data.status === AppointmentStatus.CONFIRMED
          ? { confirmedAt: new Date() }
          : {}),
        ...(data.status === AppointmentStatus.CANCELLED
          ? { cancelledAt: new Date() }
          : {}),
      },
    });

    revalidatePath(`/${tenantSlug}/appointments`);
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to update appointment" };
  }
}

export async function createAppointment(
  tenantId: string,
  tenantSlug: string,
  data: {
    customerId: string;
    serviceId: string;
    teamMemberId: string | null;
    startAt: string;
    endAt: string;
    notes: string;
  }
): Promise<ActionResult> {
  try {
    const { role } = await requireTenantAccess(tenantId);
    requirePermission(role, "appointments.manage_all");

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    if (endAt <= startAt) {
      return { success: false, error: "End time must be after start time" };
    }

    await prisma.appointment.create({
      data: {
        tenantId,
        customerId: data.customerId,
        serviceId: data.serviceId,
        teamMemberId: data.teamMemberId || null,
        startAt,
        endAt,
        notes: data.notes || null,
        status: AppointmentStatus.PENDING,
        bookedVia: BookingChannel.MANUAL,
      },
    });

    revalidatePath(`/${tenantSlug}/appointments`);
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to create appointment" };
  }
}

export async function updateAppointmentStatus(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string,
  status: AppointmentStatus
): Promise<ActionResult> {
  try {
    const { role } = await requireTenantAccess(tenantId);
    requirePermission(role, "appointments.manage_all");

    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Appointment not found" };

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        ...(status === AppointmentStatus.CONFIRMED ? { confirmedAt: new Date() } : {}),
        ...(status === AppointmentStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
      },
    });

    revalidatePath(`/${tenantSlug}/appointments`);
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to update appointment status" };
  }
}
