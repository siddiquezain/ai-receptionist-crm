// src/app/book/[tenant-slug]/booking-client.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  currency: string;
}

interface Slot {
  startAt: string;
  endAt: string;
  teamMemberId: string;
  teamMemberName: string;
}

interface Props {
  tenantId: string;
  tenantSlug: string;
  timezone: string;
  services: Service[];
}

type Step = "service" | "date" | "slot" | "details" | "confirm";

interface BookingState {
  service: Service | null;
  date: string;
  slot: Slot | null;
  customerId: string | null;
  appointmentId: string | null;
}

interface DetailsFormValues {
  name: string;
  email: string;
  phone: string;
}

export function BookingClient({ tenantId, tenantSlug: _tenantSlug, timezone, services }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [booking, setBooking] = useState<BookingState>({
    service: null,
    date: "",
    slot: null,
    customerId: null,
    appointmentId: null,
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<DetailsFormValues>();

  async function fetchSlots(serviceId: string, date: string) {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await fetch(
        `/api/internal/tenants/${tenantId}/availability?serviceId=${serviceId}&date=${date}`,
        {
          headers: { authorization: `Bearer ${process.env.NEXT_PUBLIC_BOOKING_API_KEY ?? ""}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch availability");
      const data = await res.json();
      setSlots(data.slots);
    } catch {
      setError("Could not load available times. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function onSubmitDetails(values: DetailsFormValues) {
    if (!booking.service || !booking.slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const customerRes = await fetch("/api/internal/customers/find-or-create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.NEXT_PUBLIC_BOOKING_API_KEY ?? ""}`,
        },
        body: JSON.stringify({
          tenantId,
          phone: values.phone || null,
          email: values.email,
          name: values.name,
        }),
      });
      if (!customerRes.ok) throw new Error("Failed to create customer");
      const { customerId } = await customerRes.json();

      const apptRes = await fetch("/api/internal/appointments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.NEXT_PUBLIC_BOOKING_API_KEY ?? ""}`,
        },
        body: JSON.stringify({
          tenantId,
          customerId,
          serviceId: booking.service.id,
          teamMemberId: booking.slot.teamMemberId,
          startAt: booking.slot.startAt,
          endAt: booking.slot.endAt,
          bookedVia: "SELF_SERVICE",
        }),
      });

      if (apptRes.status === 409) {
        setError("This slot was just taken. Please choose another time.");
        setStep("slot");
        fetchSlots(booking.service.id, booking.date);
        return;
      }
      if (!apptRes.ok) throw new Error("Failed to create appointment");

      const apptData = await apptRes.json();
      setBooking((b) => ({ ...b, customerId, appointmentId: apptData.appointmentId }));
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "confirm") {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">You&apos;re booked!</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {booking.service?.name} on{" "}
          {booking.slot && new Date(booking.slot.startAt).toLocaleString("en-US", {
            timeZone: timezone,
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          A confirmation will be sent to your email.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "service" && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">Select a service</h2>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => { setBooking((b) => ({ ...b, service: s })); setStep("date"); }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
                  {s.description && (
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{s.description}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{s.duration} min</p>
                </div>
                {s.price != null && (
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {s.price.toFixed(2)} {s.currency}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "date" && booking.service && (
        <div className="space-y-4">
          <button onClick={() => setStep("service")} className="text-xs text-[var(--accent)]">← Back</button>
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">Select a date</h2>
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)]"
            onChange={(e) => {
              const date = e.target.value;
              setBooking((b) => ({ ...b, date }));
              if (date && booking.service) {
                fetchSlots(booking.service.id, date);
                setStep("slot");
              }
            }}
          />
        </div>
      )}

      {step === "slot" && (
        <div className="space-y-4">
          <button onClick={() => setStep("date")} className="text-xs text-[var(--accent)]">← Back</button>
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">
            Available times on {booking.date}
          </h2>
          {loadingSlots ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No availability on this day. Please choose another date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={`${slot.startAt}-${slot.teamMemberId}`}
                  onClick={() => { setBooking((b) => ({ ...b, slot })); setStep("details"); }}
                  className="rounded-md border border-[var(--border)] py-2 text-xs text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  {new Date(slot.startAt).toLocaleTimeString("en-US", {
                    timeZone: timezone,
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "details" && booking.slot && (
        <div className="space-y-4">
          <button onClick={() => setStep("slot")} className="text-xs text-[var(--accent)]">← Back</button>
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">Your details</h2>
          <form onSubmit={handleSubmit(onSubmitDetails)} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Name</label>
              <input
                {...register("name", { required: "Required" })}
                placeholder="Jane Doe"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Email</label>
              <input
                {...register("email", { required: "Required", pattern: { value: /^\S+@\S+$/, message: "Invalid email" } })}
                type="email"
                placeholder="jane@example.com"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Phone (optional)</label>
              <input
                {...register("phone")}
                type="tel"
                placeholder="+14155551234"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[var(--accent)] py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {submitting ? "Booking…" : "Confirm Booking"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
