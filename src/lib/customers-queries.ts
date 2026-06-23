import { AppointmentStatus, ConversationChannel, ConversationStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { SortOption } from "./sorting";

// ─── Exported types ───────────────────────────────────────────────────────────

export type CustomerListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  createdAt: Date;
  lastSeenAt: Date | null;
  _count: { appointments: number };
};

export type CustomerDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  notes: string | null;
  tags: string[];
  source: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
};

export type CustomerAppointmentItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  service: { name: string };
  teamMember: { name: string } | null;
};

export type CustomerConversationItem = {
  id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  createdAt: Date;
};

export type CustomerSortValue = "name" | "last_seen" | "appointments";

export const CUSTOMER_SORT_OPTIONS: SortOption<CustomerSortValue>[] = [
  { value: "name", label: "Name A→Z", defaultDir: "asc" },
  { value: "last_seen", label: "Recently seen", defaultDir: "desc" },
  { value: "appointments", label: "Most appointments", defaultDir: "desc" },
];

const CUSTOMER_ORDER_MAP: Record<
  CustomerSortValue,
  Prisma.CustomerOrderByWithRelationInput
> = {
  name: { name: "asc" },
  last_seen: { lastSeenAt: "desc" },
  appointments: { appointments: { _count: "desc" } },
};

export type CustomerFilters = {
  search?: string;
  page?: number;
  sort?: CustomerSortValue;
};

// ─── Query functions ──────────────────────────────────────────────────────────

export async function getCustomers(
  tenantId: string,
  filters: CustomerFilters = {}
): Promise<{ customers: CustomerListItem[]; hasMore: boolean }> {
  const { search, page = 1, sort = "name" } = filters;
  const take = page * 20;

  const where = {
    tenantId,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: true,
        createdAt: true,
        lastSeenAt: true,
        _count: { select: { appointments: true } },
      },
      orderBy: CUSTOMER_ORDER_MAP[sort],
      take,
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers, hasMore: total > take };
}

export async function getCustomerDetail(
  tenantId: string,
  id: string
): Promise<CustomerDetail | null> {
  return prisma.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      notes: true,
      tags: true,
      source: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });
}

export async function getCustomerAppointments(
  tenantId: string,
  customerId: string
): Promise<CustomerAppointmentItem[]> {
  return prisma.appointment.findMany({
    where: { tenantId, customerId, deletedAt: null },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      service: { select: { name: true } },
      teamMember: { select: { name: true } },
    },
    orderBy: { startAt: "desc" },
    take: 20,
  });
}

export async function getCustomerConversations(
  tenantId: string,
  customerId: string
): Promise<CustomerConversationItem[]> {
  return prisma.conversation.findMany({
    where: { tenantId, customerId, deletedAt: null },
    select: {
      id: true,
      channel: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
