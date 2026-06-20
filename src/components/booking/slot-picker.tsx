"use client";

import type { TimeSlot } from "@/lib/booking-queries";

interface Props {
  slots: TimeSlot[];
  selected: string | null;
  onSelect: (time: string) => void;
  loading?: boolean;
}

export function SlotPicker({ slots, selected, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pick a Time</h2>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pick a Time</h2>
        <p className="text-sm text-[var(--text-muted)] py-4 text-center">
          No available slots for this date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pick a Time</h2>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const isSelected = selected === slot.time;
          return (
            <button
              key={slot.time}
              type="button"
              onClick={() => onSelect(slot.time)}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)]/50",
              ].join(" ")}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
