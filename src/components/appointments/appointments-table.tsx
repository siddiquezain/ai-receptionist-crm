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
