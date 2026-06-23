import { AppointmentStatus } from "@prisma/client";
import { getStatusConfig } from "@/lib/appointment-status";

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  const config = getStatusConfig(status);
  return (
    <span
      aria-label={`Status: ${config.label}`}
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium ${config.className} ${className ?? ""}`}
    >
      {config.label}
    </span>
  );
}
