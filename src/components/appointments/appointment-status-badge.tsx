import { AppointmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; statusClass: string }> = {
  PENDING:     { label: "Pending",     statusClass: "status-pending"     },
  CONFIRMED:   { label: "Confirmed",   statusClass: "status-confirmed"   },
  RESCHEDULED: { label: "Rescheduled", statusClass: "status-rescheduled" },
  CANCELLED:   { label: "Cancelled",   statusClass: "status-cancelled"   },
  NO_SHOW:     { label: "No Show",     statusClass: "status-no-show"     },
  COMPLETED:   { label: "Completed",   statusClass: "status-completed"   },
};

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={cn("status-badge", config.statusClass)}>
      <span className={cn("status-badge-dot", config.statusClass)} style={{ background: "currentColor" }} />
      {config.label}
    </span>
  );
}
