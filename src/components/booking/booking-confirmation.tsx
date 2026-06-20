"use client";

import { CheckCircle } from "lucide-react";

interface Props {
  tenantName: string;
  serviceName: string;
  date: string;
  timeLabel: string;
}

export function BookingConfirmation({ tenantName, serviceName, date, timeLabel }: Props) {
  const displayDate = new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="rounded-full bg-[var(--success)]/10 p-4">
        <CheckCircle className="h-10 w-10 text-[var(--success)]" />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">You&apos;re booked!</h2>
        <p className="text-[var(--text-muted)] text-sm">
          Your appointment with {tenantName} is confirmed.
        </p>
      </div>

      <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
        <div className="flex justify-between px-4 py-3 text-sm">
          <span className="text-[var(--text-muted)]">Service</span>
          <span className="font-medium text-[var(--text-primary)]">{serviceName}</span>
        </div>
        <div className="flex justify-between px-4 py-3 text-sm">
          <span className="text-[var(--text-muted)]">Date</span>
          <span className="font-medium text-[var(--text-primary)]">{displayDate}</span>
        </div>
        <div className="flex justify-between px-4 py-3 text-sm">
          <span className="text-[var(--text-muted)]">Time</span>
          <span className="font-medium text-[var(--text-primary)]">{timeLabel}</span>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        You&apos;ll receive a confirmation shortly. We look forward to seeing you.
      </p>
    </div>
  );
}
