"use client";

import { useState, useTransition } from "react";
import { upsertWorkingHours, type SettingsState } from "@/lib/actions/settings";

interface DayConfig {
  name: string;
  dow: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

interface Props {
  tenantId: string;
  days: DayConfig[];
}

export function WorkingHoursForm({ tenantId, days: initialDays }: Props) {
  const [days, setDays] = useState(initialDays);
  const [saving, setSaving] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, SettingsState>>({});
  const [isPending, startTransition] = useTransition();

  const toggle = (dow: number) => {
    setDays((prev) =>
      prev.map((d) => (d.dow === dow ? { ...d, isOpen: !d.isOpen } : d))
    );
  };

  const updateTime = (dow: number, field: "startTime" | "endTime", value: string) => {
    setDays((prev) =>
      prev.map((d) => (d.dow === dow ? { ...d, [field]: value } : d))
    );
  };

  const saveDay = (dow: number) => {
    const day = days.find((d) => d.dow === dow);
    if (!day) return;

    const fd = new FormData();
    fd.set("tenantId", tenantId);
    fd.set("dayOfWeek", String(dow));
    fd.set("isOpen", String(day.isOpen));
    fd.set("startTime", day.startTime);
    fd.set("endTime", day.endTime);

    setSaving(dow);
    startTransition(async () => {
      const result = await upsertWorkingHours({ }, fd);
      setMessages((prev) => ({ ...prev, [dow]: result }));
      setSaving(null);
    });
  };

  return (
    <div className="space-y-2">
      {days.map((day) => (
        <div
          key={day.dow}
          className="flex items-center gap-4 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          {/* Toggle */}
          <button
            type="button"
            onClick={() => toggle(day.dow)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              day.isOpen ? "bg-[var(--accent)]" : "bg-[var(--border)]"
            }`}
            aria-label={day.isOpen ? "Open" : "Closed"}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                day.isOpen ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>

          {/* Day name */}
          <span className="w-24 shrink-0 text-sm font-medium text-[var(--text-primary)]">
            {day.name}
          </span>

          {/* Time range */}
          {day.isOpen ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                type="time"
                value={day.startTime}
                onChange={(e) => updateTime(day.dow, "startTime", e.target.value)}
                className="rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
              <span className="text-sm text-[var(--text-muted)]">–</span>
              <input
                type="time"
                value={day.endTime}
                onChange={(e) => updateTime(day.dow, "endTime", e.target.value)}
                className="rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          ) : (
            <span className="flex-1 text-sm text-[var(--text-muted)]">Closed</span>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={() => saveDay(day.dow)}
            disabled={saving === day.dow || isPending}
            className="shrink-0 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {saving === day.dow ? "Saving…" : "Save"}
          </button>

          {/* Feedback */}
          {messages[day.dow]?.success && (
            <span className="text-xs text-[var(--success)]">Saved</span>
          )}
          {messages[day.dow]?.error && (
            <span className="text-xs text-[var(--danger)]">{messages[day.dow].error}</span>
          )}
        </div>
      ))}
    </div>
  );
}
