import Link from "next/link";
import { User, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AppointmentStatusBadge } from "@/components/appointments/appointment-status-badge";
import type { CustomerSnapshot } from "@/lib/inbox-queries";

interface CustomerSnapshotProps {
  snapshot: CustomerSnapshot | null;
  tenantSlug: string;
  timezone: string;
}

export function CustomerSnapshotPanel({ snapshot, tenantSlug, timezone }: CustomerSnapshotProps) {
  if (!snapshot) {
    return (
      <div className="flex flex-col items-center gap-2.5 px-4 py-12">
        <div
          className="flex size-10 items-center justify-center rounded-[var(--radius-lg)]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <User className="size-5" style={{ color: "var(--text-muted)" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No customer linked</p>
      </div>
    );
  }

  const initials = snapshot.name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-4 px-4 py-4">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <Link
            href={`/${tenantSlug}/customers/${snapshot.id}`}
            className="text-sm font-semibold transition-colors"
            style={{ color: "var(--text-primary)" }}
          >
            {snapshot.name}
          </Link>
          {snapshot.email && (
            <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
              {snapshot.email}
            </p>
          )}
          {snapshot.phone && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{snapshot.phone}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      {snapshot.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {snapshot.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "var(--accent-subtle)",
                color: "var(--accent)",
                border: "1px solid var(--accent-subtle-border)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* Appointments */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="section-label">Appointments</p>
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {snapshot.totalAppointments} total
          </span>
        </div>

        {snapshot.nextAppointment && (
          <div
            className="rounded-[var(--radius-md)] p-3 space-y-1.5"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3 shrink-0" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {snapshot.nextAppointment.service.name}
              </p>
            </div>
            <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
              {formatDate(snapshot.nextAppointment.startAt, timezone, "MMM d, h:mm a")}
            </p>
            <AppointmentStatusBadge status={snapshot.nextAppointment.status} />
          </div>
        )}
      </div>
    </div>
  );
}
