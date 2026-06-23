import { describe, it, expect } from "vitest";
import { generateSlots } from "@/lib/internal-api/availability";

describe("generateSlots", () => {
  it("generates correct slots for a 60-min service with no buffer", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: { startTime: "09:00", endTime: "11:00" },
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [],
      existingAppointments: [],
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T09:00:00.000Z");
    expect(slots[0].endAt.toISOString()).toBe("2026-06-24T10:00:00.000Z");
    expect(slots[1].startAt.toISOString()).toBe("2026-06-24T10:00:00.000Z");
    expect(slots[1].endAt.toISOString()).toBe("2026-06-24T11:00:00.000Z");
  });

  it("excludes slots that overlap a busy period", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: { startTime: "09:00", endTime: "12:00" },
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [
        {
          startAt: new Date("2026-06-24T10:00:00Z"),
          endAt: new Date("2026-06-24T11:00:00Z"),
        },
      ],
      existingAppointments: [],
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T09:00:00.000Z");
    expect(slots[1].startAt.toISOString()).toBe("2026-06-24T11:00:00.000Z");
  });

  it("excludes slots that overlap an existing appointment", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: { startTime: "09:00", endTime: "12:00" },
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [],
      existingAppointments: [
        {
          startAt: new Date("2026-06-24T09:00:00Z"),
          endAt: new Date("2026-06-24T10:00:00Z"),
        },
      ],
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T10:00:00.000Z");
  });

  it("respects buffer time between slots", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: { startTime: "09:00", endTime: "12:00" },
      durationMinutes: 60,
      bufferMinutes: 15,
      busyPeriods: [],
      existingAppointments: [],
    });
    // With 60min service + 15min buffer = 75min per slot
    // 09:00-10:00 (service), 10:00-10:15 (buffer), then 10:15-11:15 (service ends 11:15)
    // 11:15-11:30 (buffer), then 11:30 start but 11:30+60=12:30 > 12:00, so no third slot
    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T09:00:00.000Z");
    expect(slots[1].startAt.toISOString()).toBe("2026-06-24T10:15:00.000Z");
  });

  it("returns empty array when working hours are closed", () => {
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "UTC",
      workingHours: null,
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [],
      existingAppointments: [],
    });
    expect(slots).toHaveLength(0);
  });

  it("handles non-UTC timezone correctly", () => {
    // "2026-06-24" in America/New_York (UTC-4 in summer)
    // 09:00 New York = 13:00 UTC
    const slots = generateSlots({
      dateStr: "2026-06-24",
      timezone: "America/New_York",
      workingHours: { startTime: "09:00", endTime: "10:00" },
      durationMinutes: 60,
      bufferMinutes: 0,
      busyPeriods: [],
      existingAppointments: [],
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].startAt.toISOString()).toBe("2026-06-24T13:00:00.000Z");
  });
});
