import { AppointmentStatus, ConversationStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { StatCardData } from "@/types";

// ─── Date helpers ────────────────────────────────────────────────────────────

/**
 * Returns UTC midnight boundaries for a day offset from today.
 * daysAgo=0 → today, daysAgo=1 → yesterday, etc.
 */
function utcDayRange(daysAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo + 1)
  );
  return { start, end };
}

// ─── Stat cards ──────────────────────────────────────────────────────────────

export async function getStatCards(tenantId: string): Promise<{
  appointmentsToday: StatCardData;
  pendingConfirmations: StatCardData;
  openConversations: StatCardData;
  conversionRate: StatCardData;
}> {
  const now = new Date();
  const today = utcDayRange(0);
  const yesterday = utcDayRange(1);

  const sixDaysAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
  );

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [
    apptToday,
    apptYesterday,
    apptLastSevenDays,
    pendingCount,
    openConvCount,
    newConvThisWeek,
    apptThisMonth,
    convThisMonth,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { tenantId, startAt: { gte: today.start, lt: today.end } },
    }),
    prisma.appointment.count({
      where: { tenantId, startAt: { gte: yesterday.start, lt: yesterday.end } },
    }),
    prisma.appointment.findMany({
      where: { tenantId, startAt: { gte: sixDaysAgo, lt: today.end } },
      select: { startAt: true },
    }),
    prisma.appointment.count({
      where: { tenantId, status: AppointmentStatus.PENDING },
    }),
    prisma.conversation.count({
      where: { tenantId, status: ConversationStatus.OPEN },
    }),
    prisma.conversation.count({
      where: { tenantId, createdAt: { gte: sixDaysAgo } },
    }),
    prisma.appointment.count({
      where: { tenantId, createdAt: { gte: monthStart } },
    }),
    prisma.conversation.count({
      where: { tenantId, createdAt: { gte: monthStart } },
    }),
  ]);

  // Build sparkline (appointments per UTC day, last 7 days)
  const sparklineMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
    );
    sparklineMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const appt of apptLastSevenDays) {
    const key = appt.startAt.toISOString().slice(0, 10);
    if (sparklineMap.has(key)) {
      sparklineMap.set(key, (sparklineMap.get(key) ?? 0) + 1);
    }
  }
  const apptSparkline = Array.from(sparklineMap.values());

  const rate = convThisMonth > 0
    ? Math.round((apptThisMonth / convThisMonth) * 100)
    : 0;

  return {
    appointmentsToday: {
      label: "Appointments Today",
      value: apptToday,
      delta: apptToday - apptYesterday,
      deltaLabel: "vs yesterday",
      sparkline: apptSparkline,
    },
    pendingConfirmations: {
      label: "Pending Confirmations",
      value: pendingCount,
      delta: 0,
      deltaLabel: "awaiting action",
      sparkline: Array(7).fill(0),
    },
    openConversations: {
      label: "Open Conversations",
      value: openConvCount,
      delta: newConvThisWeek,
      deltaLabel: "new this week",
      sparkline: Array(7).fill(0),
    },
    conversionRate: {
      label: "Booking Conversion",
      value: `${rate}%`,
      delta: 0,
      deltaLabel: "this month",
      sparkline: Array(7).fill(0),
    },
  };
}

// ─── Trend chart ─────────────────────────────────────────────────────────────

export type TrendDataPoint = { date: string; appointments: number };

export async function getTrendData(tenantId: string): Promise<TrendDataPoint[]> {
  const now = new Date();
  const sixDaysAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
  );
  const todayEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );

  const appointments = await prisma.appointment.findMany({
    where: { tenantId, startAt: { gte: sixDaysAgo, lt: todayEnd } },
    select: { startAt: true },
  });

  const dayMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
    );
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const appt of appointments) {
    const key = appt.startAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    }
  }

  return Array.from(dayMap.entries()).map(([iso, count]) => ({
    date: new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    appointments: count,
  }));
}

// ─── Upcoming appointments ───────────────────────────────────────────────────

export type UpcomingAppointment = {
  id: string;
  startAt: Date;
  status: AppointmentStatus;
  customer: { name: string };
  service: { name: string; duration: number };
  teamMember: { name: string } | null;
};

export async function getUpcomingAppointments(
  tenantId: string
): Promise<UpcomingAppointment[]> {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      startAt: { gte: new Date() },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] },
    },
    take: 5,
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      startAt: true,
      status: true,
      customer: { select: { name: true } },
      service: { select: { name: true, duration: true } },
      teamMember: { select: { name: true } },
    },
  }) as Promise<UpcomingAppointment[]>;
}

// ─── Inbox snapshot ──────────────────────────────────────────────────────────

export type InboxConversation = {
  id: string;
  updatedAt: Date;
  customer: { name: string; phone: string | null } | null;
  messages: Array<{ content: string; createdAt: Date }>;
};

export async function getInboxSnapshot(
  tenantId: string
): Promise<InboxConversation[]> {
  return prisma.conversation.findMany({
    where: { tenantId, status: ConversationStatus.OPEN },
    take: 3,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      updatedAt: true,
      customer: { select: { name: true, phone: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true },
      },
    },
  }) as Promise<InboxConversation[]>;
}
