"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { AppointmentStatus } from "@prisma/client";
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
import { searchCustomersAction } from "@/lib/actions/customers";
import type {
  AppointmentDetail,
  StaffOption,
  ServiceOption,
  CustomerOption,
} from "@/lib/appointments-queries";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const appointmentSchema = z
  .object({
    serviceId: z.string().min(1, "Service is required"),
    teamMemberId: z.string().optional(),
    startAt: z.string().min(1, "Start time is required"),
    endAt: z.string().min(1, "End time is required"),
    notes: z.string().optional(),
    status: z.nativeEnum(AppointmentStatus),
    customerId: z.string().optional(),
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: "End time must be after start time",
    path: ["endAt"],
  });

type AppointmentFormData = z.infer<typeof appointmentSchema>;

/** Format a Date to the value expected by <input type="datetime-local"> */
function toDatetimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function formatStatusLabel(status: AppointmentStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
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
}: AppointmentSlideOverProps) {
  const isCreateMode = appointmentId === null;

  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      serviceId: "",
      teamMemberId: "",
      startAt: "",
      endAt: "",
      notes: "",
      status: AppointmentStatus.PENDING,
      customerId: "",
    },
  });

  useEffect(() => {
    if (!open || isCreateMode) {
      setDetail(null);
      form.reset({
        serviceId: "",
        teamMemberId: "",
        startAt: "",
        endAt: "",
        notes: "",
        status: AppointmentStatus.PENDING,
        customerId: "",
      });
      setErrorBanner(null);
      setCustomerSearch("");
      setCustomerResults([]);
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
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, appointmentId, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Consolidated watches
  const watchedStart = form.watch("startAt");
  const watchedEnd = form.watch("endAt");
  const watchedStatus = form.watch("status");
  const watchedCustomerId = form.watch("customerId");

  const timeInvalid =
    watchedStart && watchedEnd
      ? new Date(watchedEnd) <= new Date(watchedStart)
      : false;

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

      if (!result.success) {
        setErrorBanner(result.error ?? "Something went wrong");
        return;
      }

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
      if (!result.success) {
        setErrorBanner(result.error ?? "Failed to cancel");
        return;
      }
      toast.success("Appointment cancelled");
      onClose();
    } catch {
      setErrorBanner("Failed to cancel appointment");
    } finally {
      setSaving(false);
    }
  }

  function handleCustomerSearch(q: string) {
    setCustomerSearch(q);
    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    if (q.length < 2) {
      setCustomerResults([]);
      return;
    }
    customerDebounceRef.current = setTimeout(async () => {
      setSearchingCustomers(true);
      const results = await searchCustomersAction(q, tenantId);
      setCustomerResults(results);
      setSearchingCustomers(false);
    }, 275);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold text-[var(--text-primary)]">
              {isCreateMode
                ? "New appointment"
                : (detail?.customer?.name ?? "Appointment")}
            </SheetTitle>
            {!isCreateMode && detail && (
              <AppointmentStatusBadge status={detail.status} />
            )}
          </div>
        </SheetHeader>

        {errorBanner && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-[5px] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
          >
            {errorBanner}
          </div>
        )}

        {loadingDetail && (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-[var(--text-muted)]" />
          </div>
        )}

        {!loadingDetail && (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col"
          >
            <div className="flex-1 space-y-4 px-5 py-4">
              {/* Customer — create mode only */}
              {isCreateMode && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="customer-search"
                    className="text-xs font-medium text-[var(--text-muted)]"
                  >
                    Customer *
                  </label>
                  <Input
                    id="customer-search"
                    placeholder="Search customers…"
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    className="text-sm"
                  />
                  {customerSearch && customerSearch.length >= 2 && (
                    <div className="max-h-40 overflow-y-auto rounded-[5px] border border-[var(--border)] bg-[var(--surface)]">
                      {searchingCustomers ? (
                        <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                          Searching…
                        </p>
                      ) : customerResults.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                          No customers found
                        </p>
                      ) : (
                        customerResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg)] ${
                              watchedCustomerId === c.id
                                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                : "text-[var(--text-primary)]"
                            }`}
                            onClick={() => {
                              form.setValue("customerId", c.id, {
                                shouldValidate: true,
                              });
                              setCustomerSearch(c.name);
                              setCustomerResults([]);
                            }}
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.phone && (
                              <span className="ml-2 text-xs text-[var(--text-muted)]">
                                {c.phone}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {form.formState.errors.customerId && (
                    <p className="text-xs text-[var(--danger)]">
                      {form.formState.errors.customerId.message}
                    </p>
                  )}
                </div>
              )}

              {/* Service */}
              <div className="space-y-1.5">
                <label
                  id="service-label"
                  className="text-xs font-medium text-[var(--text-muted)]"
                >
                  Service *
                </label>
                <Select
                  value={form.watch("serviceId") || "__none__"}
                  onValueChange={(v) =>
                    form.setValue("serviceId", v === "__none__" ? "" : (v ?? ""), {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger aria-labelledby="service-label" className="text-sm">
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
                {form.formState.errors.serviceId && (
                  <p className="text-xs text-[var(--danger)]">
                    {form.formState.errors.serviceId.message}
                  </p>
                )}
              </div>

              {/* Staff */}
              <div className="space-y-1.5">
                <label
                  id="staff-label"
                  className="text-xs font-medium text-[var(--text-muted)]"
                >
                  Staff member
                </label>
                <Select
                  value={form.watch("teamMemberId") || "__unassigned__"}
                  onValueChange={(v) =>
                    form.setValue(
                      "teamMemberId",
                      v === "__unassigned__" ? "" : (v ?? "")
                    )
                  }
                >
                  <SelectTrigger aria-labelledby="staff-label" className="text-sm">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start time */}
              <div className="space-y-1.5">
                <label
                  htmlFor="start-at"
                  className="text-xs font-medium text-[var(--text-muted)]"
                >
                  Start time *
                </label>
                <Input
                  id="start-at"
                  type="datetime-local"
                  className="text-sm"
                  {...form.register("startAt")}
                />
                {form.formState.errors.startAt && (
                  <p className="text-xs text-[var(--danger)]">
                    {form.formState.errors.startAt.message}
                  </p>
                )}
              </div>

              {/* End time */}
              <div className="space-y-1.5">
                <label
                  htmlFor="end-at"
                  className="text-xs font-medium text-[var(--text-muted)]"
                >
                  End time *
                </label>
                <Input
                  id="end-at"
                  type="datetime-local"
                  className="text-sm"
                  {...form.register("endAt")}
                />
                {form.formState.errors.endAt && (
                  <p className="text-xs text-[var(--danger)]">
                    {form.formState.errors.endAt.message}
                  </p>
                )}
              </div>

              {/* Status — edit mode only */}
              {!isCreateMode && (
                <div className="space-y-1.5">
                  <label
                    id="status-label"
                    className="text-xs font-medium text-[var(--text-muted)]"
                  >
                    Status
                  </label>
                  <Select
                    value={watchedStatus}
                    onValueChange={(v) =>
                      form.setValue("status", v as AppointmentStatus)
                    }
                  >
                    <SelectTrigger aria-labelledby="status-label" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AppointmentStatus).map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label
                  htmlFor="notes"
                  className="text-xs font-medium text-[var(--text-muted)]"
                >
                  Notes
                </label>
                <Textarea
                  id="notes"
                  className="text-sm resize-none"
                  rows={3}
                  placeholder="Internal notes…"
                  {...form.register("notes")}
                />
              </div>
            </div>

            <SheetFooter className="border-t border-[var(--border)] px-5 py-4">
              <Button type="submit" disabled={saving || !!timeInvalid} className="w-full">
                {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                {isCreateMode ? "Create appointment" : "Save changes"}
              </Button>
              {canCancel && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full mt-2"
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
