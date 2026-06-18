"use server";

import { revalidatePath } from "next/cache";
import { AppointmentStatus, BookingChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppointmentDetail } from "@/lib/appointments-queries";
import type { AppointmentDetail } from "@/lib/appointments-queries";

export type ActionResult = { success: boolean; error?: string };

// ─── Read (called from Client Components) ────────────────────────────────────

export async function fetchAppointmentDetail(
  tenantId: string,
  appointmentId: string
): Promise<AppointmentDetail | null> {
  return getAppointmentDetail(tenantId, appointmentId);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function updateAppointment(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string,
  data: {
    serviceId: string;
    teamMemberId: string | null;
    startAt: string; // ISO string from datetime-local input
    endAt: string;
    notes: string;
    status: AppointmentStatus;
  }
): Promise<ActionResult> {
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
}

export async function updateAppointmentStatus(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string,
  status: AppointmentStatus
): Promise<ActionResult> {
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
}
