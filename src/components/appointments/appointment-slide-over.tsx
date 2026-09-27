"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, X } from "lucide-react";
import { AppointmentStatus } from "@/types/prisma-enums";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppointmentStatusBadge } from "./appointment-status-badge";
import {
  fetchAppointmentDetail,
  updateAppointment,
  createAppointment,
} from "@/lib/actions/appointments";
import type {
  AppointmentDetail,
  StaffOption,
  ServiceOption,
  CustomerOption,
} from "@/lib/appointments-queries";

// ─── Schema ───────────────────────────────────────────────────────────────────

const appointmentSchema = z
  .object({
    serviceId:    z.string().min(1, "Service is required"),
    teamMemberId: z.string().optional(),
    startAt:      z.string().min(1, "Start time is required"),
    endAt:        z.string().min(1, "End time is required"),
    notes:        z.string().optional(),
    status:       z.nativeEnum(AppointmentStatus),
    customerId:   z.string().optional(),
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: "End time must be after start time",
    path: ["endAt"],
  });

type AppointmentFormData = z.infer<typeof appointmentSchema>;

function toDatetimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function formatStatusLabel(status: AppointmentStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
  required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
        {required && <span style={{ color: "var(--danger)" }}> *</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppointmentSlideOverProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string | null;
  tenantId: string;
  tenantSlug: string;
  services: ServiceOption[];
  staff: StaffOption[];
  customers: CustomerOption[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentSlideOver({
  open,
  onClose,
  appointmentId,
  tenantId,
  tenantSlug,
  services,
  staff,
  customers,
}: AppointmentSlideOverProps) {
  const isCreateMode = appointmentId === null;

  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      serviceId: "", teamMemberId: "", startAt: "", endAt: "",
      notes: "", status: AppointmentStatus.PENDING, customerId: "",
    },
  });

  useEffect(() => {
    if (!open || isCreateMode) {
      setDetail(null);
      form.reset({
        serviceId: "", teamMemberId: "", startAt: "", endAt: "",
        notes: "", status: AppointmentStatus.PENDING, customerId: "",
      });
      setErrorBanner(null);
      setCustomerSearch("");
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);

    fetchAppointmentDetail(tenantId, appointmentId!)
      .then((d) => {
        if (cancelled) return;
        if (!d) {
          setErrorBanner("Appointment not found");
          closeTimerRef.current = setTimeout(onClose, 2000);
          return;
        }
        setDetail(d);
        form.reset({
          serviceId: d.serviceId,
          teamMemberId: d.teamMemberId ?? "",
          startAt: toDatetimeLocal(d.startAt),
          endAt: toDatetimeLocal(d.endAt),
          notes: d.notes ?? "",
          status: d.status,
        });
      })
      .catch(() => {
        if (!cancelled) setErrorBanner("Failed to load appointment");
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [open, appointmentId, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const watchedStart      = form.watch("startAt");
  const watchedEnd        = form.watch("endAt");
  const watchedStatus     = form.watch("status");
  const watchedCustomerId = form.watch("customerId");

  const timeInvalid =
    watchedStart && watchedEnd ? new Date(watchedEnd) <= new Date(watchedStart) : false;

  const canCancel =
    !isCreateMode &&
    watchedStatus !== AppointmentStatus.CANCELLED &&
    watchedStatus !== AppointmentStatus.COMPLETED &&
    watchedStatus !== AppointmentStatus.NO_SHOW;

  async function onSubmit(data: AppointmentFormData) {
    setErrorBanner(null);
    setSaving(true);
    try {
      let result;
      if (isCreateMode) {
        if (!data.customerId) {
          form.setError("customerId", { message: "Customer is required" });
          return;
        }
        result = await createAppointment(tenantId, tenantSlug, {
          customerId: data.customerId,
          serviceId: data.serviceId,
          teamMemberId: data.teamMemberId || null,
          startAt: data.startAt,
          endAt: data.endAt,
          notes: data.notes ?? "",
        });
      } else {
        result = await updateAppointment(tenantId, tenantSlug, appointmentId!, {
          serviceId: data.serviceId,
          teamMemberId: data.teamMemberId || null,
          startAt: data.startAt,
          endAt: data.endAt,
          notes: data.notes ?? "",
          status: data.status,
        });
      }
      if (!result.success) { setErrorBanner(result.error ?? "Something went wrong"); return; }
      toast.success(isCreateMode ? "Appointment created" : "Appointment saved");
      onClose();
    } catch {
      setErrorBanner("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setSaving(true);
    try {
      const vals = form.getValues();
      const result = await updateAppointment(tenantId, tenantSlug, appointmentId!, {
        ...vals,
        teamMemberId: vals.teamMemberId || null,
        notes: vals.notes ?? "",
        status: AppointmentStatus.CANCELLED,
      });
      if (!result.success) { setErrorBanner(result.error ?? "Failed to cancel"); return; }
      toast.success("Appointment cancelled");
      onClose();
    } catch {
      setErrorBanner("Failed to cancel appointment");
    } finally {
      setSaving(false);
    }
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[460px] overflow-y-auto flex flex-col gap-0 p-0"
        style={{
          background: "var(--surface-raised)",
          borderLeft: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <SheetHeader
          className="flex flex-row items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <SheetTitle className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {isCreateMode ? "New appointment" : (detail?.customer?.name ?? "Appointment")}
            </SheetTitle>
            {!isCreateMode && detail && (
              <AppointmentStatusBadge status={detail.status} />
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
          >
            <X className="size-4" />
          </button>
        </SheetHeader>

        {/* Error banner */}
        {errorBanner && (
          <div
            className="mx-5 mt-4 rounded-[var(--radius-md)] px-3 py-2.5 text-sm"
            style={{
              background: "var(--danger-subtle)",
              border: "1px solid var(--danger-subtle-border)",
              color: "var(--danger)",
            }}
          >
            {errorBanner}
          </div>
        )}

        {/* Loading */}
        {loadingDetail && (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="size-5 animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        )}

        {/* Form */}
        {!loadingDetail && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col">
            <div className="flex-1 space-y-5 px-5 py-5">

              {/* Customer — create mode only */}
              {isCreateMode && (
                <Field
                  label="Customer"
                  required
                  error={form.formState.errors.customerId?.message}
                >
                  <Input
                    placeholder="Search customers…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="text-sm"
                  />
                  {customerSearch && (
                    <div
                      className="mt-1 max-h-44 overflow-y-auto rounded-[var(--radius-md)]"
                      style={{
                        background: "var(--surface-raised)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-md)",
                      }}
                    >
                      {filteredCustomers.length === 0 ? (
                        <p className="px-3 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          No customers found
                        </p>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full px-3 py-2.5 text-left text-sm transition-colors"
                            style={
                              watchedCustomerId === c.id
                                ? { background: "var(--accent-subtle)", color: "var(--accent)" }
                                : { color: "var(--text-primary)" }
                            }
                            onMouseEnter={(e) => {
                              if (watchedCustomerId !== c.id)
                                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                            }}
                            onMouseLeave={(e) => {
                              if (watchedCustomerId !== c.id)
                                (e.currentTarget as HTMLElement).style.background = "";
                            }}
                            onClick={() => {
                              form.setValue("customerId", c.id, { shouldValidate: true });
                              setCustomerSearch(c.name);
                            }}
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.phone && (
                              <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                {c.phone}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </Field>
              )}

              {/* Service */}
              <Field label="Service" required error={form.formState.errors.serviceId?.message}>
                <Select
                  value={form.watch("serviceId") || "__none__"}
                  onValueChange={(v) =>
                    form.setValue("serviceId", v === "__none__" ? "" : (v ?? ""), { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select a service</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.duration}m)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Staff */}
              <Field label="Staff member">
                <Select
                  value={form.watch("teamMemberId") || "__unassigned__"}
                  onValueChange={(v) =>
                    form.setValue("teamMemberId", v === "__unassigned__" ? "" : (v ?? ""))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start time" required error={form.formState.errors.startAt?.message}>
                  <Input id="start-at" type="datetime-local" className="text-sm" {...form.register("startAt")} />
                </Field>
                <Field
                  label="End time"
                  required
                  error={
                    form.formState.errors.endAt?.message ??
                    (timeInvalid ? "Must be after start" : undefined)
                  }
                >
                  <Input id="end-at" type="datetime-local" className="text-sm" {...form.register("endAt")} />
                </Field>
              </div>

              {/* Status — edit mode only */}
              {!isCreateMode && (
                <Field label="Status">
                  <Select
                    value={watchedStatus}
                    onValueChange={(v) => form.setValue("status", v as AppointmentStatus)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AppointmentStatus).map((s) => (
                        <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {/* Notes */}
              <Field label="Notes">
                <Textarea
                  className="text-sm resize-none"
                  rows={3}
                  placeholder="Internal notes…"
                  {...form.register("notes")}
                />
              </Field>
            </div>

            {/* Footer */}
            <SheetFooter
              className="flex flex-col gap-2 px-5 py-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <Button type="submit" disabled={saving || !!timeInvalid} className="w-full">
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                {isCreateMode ? "Create appointment" : "Save changes"}
              </Button>
              {canCancel && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={saving}
                  onClick={handleCancel}
                >
                  Cancel appointment
                </Button>
              )}
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
