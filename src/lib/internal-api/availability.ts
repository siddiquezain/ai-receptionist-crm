import { fromZonedTime } from "date-fns-tz";
import { addMinutes } from "date-fns";

export interface TimeSlot {
  startAt: Date;
  endAt: Date;
}

interface GenerateSlotsInput {
  dateStr: string; // "YYYY-MM-DD"
  timezone: string; // e.g. "America/New_York"
  workingHours: { startTime: string; endTime: string } | null;
  durationMinutes: number;
  bufferMinutes: number;
  busyPeriods: Array<{ startAt: Date; endAt: Date }>;
  existingAppointments: Array<{ startAt: Date; endAt: Date }>;
}

/** Returns true if [aStart, aEnd) overlaps [bStart, bEnd) */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Generates available time slots for a given date, working hours, and service.
 * All returned dates are UTC.
 */
export function generateSlots(input: GenerateSlotsInput): TimeSlot[] {
  const {
    dateStr,
    timezone,
    workingHours,
    durationMinutes,
    bufferMinutes,
    busyPeriods,
    existingAppointments,
  } = input;

  if (!workingHours) return [];

  // Convert working hours boundaries to UTC
  const openAt = fromZonedTime(`${dateStr}T${workingHours.startTime}:00`, timezone);
  const closeAt = fromZonedTime(`${dateStr}T${workingHours.endTime}:00`, timezone);

  const blocked = [...busyPeriods, ...existingAppointments];
  const stepMinutes = durationMinutes + bufferMinutes;
  const slots: TimeSlot[] = [];

  let cursor = openAt;
  while (true) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    if (slotEnd > closeAt) break;

    const isBlocked = blocked.some((b) =>
      overlaps(cursor, slotEnd, b.startAt, b.endAt)
    );

    if (!isBlocked) {
      slots.push({ startAt: new Date(cursor), endAt: new Date(slotEnd) });
    }

    cursor = addMinutes(cursor, stepMinutes);
  }

  return slots;
}
