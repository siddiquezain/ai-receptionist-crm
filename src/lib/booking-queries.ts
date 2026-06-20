import { prisma } from "./prisma";

// ─── Public tenant + services ─────────────────────────────────────────────────

export type BookingTenant = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  logo: string | null;
};

export type BookingService = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  bufferTime: number;
  price: string | null;
  currency: string;
};

export async function getBookingTenant(slug: string): Promise<BookingTenant | null> {
  return prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, name: true, slug: true, timezone: true, logo: true },
  });
}

export async function getBookingServices(tenantId: string): Promise<BookingService[]> {
  const services = await prisma.service.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      duration: true,
      bufferTime: true,
      price: true,
      currency: true,
    },
    orderBy: { name: "asc" },
  });
  return services.map((s) => ({
    ...s,
    price: s.price !== null ? String(s.price) : null,
  }));
}

// ─── Available dates ───────────────────────────────────────────────────────────
// Returns the next N calendar dates that have at least 1 open slot.

export async function getAvailableDates(
  tenantId: string,
  serviceId: string,
  daysAhead = 60
): Promise<string[]> {
  const [service, workingHours, busyPeriods] = await Promise.all([
    prisma.service.findFirst({ where: { id: serviceId, tenantId }, select: { duration: true, bufferTime: true } }),
    prisma.workingHours.findMany({ where: { tenantId, teamMemberId: null }, select: { dayOfWeek: true, isOpen: true, startTime: true, endTime: true } }),
    prisma.busyPeriod.findMany({
      where: { tenantId, teamMemberId: null, endAt: { gte: new Date() } },
      select: { startAt: true, endAt: true },
    }),
  ]);

  if (!service) return [];

  const slotMinutes = service.duration + service.bufferTime;
  const openDays = new Set(workingHours.filter((h) => h.isOpen).map((h) => h.dayOfWeek));

  const available: string[] = [];
  const now = new Date();

  for (let i = 0; i < daysAhead && available.length < 60; i++) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    const dow = date.getUTCDay();
    if (!openDays.has(dow)) continue;

    const wh = workingHours.find((h) => h.dayOfWeek === dow && h.isOpen);
    if (!wh) continue;

    const [sh, sm] = wh.startTime.split(":").map(Number);
    const [eh, em] = wh.endTime.split(":").map(Number);
    const openMinutes = (eh * 60 + em) - (sh * 60 + sm);

    // Check if the whole day is a busy period
    const dayStr = date.toISOString().slice(0, 10);
    const dayStart = new Date(dayStr + "T00:00:00Z");
    const dayEnd = new Date(dayStr + "T23:59:59Z");
    const wholeDayBusy = busyPeriods.some(
      (b) => b.startAt <= dayStart && b.endAt >= dayEnd
    );
    if (wholeDayBusy) continue;

    if (openMinutes >= slotMinutes) {
      available.push(dayStr);
    }
  }

  return available;
}

// ─── Available time slots for a date ──────────────────────────────────────────

export type TimeSlot = {
  time: string;    // "09:00"
  label: string;   // "9:00 AM"
};

export async function getAvailableSlots(
  tenantId: string,
  serviceId: string,
  dateStr: string  // "2026-06-20"
): Promise<TimeSlot[]> {
  const date = new Date(dateStr + "T00:00:00Z");
  const dow = date.getUTCDay();

  const [service, workingHours, busyPeriods, existingAppts] = await Promise.all([
    prisma.service.findFirst({
      where: { id: serviceId, tenantId },
      select: { duration: true, bufferTime: true },
    }),
    prisma.workingHours.findFirst({
      where: { tenantId, dayOfWeek: dow, teamMemberId: null },
    }),
    prisma.busyPeriod.findMany({
      where: {
        tenantId,
        teamMemberId: null,
        startAt: { lt: new Date(dateStr + "T23:59:59Z") },
        endAt: { gt: new Date(dateStr + "T00:00:00Z") },
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId,
        startAt: { gte: new Date(dateStr + "T00:00:00Z"), lt: new Date(dateStr + "T23:59:59Z") },
        status: { notIn: ["CANCELLED"] },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  if (!service || !workingHours?.isOpen) return [];

  const slotDuration = service.duration;
  const buffer = service.bufferTime;
  const slotStep = slotDuration + buffer;

  const [sh, sm] = workingHours.startTime.split(":").map(Number);
  const [eh, em] = workingHours.endTime.split(":").map(Number);
  const openStart = sh * 60 + sm;
  const openEnd = eh * 60 + em;

  // Blocked intervals (busy periods + appointments) in minutes from day start UTC
  const blocked: Array<{ start: number; end: number }> = [];
  for (const b of busyPeriods) {
    const bStart = Math.floor((b.startAt.getTime() - date.getTime()) / 60000);
    const bEnd = Math.ceil((b.endAt.getTime() - date.getTime()) / 60000);
    blocked.push({ start: bStart, end: bEnd });
  }
  for (const a of existingAppts) {
    const aStart = Math.floor((a.startAt.getTime() - date.getTime()) / 60000);
    const aEnd = Math.ceil((a.endAt.getTime() - date.getTime()) / 60000);
    blocked.push({ start: aStart, end: aEnd });
  }

  const slots: TimeSlot[] = [];
  const nowMinutes = Date.now() / 60000;

  for (let cur = openStart; cur + slotDuration <= openEnd; cur += slotStep) {
    // Slot occupies [cur, cur + slotDuration + buffer]
    const slotEnd = cur + slotDuration + buffer;
    const slotStartMs = date.getTime() + cur * 60000;

    // Don't show past slots
    if (slotStartMs < nowMinutes * 60000) continue;

    const overlaps = blocked.some((b) => cur < b.end && slotEnd > b.start);
    if (overlaps) continue;

    const h = Math.floor(cur / 60);
    const m = cur % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const ampm = h < 12 ? "AM" : "PM";
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const label = `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;
    slots.push({ time, label });
  }

  return slots;
}
