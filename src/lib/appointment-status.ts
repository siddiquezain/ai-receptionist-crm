import { AppointmentStatus } from "@prisma/client";

export const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  },
  NO_SHOW: {
    label: "No Show",
    className: "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  },
};

export function getStatusConfig(status: AppointmentStatus) {
  return APPOINTMENT_STATUS_CONFIG[status];
}
