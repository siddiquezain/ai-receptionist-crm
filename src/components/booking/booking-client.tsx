"use client";

import { useState, useTransition, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import type { BookingTenant, BookingService, TimeSlot } from "@/lib/booking-queries";
import { ServicePicker } from "./service-picker";
import { DatePicker } from "./date-picker";
import { SlotPicker } from "./slot-picker";
import { BookingForm } from "./booking-form";
import { BookingConfirmation } from "./booking-confirmation";

type Step = "service" | "date" | "time" | "form" | "done";

interface Props {
  tenant: BookingTenant;
  services: BookingService[];
  availableDates: string[];
}

const STEP_ORDER: Step[] = ["service", "date", "time", "form", "done"];

const STEP_LABELS: Record<Step, string> = {
  service: "Service",
  date: "Date",
  time: "Time",
  form: "Details",
  done: "Confirmed",
};

export function BookingClient({ tenant, services, availableDates: initialDates }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [timeLabel, setTimeLabel] = useState<string>("");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const [availableDates, setAvailableDates] = useState<string[]>(initialDates);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useTransition();

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  // When service changes, reload available dates
  useEffect(() => {
    if (!serviceId) return;
    // The initial dates were fetched for the first service; refetch if service changes
    let cancelled = false;
    fetch(`/api/booking/dates?tenantId=${tenant.id}&serviceId=${serviceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.dates)) {
          setAvailableDates(data.dates);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [serviceId, tenant.id]);

  // When date changes, load slots
  useEffect(() => {
    if (!serviceId || !date) { setSlots([]); return; }
    let cancelled = false;
    setSlotsLoading(async () => {
      const r = await fetch(
        `/api/booking/slots?tenantId=${tenant.id}&serviceId=${serviceId}&date=${date}`
      );
      const data = await r.json();
      if (!cancelled && Array.isArray(data.slots)) {
        setSlots(data.slots);
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, serviceId, tenant.id]);

  function goBack() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  function canGoBack() {
    return step !== "service" && step !== "done";
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          {tenant.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo} alt={tenant.name} className="h-12 mx-auto mb-3 object-contain" />
          )}
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{tenant.name}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Book an appointment</p>
        </div>

        {/* Progress bar */}
        {step !== "done" && (
          <div className="mb-6">
            <div className="flex justify-between mb-1.5">
              {(["service", "date", "time", "form"] as Step[]).map((s, i) => (
                <span
                  key={s}
                  className={[
                    "text-xs font-medium",
                    i <= stepIndex ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {STEP_LABELS[s]}
                </span>
              ))}
            </div>
            <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${(stepIndex / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          {canGoBack() && (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 -mt-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}

          {step === "service" && (
            <ServicePicker
              services={services}
              selected={serviceId}
              onSelect={(id) => {
                setServiceId(id);
                setDate(null);
                setTime(null);
                setStep("date");
              }}
            />
          )}

          {step === "date" && (
            <DatePicker
              availableDates={availableDates}
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setTime(null);
                setStep("time");
              }}
            />
          )}

          {step === "time" && (
            <SlotPicker
              slots={slots}
              selected={time}
              loading={slotsLoading}
              onSelect={(t) => {
                setTime(t);
                const slot = slots.find((s) => s.time === t);
                setTimeLabel(slot?.label ?? t);
                setStep("form");
              }}
            />
          )}

          {step === "form" && serviceId && date && time && (
            <BookingForm
              tenantId={tenant.id}
              serviceId={serviceId}
              date={date}
              time={time}
              timeLabel={timeLabel}
              onSuccess={(id) => {
                setAppointmentId(id);
                setStep("done");
              }}
            />
          )}

          {step === "done" && selectedService && date && (
            <BookingConfirmation
              tenantName={tenant.name}
              serviceName={selectedService.name}
              date={date}
              timeLabel={timeLabel}
            />
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Powered by AppointEase
        </p>
      </div>
    </div>
  );
}
