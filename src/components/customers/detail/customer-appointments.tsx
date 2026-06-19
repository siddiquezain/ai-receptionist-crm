import Link from "next/link";
import { AppointmentStatusBadge } from "@/components/appointments/appointment-status-badge";
import { formatDate } from "@/lib/utils";
import type { CustomerAppointmentItem } from "@/lib/customers-queries";

interface CustomerAppointmentsProps {
  appointments: CustomerAppointmentItem[];
  tenantSlug: string;
  timezone: string;
}

export function CustomerAppointments({
  appointments,
  tenantSlug,
  timezone,
}: CustomerAppointmentsProps) {
  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Appointments
        </p>
      </div>

      {appointments.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
          No appointments yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Service", "Staff", "Date", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr
                  key={appt.id}
                  className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg)]"
                >
                  <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">
                    <Link
                      href={`/${tenantSlug}/appointments?highlight=${appt.id}`}
                      className="hover:underline"
                    >
                      {appt.service.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-[var(--text-muted)]">
                    {appt.teamMember?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm tabular-nums text-[var(--text-muted)]">
                    {formatDate(appt.startAt, timezone, "MMM d, h:mm a")}
                  </td>
                  <td className="px-4 py-2.5">
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
