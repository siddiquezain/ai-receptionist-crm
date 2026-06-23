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
      <div
        className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] py-20"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="flex size-12 items-center justify-center rounded-[var(--radius-lg)]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Calendar className="size-5" style={{ color: "var(--text-muted)" }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            No appointments found
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Adjust your filters or create a new appointment.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onCreateClick}>
          New appointment
        </Button>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {["Customer", "Service", "Staff", "Date & Time", "Status"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr
                key={appt.id}
                className="cursor-pointer"
                onClick={() => onRowClick(appt.id)}
              >
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

      {hasMore && (
        <div
          className="px-5 py-3 text-center"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
