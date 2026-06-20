import { prisma } from "./prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingDataPoint = {
  date: string;
  booked: number;
  completed: number;
  cancelled: number;
};

export type RevenueDataPoint = {
  date: string;
  revenue: number;
};

export type AIPerformanceData = {
  conversations: number;
  aiHandled: number;
  escalated: number;
  booked: number;
  conversionRate: number;
};

export type PeakHoursPoint = {
  dayOfWeek: number; // 0 = Sun
  hour: number;      // 0–23
  count: number;
};

export type ServiceBreakdown = {
  name: string;
  count: number;
  revenue: number;
};

export type StaffPerformanceRow = {
  id: string;
  name: string;
  completed: number;
  cancelled: number;
  noShow: number;
  total: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayRange(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cur <= end) {
    days.push(isoDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

// ─── Booking overview ─────────────────────────────────────────────────────────

export async function getBookingOverview(
  tenantId: string,
  from: Date,
  to: Date
): Promise<BookingDataPoint[]> {
  const appointments = await prisma.appointment.findMany({
    where: { tenantId, createdAt: { gte: from, lte: to } },
    select: { createdAt: true, status: true },
  });

  const days = dayRange(from, to);
  const map = new Map<string, { booked: number; completed: number; cancelled: number }>(
    days.map((d) => [d, { booked: 0, completed: 0, cancelled: 0 }])
  );

  for (const appt of appointments) {
    const key = isoDate(appt.createdAt);
    const entry = map.get(key);
    if (!entry) continue;
    entry.booked += 1;
    if (appt.status === "COMPLETED") entry.completed += 1;
    if (appt.status === "CANCELLED") entry.cancelled += 1;
  }

  return days.map((d) => {
    const e = map.get(d)!;
    const label = new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return { date: label, ...e };
  });
}

// ─── Revenue ──────────────────────────────────────────────────────────────────

export async function getRevenueData(
  tenantId: string,
  from: Date,
  to: Date
): Promise<RevenueDataPoint[]> {
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      startAt: { gte: from, lte: to },
    },
    select: { startAt: true, service: { select: { price: true } } },
  });

  const days = dayRange(from, to);
  const map = new Map<string, number>(days.map((d) => [d, 0]));

  for (const appt of appointments) {
    const key = isoDate(appt.startAt);
    const price = Number(appt.service?.price ?? 0);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + price);
    }
  }

  return days.map((d) => {
    const label = new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return { date: label, revenue: Math.round((map.get(d) ?? 0) * 100) / 100 };
  });
}

// ─── AI performance ───────────────────────────────────────────────────────────

export async function getAIPerformance(
  tenantId: string,
  from: Date,
  to: Date
): Promise<AIPerformanceData> {
  const [conversations, escalated, appointments] = await Promise.all([
    prisma.conversation.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      select: { aiHandled: true, status: true },
    }),
    prisma.conversation.count({
      where: { tenantId, status: "ESCALATED", createdAt: { gte: from, lte: to } },
    }),
    prisma.appointment.count({
      where: {
        tenantId,
        bookedVia: "AI",
        createdAt: { gte: from, lte: to },
      },
    }),
  ]);

  const total = conversations.length;
  const aiHandled = conversations.filter((c) => c.aiHandled).length;
  const rate = total > 0 ? Math.round((appointments / total) * 100) : 0;

  return {
    conversations: total,
    aiHandled,
    escalated,
    booked: appointments,
    conversionRate: rate,
  };
}

// ─── Peak hours ───────────────────────────────────────────────────────────────

export async function getPeakHours(
  tenantId: string,
  from: Date,
  to: Date
): Promise<PeakHoursPoint[]> {
  const appointments = await prisma.appointment.findMany({
    where: { tenantId, startAt: { gte: from, lte: to } },
    select: { startAt: true },
  });

  const grid = new Map<string, number>();

  for (const appt of appointments) {
    const d = appt.startAt;
    const dow = d.getUTCDay();
    const hour = d.getUTCHours();
    const key = `${dow}:${hour}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }

  const points: PeakHoursPoint[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      points.push({ dayOfWeek: day, hour, count: grid.get(`${day}:${hour}`) ?? 0 });
    }
  }

  return points;
}

// ─── Services breakdown ───────────────────────────────────────────────────────

export async function getServicesBreakdown(
  tenantId: string,
  from: Date,
  to: Date
): Promise<ServiceBreakdown[]> {
  const appointments = await prisma.appointment.findMany({
    where: { tenantId, createdAt: { gte: from, lte: to } },
    select: {
      service: { select: { name: true, price: true } },
    },
  });

  const map = new Map<string, { count: number; revenue: number }>();

  for (const appt of appointments) {
    const name = appt.service.name;
    const price = Number(appt.service.price ?? 0);
    const entry = map.get(name) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += price;
    map.set(name, entry);
  }

  return Array.from(map.entries())
    .map(([name, { count, revenue }]) => ({
      name,
      count,
      revenue: Math.round(revenue * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ─── Staff performance ────────────────────────────────────────────────────────

export async function getStaffPerformance(
  tenantId: string,
  from: Date,
  to: Date
): Promise<StaffPerformanceRow[]> {
  const teamMembers = await prisma.teamMember.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      appointments: {
        where: { startAt: { gte: from, lte: to } },
        select: { status: true },
      },
    },
  });

  return teamMembers
    .map((tm) => {
      const completed = tm.appointments.filter((a) => a.status === "COMPLETED").length;
      const cancelled = tm.appointments.filter((a) => a.status === "CANCELLED").length;
      const noShow = tm.appointments.filter((a) => a.status === "NO_SHOW").length;
      const total = tm.appointments.length;
      return { id: tm.id, name: tm.name, completed, cancelled, noShow, total };
    })
    .sort((a, b) => b.total - a.total);
}
