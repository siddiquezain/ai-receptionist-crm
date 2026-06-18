# Appointments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/{slug}/appointments` page — a server-rendered filterable list of appointments with a slide-over panel for viewing, editing, and creating appointments.

**Architecture:** Server Component page reads URL search params and fetches data via `appointments-queries.ts`. All mutations go through Server Actions in `src/lib/actions/appointments.ts` that call `revalidatePath` to refresh the list. The slide-over is a Client Component using the existing `Sheet` UI component (backed by `@base-ui/react/dialog`). Filter changes push URL params via `router.replace`. No API routes.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Tailwind v4, `react-hook-form` + `zod` (validation), `sonner` (toasts), shadcn/ui `Sheet`, `Select`, `Button`, `Input`, `Textarea`, lucide-react, `date-fns`.

---

## File Map

### Created by this plan

```
src/
├── lib/
│   ├── appointments-queries.ts              # Typed DB reads — no auth, just tenantId
│   └── actions/
│       └── appointments.ts                  # Server Actions: update, create, status change
│
├── components/
│   └── appointments/
│       ├── appointment-status-badge.tsx     # Reusable status pill (Server Component)
│       ├── appointments-table.tsx           # Clickable rows table (Client Component)
│       ├── appointments-filters.tsx         # Status tabs + date inputs + staff select (Client)
│       ├── appointment-slide-over.tsx       # Sheet panel — view/edit/create form (Client)
│       └── appointments-client.tsx          # State owner — renders filters+table+slide-over (Client)
│
└── app/(dashboard)/[tenant]/appointments/
    └── page.tsx                             # Server page — reads searchParams, passes data down
```

### Modified by this plan

None.

---

## Task 1: Appointments Query Functions

**Files:**
- Create: `src/lib/appointments-queries.ts`

- [ ] **Step 1: Write appointments-queries.ts**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/lib/appointments-queries.ts`:

```typescript
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "./prisma";

// ─── Exported types ───────────────────────────────────────────────────────────

export type AppointmentListItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  customer: { name: string } | null;
  service: { name: string; duration: number };
  teamMember: { name: string } | null;
};

export type AppointmentDetail = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  notes: string | null;
  bookedVia: string;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  conversationId: string | null;
  serviceId: string;
  teamMemberId: string | null;
  customer: { name: string; email: string | null; phone: string | null } | null;
  service: { name: string; duration: number };
  teamMember: { name: string } | null;
};

export type StaffOption = { id: string; name: string };
export type ServiceOption = { id: string; name: string; duration: number };
export type CustomerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type AppointmentFilters = {
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
  staffId?: string;
  page?: number;
};

// ─── Query functions ──────────────────────────────────────────────────────────

export async function getAppointments(
  tenantId: string,
  filters: AppointmentFilters = {}
): Promise<{ appointments: AppointmentListItem[]; hasMore: boolean }> {
  const { status, from, to, staffId, page = 1 } = filters;
  const take = page * 20;

  const where = {
    tenantId,
    deletedAt: null,
    ...(status !== undefined ? { status } : {}),
    ...(from !== undefined || to !== undefined
      ? {
          startAt: {
            ...(from !== undefined ? { gte: from } : {}),
            ...(to !== undefined ? { lte: to } : {}),
          },
        }
      : {}),
    ...(staffId !== undefined ? { teamMemberId: staffId } : {}),
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      take,
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        customer: { select: { name: true } },
        service: { select: { name: true, duration: true } },
        teamMember: { select: { name: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    appointments: appointments as AppointmentListItem[],
    hasMore: total > take,
  };
}

export async function getAppointmentDetail(
  tenantId: string,
  appointmentId: string
): Promise<AppointmentDetail | null> {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId, deletedAt: null },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      notes: true,
      bookedVia: true,
      confirmedAt: true,
      cancelledAt: true,
      cancellationReason: true,
      conversationId: true,
      serviceId: true,
      teamMemberId: true,
      customer: { select: { name: true, email: true, phone: true } },
      service: { select: { name: true, duration: true } },
      teamMember: { select: { name: true } },
    },
  });

  if (!appt) return null;
  return { ...appt, bookedVia: appt.bookedVia as string } as AppointmentDetail;
}

export async function getStaffOptions(tenantId: string): Promise<StaffOption[]> {
  return prisma.teamMember.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getServiceOptions(
  tenantId: string
): Promise<ServiceOption[]> {
  return prisma.service.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: { id: true, name: true, duration: true },
    orderBy: { name: "asc" },
  });
}

export async function getCustomerOptions(
  tenantId: string
): Promise<CustomerOption[]> {
  return prisma.customer.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
    take: 100,
  });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors in `appointments-queries.ts`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add src/lib/appointments-queries.ts && git commit -m "feat: add appointment query functions"
```

---

## Task 2: Server Actions

**Files:**
- Create: `src/lib/actions/appointments.ts`

- [ ] **Step 1: Create directory and write actions file**

```bash
mkdir -p "/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/lib/actions"
```

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/lib/actions/appointments.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { AppointmentStatus, BookingChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppointmentDetail } from "@/lib/appointments-queries";
import type { AppointmentDetail } from "@/lib/appointments-queries";

export type ActionResult = { success: boolean; error?: string };

// ─── Read (called from Client Components) ────────────────────────────────────

export async function fetchAppointmentDetail(
  tenantId: string,
  appointmentId: string
): Promise<AppointmentDetail | null> {
  return getAppointmentDetail(tenantId, appointmentId);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function updateAppointment(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string,
  data: {
    serviceId: string;
    teamMemberId: string | null;
    startAt: string; // ISO string from datetime-local input
    endAt: string;
    notes: string;
    status: AppointmentStatus;
  }
): Promise<ActionResult> {
  const existing = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Appointment not found" };

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);
  if (endAt <= startAt) {
    return { success: false, error: "End time must be after start time" };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      serviceId: data.serviceId,
      teamMemberId: data.teamMemberId || null,
      startAt,
      endAt,
      notes: data.notes || null,
      status: data.status,
      ...(data.status === AppointmentStatus.CONFIRMED
        ? { confirmedAt: new Date() }
        : {}),
      ...(data.status === AppointmentStatus.CANCELLED
        ? { cancelledAt: new Date() }
        : {}),
    },
  });

  revalidatePath(`/${tenantSlug}/appointments`);
  return { success: true };
}

export async function createAppointment(
  tenantId: string,
  tenantSlug: string,
  data: {
    customerId: string;
    serviceId: string;
    teamMemberId: string | null;
    startAt: string;
    endAt: string;
    notes: string;
  }
): Promise<ActionResult> {
  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);
  if (endAt <= startAt) {
    return { success: false, error: "End time must be after start time" };
  }

  await prisma.appointment.create({
    data: {
      tenantId,
      customerId: data.customerId,
      serviceId: data.serviceId,
      teamMemberId: data.teamMemberId || null,
      startAt,
      endAt,
      notes: data.notes || null,
      status: AppointmentStatus.PENDING,
      bookedVia: BookingChannel.MANUAL,
    },
  });

  revalidatePath(`/${tenantSlug}/appointments`);
  return { success: true };
}

export async function updateAppointmentStatus(
  tenantId: string,
  tenantSlug: string,
  appointmentId: string,
  status: AppointmentStatus
): Promise<ActionResult> {
  const existing = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Appointment not found" };

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status,
      ...(status === AppointmentStatus.CONFIRMED ? { confirmedAt: new Date() } : {}),
      ...(status === AppointmentStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
    },
  });

  revalidatePath(`/${tenantSlug}/appointments`);
  return { success: true };
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors in `actions/appointments.ts`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add src/lib/actions/appointments.ts && git commit -m "feat: add appointment server actions"
```

---

## Task 3: AppointmentStatusBadge Component

**Files:**
- Create: `src/components/appointments/appointment-status-badge.tsx`

- [ ] **Step 1: Write appointment-status-badge.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/appointments/appointment-status-badge.tsx`:

```tsx
import { AppointmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    className: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  },
  NO_SHOW: {
    label: "No Show",
    className: "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
  },
};

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add src/components/appointments/appointment-status-badge.tsx && git commit -m "feat: add AppointmentStatusBadge component"
```

---

## Task 4: AppointmentsTable Component

**Files:**
- Create: `src/components/appointments/appointments-table.tsx`

- [ ] **Step 1: Write appointments-table.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/appointments/appointments-table.tsx`:

```tsx
"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge } from "./appointment-status-badge";
import { formatDate } from "@/lib/utils";
import type { AppointmentListItem } from "@/lib/appointments-queries";

interface AppointmentsTableProps {
  appointments: AppointmentListItem[];
  timezone: string;
  hasMore: boolean;
  onRowClick: (id: string) => void;
  onLoadMore: () => void;
  onCreateClick: () => void;
}

export function AppointmentsTable({
  appointments,
  timezone,
  hasMore,
  onRowClick,
  onLoadMore,
  onCreateClick,
}: AppointmentsTableProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] py-16">
        <Calendar className="size-10 text-[var(--border)]" />
        <p className="text-sm text-[var(--text-muted)]">
          No appointments match your filters
        </p>
        <Button variant="outline" size="sm" onClick={onCreateClick}>
          Create appointment
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["Customer", "Service", "Staff", "Date & Time", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr
                key={appt.id}
                className="cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg)]"
                onClick={() => onRowClick(appt.id)}
              >
                <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                  {appt.customer?.name ?? "Unknown"}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                  {appt.service.name}
                  <span className="ml-1 text-xs">
                    ({appt.service.duration}m)
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                  {appt.teamMember?.name ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-sm tabular-nums text-[var(--text-muted)]">
                  {formatDate(appt.startAt, timezone, "MMM d, h:mm a")}
                </td>
                <td className="px-4 py-3">
                  <AppointmentStatusBadge status={appt.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="border-t border-[var(--border)] px-4 py-3 text-center">
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add src/components/appointments/appointments-table.tsx && git commit -m "feat: add AppointmentsTable component"
```

---

## Task 5: AppointmentsFilters Component

**Files:**
- Create: `src/components/appointments/appointments-filters.tsx`

- [ ] **Step 1: Write appointments-filters.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/appointments/appointments-filters.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { AppointmentStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffOption } from "@/lib/appointments-queries";

interface AppointmentsFiltersProps {
  staff: StaffOption[];
}

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Pending", value: AppointmentStatus.PENDING },
  { label: "Confirmed", value: AppointmentStatus.CONFIRMED },
  { label: "Completed", value: AppointmentStatus.COMPLETED },
  { label: "Cancelled", value: AppointmentStatus.CANCELLED },
] as const;

export function AppointmentsFilters({ staff }: AppointmentsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const currentStatus = searchParams.get("status") ?? "";
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";
  const currentStaffId = searchParams.get("staffId") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status tabs */}
      <div className="flex items-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-0.5 gap-0.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateParams({ status: tab.value })}
            className={`rounded-[4px] px-3 py-1 text-xs font-medium transition-colors ${
              currentStatus === tab.value
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={currentFrom}
          onChange={(e) => updateParams({ from: e.target.value })}
          className="h-7 w-36 text-xs"
        />
        <span className="text-xs text-[var(--text-muted)]">–</span>
        <Input
          type="date"
          value={currentTo}
          onChange={(e) => updateParams({ to: e.target.value })}
          className="h-7 w-36 text-xs"
        />
      </div>

      {/* Staff filter */}
      {staff.length > 0 && (
        <Select
          value={currentStaffId}
          onValueChange={(v) => updateParams({ staffId: v ?? "" })}
        >
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All staff</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
```

**Note for implementer:** The `Select` component is backed by `@base-ui/react/select`. If `onValueChange` signature doesn't match or the controlled `value` prop behaves differently, check `src/components/ui/select.tsx` — the primitive is `SelectPrimitive.Root` which accepts `value` and `onValueChange`. Adjust if the Base UI API differs.

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add src/components/appointments/appointments-filters.tsx && git commit -m "feat: add AppointmentsFilters component"
```

---

## Task 6: AppointmentSlideOver Component

**Files:**
- Create: `src/components/appointments/appointment-slide-over.tsx`

This is the most complex component. It handles three modes:
- **Loading**: slide-over is open but detail hasn't loaded yet
- **Edit**: existing appointment — full edit form
- **Create**: new appointment — same form + customer selector

Uses `react-hook-form` + `zod` for validation and `sonner` for success/error toasts.

- [ ] **Step 1: Write appointment-slide-over.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/appointments/appointment-slide-over.tsx`:

```tsx
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
    notes: z.string().optional().default(""),
    status: z.nativeEnum(AppointmentStatus),
    // create-only
    customerId: z.string().optional(),
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: "End time must be after start time",
    path: ["endAt"],
  });

type AppointmentFormData = z.infer<typeof appointmentSchema>;

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Format a Date to the value expected by <input type="datetime-local"> */
function toDatetimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppointmentSlideOverProps {
  open: boolean;
  onClose: () => void;
  /** Set when editing an existing appointment. Null for create mode. */
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

  // Fetch detail when slide-over opens for an existing appointment
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

  // Filtered customers for create mode
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold text-[var(--text-primary)]">
              {isCreateMode ? "New appointment" : (detail?.customer?.name ?? "Appointment")}
            </SheetTitle>
            {!isCreateMode && detail && (
              <AppointmentStatusBadge status={detail.status} />
            )}
          </div>
        </SheetHeader>

        {/* Error banner */}
        {errorBanner && (
          <div className="mx-5 mt-4 rounded-[5px] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {errorBanner}
          </div>
        )}

        {/* Loading state */}
        {loadingDetail && (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-[var(--text-muted)]" />
          </div>
        )}

        {/* Form */}
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
                              form.setValue("customerId", c.id, { shouldValidate: true });
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
                  value={form.watch("serviceId")}
                  onValueChange={(v) =>
                    form.setValue("serviceId", v ?? "", { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
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
                  value={form.watch("teamMemberId") ?? ""}
                  onValueChange={(v) =>
                    form.setValue("teamMemberId", v ?? "")
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
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
              <Button
                type="submit"
                disabled={saving}
                className="w-full"
              >
                {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                {isCreateMode ? "Create appointment" : "Save changes"}
              </Button>
              {!isCreateMode && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full mt-2"
                  disabled={saving || form.watch("status") === AppointmentStatus.CANCELLED}
                  onClick={async () => {
                    setSaving(true);
                    const result = await updateAppointment(tenantId, tenantSlug, appointmentId!, {
                      ...form.getValues(),
                      teamMemberId: form.getValues("teamMemberId") || null,
                      notes: form.getValues("notes") ?? "",
                      status: AppointmentStatus.CANCELLED,
                    });
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
```

**Note for implementer:** The `Sheet` component wraps `@base-ui/react/dialog`. The `open` and `onOpenChange` props on `<Sheet>` control it programmatically. If the Base UI Dialog's `onOpenChange` callback passes additional arguments (e.g., `(open, event, reason)`), adjust the handler: `onOpenChange={(o) => { if (!o) onClose(); }}`.

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -30
```
Fix any errors in this file only.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add src/components/appointments/appointment-slide-over.tsx && git commit -m "feat: add AppointmentSlideOver component"
```

---

## Task 7: AppointmentsClient Component

**Files:**
- Create: `src/components/appointments/appointments-client.tsx`

This is the thin Client Component that owns `selectedId` and `isCreateMode` state and wires everything together.

- [ ] **Step 1: Write appointments-client.tsx**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/components/appointments/appointments-client.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentsFilters } from "./appointments-filters";
import { AppointmentsTable } from "./appointments-table";
import { AppointmentSlideOver } from "./appointment-slide-over";
import type {
  AppointmentListItem,
  StaffOption,
  ServiceOption,
  CustomerOption,
} from "@/lib/appointments-queries";

interface AppointmentsClientProps {
  appointments: AppointmentListItem[];
  hasMore: boolean;
  staff: StaffOption[];
  services: ServiceOption[];
  customers: CustomerOption[];
  tenantId: string;
  tenantSlug: string;
  timezone: string;
}

export function AppointmentsClient({
  appointments,
  hasMore,
  staff,
  services,
  customers,
  tenantId,
  tenantSlug,
  timezone,
}: AppointmentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const slideOverOpen = selectedId !== null || isCreateMode;

  function handleRowClick(id: string) {
    setIsCreateMode(false);
    setSelectedId(id);
  }

  function handleCreateClick() {
    setSelectedId(null);
    setIsCreateMode(true);
  }

  function handleSlideOverClose() {
    setSelectedId(null);
    setIsCreateMode(false);
  }

  const handleLoadMore = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentPage = parseInt(params.get("page") ?? "1", 10);
    params.set("page", String(currentPage + 1));
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Appointments
        </h1>
        <Button size="sm" onClick={handleCreateClick}>
          <Plus className="size-3.5" />
          New appointment
        </Button>
      </div>

      {/* Filters */}
      <AppointmentsFilters staff={staff} />

      {/* Table */}
      <AppointmentsTable
        appointments={appointments}
        timezone={timezone}
        hasMore={hasMore}
        onRowClick={handleRowClick}
        onLoadMore={handleLoadMore}
        onCreateClick={handleCreateClick}
      />

      {/* Slide-over */}
      <AppointmentSlideOver
        open={slideOverOpen}
        onClose={handleSlideOverClose}
        appointmentId={isCreateMode ? null : selectedId}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
        timezone={timezone}
        services={services}
        staff={staff}
        customers={customers}
      />
    </>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add src/components/appointments/appointments-client.tsx && git commit -m "feat: add AppointmentsClient wrapper component"
```

---

## Task 8: Appointments Page

**Files:**
- Create: `src/app/(dashboard)/[tenant]/appointments/page.tsx`

Server Component. Reads search params, resolves tenant, fetches all data in parallel, renders `AppointmentsClient`.

**searchParams handling (Next.js 16):** `searchParams` is a `Promise` and must be `await`ed, just like `params`.

- [ ] **Step 1: Write the appointments page**

Create `/Users/zain/Appointment SaaS/appointment-saas-dashboard/src/app/(dashboard)/[tenant]/appointments/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getAppointments,
  getStaffOptions,
  getServiceOptions,
  getCustomerOptions,
} from "@/lib/appointments-queries";
import { AppointmentsClient } from "@/components/appointments/appointments-client";

export const metadata: Metadata = { title: "Appointments" };

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AppointmentsPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, timezone: true },
  });
  if (!tenant) redirect("/login");

  // Parse search params
  const statusParam = typeof sp.status === "string" ? sp.status : undefined;
  const status =
    statusParam && Object.values(AppointmentStatus).includes(statusParam as AppointmentStatus)
      ? (statusParam as AppointmentStatus)
      : undefined;

  const fromParam = typeof sp.from === "string" ? sp.from : undefined;
  const toParam = typeof sp.to === "string" ? sp.to : undefined;
  const staffId = typeof sp.staffId === "string" ? sp.staffId : undefined;
  const page = typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10)) : 1;

  const from = fromParam ? new Date(fromParam + "T00:00:00") : undefined;
  const to = toParam ? new Date(toParam + "T23:59:59") : undefined;

  const [{ appointments, hasMore }, staff, services, customers] =
    await Promise.all([
      getAppointments(tenant.id, { status, from, to, staffId, page }),
      getStaffOptions(tenant.id),
      getServiceOptions(tenant.id),
      getCustomerOptions(tenant.id),
    ]);

  return (
    <div className="space-y-4 p-6">
      <AppointmentsClient
        appointments={appointments}
        hasMore={hasMore}
        staff={staff}
        services={services}
        customers={customers}
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        timezone={tenant.timezone}
      />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add "src/app/(dashboard)/[tenant]/appointments/page.tsx" && git commit -m "feat: add appointments list page"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Step 2: Dev server smoke test**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && npm run dev > /tmp/nextdev-appts.log 2>&1 &
sleep 12
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
echo ""
pkill -f "next dev" 2>/dev/null || true
```
Expected: `200`. If not, check `/tmp/nextdev-appts.log`.

- [ ] **Step 3: Commit any remaining changes**

```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git status --short
```
Only commit if there are changes:
```bash
cd "/Users/zain/Appointment SaaS/appointment-saas-dashboard" && git add -A && git commit -m "chore: appointments feature complete" 2>/dev/null || echo "nothing to commit"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Appointments list at `/{slug}/appointments` | Task 8 (page) |
| Filter by status (All/Pending/Confirmed/Completed/Cancelled) | Tasks 5, 8 |
| Filter by date range | Tasks 5, 8 |
| Filter by staff member | Tasks 5, 8 |
| Filters push URL params (bookmarkable) | Task 5 |
| Paginated list, 20/page, "Load more" | Tasks 1, 4, 7 |
| Click row → slide-over | Tasks 4, 7 |
| Slide-over: view appointment detail | Task 6 |
| Slide-over: edit all fields (service, staff, time, notes, status) | Tasks 2, 6 |
| Slide-over: cancel appointment | Tasks 2, 6 |
| "New appointment" button → create mode slide-over | Tasks 6, 7 |
| Create: customer search typeahead | Task 6 |
| Server Actions with `revalidatePath` | Task 2 |
| Tenant ownership validation in actions | Task 2 |
| `endAt > startAt` validation (client + server) | Tasks 2, 6 |
| Empty state with "Create appointment" CTA | Task 4 |
| Error banner on action failure | Task 6 |
| Success toast on save/create | Task 6 |
| Status badge component (reusable) | Task 3 |

### Placeholder Scan

None — all steps contain complete, runnable code.

### Type Consistency

- `AppointmentListItem` defined in Task 1, used in Tasks 4, 7, 8. ✓
- `AppointmentDetail` defined in Task 1, used in Tasks 2, 6. ✓
- `StaffOption` defined in Task 1, used in Tasks 5, 6, 7, 8. ✓
- `ServiceOption` defined in Task 1, used in Tasks 6, 7, 8. ✓
- `CustomerOption` defined in Task 1, used in Tasks 6, 7, 8. ✓
- `ActionResult` defined in Task 2, return type of all three actions. ✓
- `fetchAppointmentDetail` server action called in Task 6 with `(tenantId, appointmentId)` — matches Task 2 signature. ✓
- `updateAppointment` called in Task 6 with `(tenantId, tenantSlug, appointmentId, data)` — matches Task 2. ✓
- `createAppointment` called in Task 6 with `(tenantId, tenantSlug, data)` — matches Task 2. ✓
- `AppointmentsClient` props in Task 7 match what the page passes in Task 8. ✓

---

## Next Plans (in order)

1. `2026-06-18-customers.md` — CRM table, detail panel
2. `2026-06-18-inbox.md` — 3-column chat, realtime
3. `2026-06-18-analytics.md` — Charts, heatmap, CSV export
4. `2026-06-18-settings.md` — Working hours, team, AI, profile
5. `2026-06-18-booking-page.md` — Public slot picker
6. `2026-06-18-api-routes.md` — AI chat, WhatsApp webhook
