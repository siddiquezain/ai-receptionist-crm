import { formatDate } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { getStatusConfig } from "@/lib/appointment-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UpcomingAppointment } from "@/lib/dashboard-queries";

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
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border)]">
                {["Customer", "Service", "Staff", "Time", "Status"].map((h) => (
                  <TableHead
                    key={h}
                    className="px-4 py-2 text-xs font-medium text-[var(--text-muted)]"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appt) => {
                const config = getStatusConfig(appt.status);
                return (
                  <TableRow
                    key={appt.id}
                    className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg)]"
                  >
                    <TableCell className="px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">
                      {appt.customer?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="px-4 py-2.5 text-sm text-[var(--text-muted)]">
                      {appt.service.name}
                      <span className="ml-1 text-xs">
                        ({appt.service.duration}m)
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-2.5 text-sm text-[var(--text-muted)]">
                      {appt.teamMember?.name ?? "—"}
                    </TableCell>
                    <TableCell className="px-4 py-2.5 font-mono text-sm tabular-nums text-[var(--text-muted)]">
                      {formatDate(appt.startAt, timezone, "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      <span
                        aria-label={`Status: ${config.label}`}
                        className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium ${config.className}`}
                      >
                        {config.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
