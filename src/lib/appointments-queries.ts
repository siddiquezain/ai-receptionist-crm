import { AppointmentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { SortOption } from "./sorting";

// ─── Exported types ───────────────────────────────────────────────────────────

export type AppointmentListItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  customer: { name: string } | null;
  service: { name: string; duration: number };
  teamMember: { name: string } | null;
};

export type AppointmentDetail = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  notes: string | null;
  bookedVia: string;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  conversationId: string | null;
  serviceId: string;
  teamMemberId: string | null;
  customer: { name: string; email: string | null; phone: string | null } | null;
  service: { name: string; duration: number };
  teamMember: { name: string } | null;
};

export type StaffOption = { id: string; name: string };
export type ServiceOption = { id: string; name: string; duration: number };
export type CustomerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type AppointmentSortValue = "date_desc" | "date_asc" | "customer" | "status";

export const APPOINTMENT_SORT_OPTIONS: SortOption<AppointmentSortValue>[] = [
  { value: "date_desc", label: "Newest first", defaultDir: "desc" },
  { value: "date_asc", label: "Oldest first", defaultDir: "asc" },
  { value: "customer", label: "Customer name", defaultDir: "asc" },
  { value: "status", label: "Status", defaultDir: "asc" },
];

const APPOINTMENT_ORDER_MAP: Record<
  AppointmentSortValue,
  Prisma.AppointmentOrderByWithRelationInput
> = {
  date_desc: { startAt: "desc" },
  date_asc: { startAt: "asc" },
  customer: { customer: { name: "asc" } },
  status: { status: "asc" },
};

export type AppointmentFilters = {
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
  staffId?: string;
  page?: number;
  q?: string;
  sort?: AppointmentSortValue;
  dir?: "asc" | "desc";
};

// ─── Query functions ──────────────────────────────────────────────────────────

export async function getAppointments(
  tenantId: string,
  filters: AppointmentFilters = {}
): Promise<{ appointments: AppointmentListItem[]; hasMore: boolean }> {
  const { status, from, to, staffId, page = 1, q, sort } = filters;

  if (from !== undefined && to !== undefined && from > to) {
    return { appointments: [], hasMore: false };
  }

  const take = page * 20;

  const where = {
    tenantId,
    deletedAt: null,
    ...(status !== undefined ? { status } : {}),
    ...(from !== undefined || to !== undefined
      ? {
          startAt: {
            ...(from !== undefined ? { gte: from } : {}),
            ...(to !== undefined ? { lte: to } : {}),
          },
        }
      : {}),
    ...(staffId !== undefined ? { teamMemberId: staffId } : {}),
    ...(q
      ? {
          OR: [
            { customer: { name: { contains: q, mode: "insensitive" as const } } },
            { customer: { phone: { contains: q, mode: "insensitive" as const } } },
            { service: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      take,
      orderBy: APPOINTMENT_ORDER_MAP[sort ?? "date_desc"],
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        customer: { select: { name: true } },
        service: { select: { name: true, duration: true } },
        teamMember: { select: { name: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    appointments: appointments as AppointmentListItem[],
    hasMore: total > take,
  };
}

export async function getAppointmentDetail(
  tenantId: string,
  appointmentId: string
): Promise<AppointmentDetail | null> {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId, deletedAt: null },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      notes: true,
      bookedVia: true,
      confirmedAt: true,
      cancelledAt: true,
      cancellationReason: true,
      conversationId: true,
      serviceId: true,
      teamMemberId: true,
      customer: { select: { name: true, email: true, phone: true } },
      service: { select: { name: true, duration: true } },
      teamMember: { select: { name: true } },
    },
  });

  if (!appt) return null;
  // bookedVia has a schema default (AI) so it's always present; cast from enum to string
  return { ...appt, bookedVia: String(appt.bookedVia) } as AppointmentDetail;
}

export async function getStaffOptions(tenantId: string): Promise<StaffOption[]> {
  return prisma.teamMember.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getServiceOptions(
  tenantId: string
): Promise<ServiceOption[]> {
  return prisma.service.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: { id: true, name: true, duration: true },
    orderBy: { name: "asc" },
  });
}

export async function getCustomerOptions(
  tenantId: string
): Promise<CustomerOption[]> {
  return prisma.customer.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
    take: 100,
  });
}
