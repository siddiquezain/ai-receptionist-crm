import { formatDate } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/appointments/appointment-status-badge";
import type { UpcomingAppointment } from "@/lib/dashboard-queries";

interface Props {
  appointments: UpcomingAppointment[];
  timezone: string;
}

export function UpcomingAppointments({ appointments, timezone }: Props) {
  return (
    <div
      className="rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p className="section-label">Upcoming Appointments</p>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 px-5 py-12">
          <div
            className="flex size-10 items-center justify-center rounded-[var(--radius-lg)]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Calendar className="size-5" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            No upcoming appointments
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {["Customer", "Service", "Staff", "Time", "Status"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id}>
                  <td className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {appt.customer?.name ?? "Unknown"}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {appt.service.name}
                    <span className="ml-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {appt.service.duration}m
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {appt.teamMember?.name ?? "—"}
                  </td>
                  <td
                    className="font-mono tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {formatDate(appt.startAt, timezone, "MMM d, h:mm a")}
                  </td>
                  <td>
                    <AppointmentStatusBadge status={appt.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
