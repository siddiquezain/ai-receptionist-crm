import Link from "next/link";
import { AppointmentStatusBadge } from "@/components/appointments/appointment-status-badge";
import { formatDate } from "@/lib/utils";
import type { CustomerAppointmentItem } from "@/lib/customers-queries";

interface CustomerAppointmentsProps {
  appointments: CustomerAppointmentItem[];
  tenantSlug: string;
  timezone: string;
}

export function CustomerAppointments({ appointments, tenantSlug, timezone }: CustomerAppointmentsProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="section-label">Appointments</p>
      </div>

      {appointments.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No appointments yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {["Service", "Staff", "Date", "Status"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id}>
                  <td>
                    <Link
                      href={`/${tenantSlug}/appointments?highlight=${appt.id}`}
                      className="font-medium transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {appt.service.name}
                    </Link>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {appt.teamMember?.name ?? "—"}
                  </td>
                  <td className="font-mono tabular-nums" style={{ color: "var(--text-secondary)" }}>
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
