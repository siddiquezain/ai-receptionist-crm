import { formatDate } from "@/lib/utils";
import { Calendar } from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";
import type { UpcomingAppointment } from "@/lib/dashboard-queries";

const STATUS: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
  },
  NO_SHOW: {
    label: "No Show",
    className:
      "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    className:
      "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  },
};

interface Props {
  appointments: UpcomingAppointment[];
  timezone: string;
}

export function UpcomingAppointments({ appointments, timezone }: Props) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Upcoming Appointments
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10">
          <Calendar className="size-8 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">
            No upcoming appointments
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Customer", "Service", "Staff", "Time", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => {
                const s = STATUS[appt.status] ?? STATUS.PENDING;
                return (
                  <tr
                    key={appt.id}
                    className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg)]"
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">
                      {appt.customer?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-muted)]">
                      {appt.service.name}
                      <span className="ml-1 text-xs">
                        ({appt.service.duration}m)
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-muted)]">
                      {appt.teamMember?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm tabular-nums text-[var(--text-muted)]">
                      {formatDate(appt.startAt, timezone, "MMM d, h:mm a")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}
                      >
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
