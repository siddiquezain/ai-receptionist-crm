"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  availableDates: string[];
  selected: string | null;
  onSelect: (date: string) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function DatePicker({ availableDates, selected, onSelect }: Props) {
  const availableSet = new Set(availableDates);

  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pick a Date</h2>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prev}
            className="p-1 rounded hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-medium text-[var(--text-primary)]">
            {MONTHS[month]} {year}
          </span>
          <button
            type="button"
            onClick={next}
            className="p-1 rounded hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-[var(--text-muted)] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isAvailable = availableSet.has(dateStr);
            const isSelected = selected === dateStr;
            const isPast = new Date(dateStr + "T23:59:59Z") < today;

            return (
              <button
                key={idx}
                type="button"
                disabled={!isAvailable || isPast}
                onClick={() => onSelect(dateStr)}
                className={[
                  "aspect-square w-full flex items-center justify-center rounded-full text-sm transition-colors",
                  isSelected
                    ? "bg-[var(--accent)] text-white font-semibold"
                    : isAvailable && !isPast
                    ? "hover:bg-[var(--accent)]/10 text-[var(--text-primary)] cursor-pointer"
                    : "text-[var(--text-muted)] opacity-40 cursor-not-allowed",
                ].join(" ")}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
