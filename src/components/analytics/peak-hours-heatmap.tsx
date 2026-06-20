"use client";

import type { PeakHoursPoint } from "@/lib/analytics-queries";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function cellColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "var(--border)";
  const intensity = count / max;
  if (intensity < 0.2) return "rgba(37, 99, 235, 0.15)";
  if (intensity < 0.4) return "rgba(37, 99, 235, 0.30)";
  if (intensity < 0.6) return "rgba(37, 99, 235, 0.50)";
  if (intensity < 0.8) return "rgba(37, 99, 235, 0.70)";
  return "rgba(37, 99, 235, 0.90)";
}

export function PeakHoursHeatmap({ data }: { data: PeakHoursPoint[] }) {
  const grid = new Map<string, number>();
  let max = 0;

  for (const pt of data) {
    const key = `${pt.dayOfWeek}:${pt.hour}`;
    grid.set(key, pt.count);
    if (pt.count > max) max = pt.count;
  }

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Peak Hours
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Hour labels */}
          <div className="mb-1 flex">
            <div className="w-8 shrink-0" />
            {HOURS.filter((h) => h % 3 === 0).map((h) => (
              <div
                key={h}
                className="text-[9px] text-[var(--text-muted)]"
                style={{ width: `${(3 / 24) * 100}%` }}
              >
                {hourLabel(h)}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((day, dow) => (
            <div key={day} className="mb-0.5 flex items-center gap-0.5">
              <span className="w-8 shrink-0 text-[10px] text-[var(--text-muted)]">{day}</span>
              {HOURS.map((hour) => {
                const count = grid.get(`${dow}:${hour}`) ?? 0;
                return (
                  <div
                    key={hour}
                    className="group relative flex-1 rounded-[2px]"
                    style={{
                      height: 16,
                      backgroundColor: cellColor(count, max),
                    }}
                    title={`${day} ${hourLabel(hour)}: ${count} appointments`}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)]">Less</span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
              <div
                key={i}
                className="h-3 w-5 rounded-[2px]"
                style={{
                  backgroundColor:
                    intensity === 0
                      ? "var(--border)"
                      : `rgba(37, 99, 235, ${intensity * 0.9})`,
                }}
              />
            ))}
            <span className="text-[10px] text-[var(--text-muted)]">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
