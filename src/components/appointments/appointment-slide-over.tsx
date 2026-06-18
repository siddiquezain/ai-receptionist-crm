"use client";

import { useEffect, useState } from "react";
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppointmentSlideOverProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string | null;
  tenantId: string;
  tenantSlug: string;
  timezone: string;
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
  timezone,
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
      return;
    }

    setLoadingDetail(true);
    fetchAppointmentDetail(tenantId, appointmentId!)
      .then((d) => {
        if (!d) {
          setErrorBanner("Appointment not found");
          setTimeout(onClose, 2000);
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
      .catch(() => setErrorBanner("Failed to load appointment"))
      .finally(() => setLoadingDetail(false));
  }, [open, appointmentId, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: AppointmentFormData) {
    setErrorBanner(null);
    setSaving(true);

    let result;
    if (isCreateMode) {
      if (!data.customerId) {
        form.setError("customerId", { message: "Customer is required" });
        setSaving(false);
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

    setSaving(false);
    if (!result.success) {
      setErrorBanner(result.error ?? "Something went wrong");
      return;
    }

    toast.success(isCreateMode ? "Appointment created" : "Appointment saved");
    onClose();
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

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
          <div className="mx-5 mt-4 rounded-[5px] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
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
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    Customer *
                  </label>
                  <Input
                    placeholder="Search customers…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="text-sm"
                  />
                  {customerSearch && (
                    <div className="max-h-40 overflow-y-auto rounded-[5px] border border-[var(--border)] bg-[var(--surface)]">
                      {filteredCustomers.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                          No customers found
                        </p>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg)] ${
                              form.watch("customerId") === c.id
                                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                : "text-[var(--text-primary)]"
                            }`}
                            onClick={() => {
                              form.setValue("customerId", c.id, {
                                shouldValidate: true,
                              });
                              setCustomerSearch(c.name);
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
                <label className="text-xs font-medium text-[var(--text-muted)]">
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
                {form.formState.errors.serviceId && (
                  <p className="text-xs text-[var(--danger)]">
                    {form.formState.errors.serviceId.message}
                  </p>
                )}
              </div>

              {/* Staff */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">
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
                  <SelectTrigger className="text-sm">
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
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Start time *
                </label>
                <Input
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
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  End time *
                </label>
                <Input
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
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    Status
                  </label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(v) =>
                      form.setValue("status", v as AppointmentStatus)
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AppointmentStatus).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Notes
                </label>
                <Textarea
                  className="text-sm resize-none"
                  rows={3}
                  placeholder="Internal notes…"
                  {...form.register("notes")}
                />
              </div>
            </div>

            <SheetFooter className="border-t border-[var(--border)] px-5 py-4">
              <Button type="submit" disabled={saving} className="w-full">
                {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                {isCreateMode ? "Create appointment" : "Save changes"}
              </Button>
              {!isCreateMode && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full mt-2"
                  disabled={
                    saving ||
                    form.watch("status") === AppointmentStatus.CANCELLED
                  }
                  onClick={async () => {
                    setSaving(true);
                    const vals = form.getValues();
                    const result = await updateAppointment(
                      tenantId,
                      tenantSlug,
                      appointmentId!,
                      {
                        ...vals,
                        teamMemberId: vals.teamMemberId || null,
                        notes: vals.notes ?? "",
                        status: AppointmentStatus.CANCELLED,
                      }
                    );
                    setSaving(false);
                    if (!result.success) {
                      setErrorBanner(result.error ?? "Failed to cancel");
                      return;
                    }
                    toast.success("Appointment cancelled");
                    onClose();
                  }}
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
