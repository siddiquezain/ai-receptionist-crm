import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/prisma-enums";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-[var(--warning-subtle)] border-[var(--warning-subtle-border)] text-[var(--warning)]",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-[var(--success-subtle)] border-[var(--success-subtle-border)] text-[var(--success)]",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-[var(--danger-subtle)] border-[var(--danger-subtle-border)] text-[var(--danger)]",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]",
  },
  NO_SHOW: {
    label: "No Show",
    className:
      "bg-[var(--danger-subtle)] border-[var(--danger-subtle-border)] text-[var(--danger)]",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    className:
      "bg-[var(--warning-subtle)] border-[var(--warning-subtle-border)] text-[var(--warning)]",
  },
};

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function AppointmentStatusBadge({
  status,
  className,
}: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        config.className,
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
