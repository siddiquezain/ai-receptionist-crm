"use client";

import { Calendar } from "lucide-react";
import { AppointmentStatusBadge } from "./appointment-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import type { AppointmentListItem } from "@/lib/appointments-queries";
import { Button } from "@/components/ui/button";

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
      <EmptyState
        icon={Calendar}
        heading="No appointments found"
        subtext="Adjust your filters or create a new appointment."
        action={{ label: "New appointment", onClick: onCreateClick }}
      />
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
      style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-sm)" }}
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
