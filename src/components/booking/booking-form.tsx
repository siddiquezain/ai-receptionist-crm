"use client";

import { useActionState } from "react";
import { createBooking, type BookingState } from "@/lib/actions/booking";

interface Props {
  tenantId: string;
  serviceId: string;
  date: string;
  time: string;
  timeLabel: string;
  onSuccess: (appointmentId: string) => void;
}

export function BookingForm({ tenantId, serviceId, date, time, timeLabel, onSuccess }: Props) {
  const [state, action, pending] = useActionState<BookingState, FormData>(
    async (prev, formData) => {
      const result = await createBooking(prev, formData);
      if (result.appointmentId) {
        onSuccess(result.appointmentId);
      }
      return result;
    },
    {}
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Details</h2>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
        {new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric",
        })} at {timeLabel}
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="time" value={time} />

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Full Name <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="Jane Smith"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Phone <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            name="phone"
            required
            type="tel"
            placeholder="+1 555 000 0000"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Email <span className="text-[var(--text-muted)] font-normal">(optional)</span>
          </label>
          <input
            name="email"
            type="email"
            placeholder="jane@example.com"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Notes <span className="text-[var(--text-muted)] font-normal">(optional)</span>
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Anything we should know?"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
        </div>

        {state.error && (
          <p className="text-sm text-[var(--danger)]">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
        >
          {pending ? "Booking…" : "Confirm Booking"}
        </button>
      </form>
    </div>
  );
}
