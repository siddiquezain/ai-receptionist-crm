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

export function CustomerSnapshotPanel({
  snapshot,
  tenantSlug,
  timezone,
}: CustomerSnapshotProps) {
  if (!snapshot) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10">
        <User className="size-8 text-[var(--border)]" />
        <p className="text-sm text-[var(--text-muted)]">No customer linked</p>
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
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-semibold text-[var(--accent)]">
          {initials}
        </div>
        <div className="min-w-0">
          <Link
            href={`/${tenantSlug}/customers/${snapshot.id}`}
            className="text-sm font-semibold text-[var(--text-primary)] hover:underline"
          >
            {snapshot.name}
          </Link>
          {snapshot.email && (
            <p className="truncate text-xs text-[var(--text-muted)]">
              {snapshot.email}
            </p>
          )}
          {snapshot.phone && (
            <p className="text-xs text-[var(--text-muted)]">{snapshot.phone}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      {snapshot.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {snapshot.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Appointments */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Appointments
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {snapshot.totalAppointments} total
        </p>

        {snapshot.nextAppointment && (
          <div className="rounded-[5px] border border-[var(--border)] bg-[var(--bg)] p-2.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3 shrink-0 text-[var(--text-muted)]" />
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {snapshot.nextAppointment.service.name}
              </p>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              {formatDate(snapshot.nextAppointment.startAt, timezone, "MMM d, h:mm a")}
            </p>
            <AppointmentStatusBadge status={snapshot.nextAppointment.status} />
          </div>
        )}
      </div>
    </div>
  );
}
