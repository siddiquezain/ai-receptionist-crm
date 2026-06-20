"use client";

import { useState, useTransition } from "react";
import { Calendar, RefreshCw, Trash2, CheckCircle, AlertCircle } from "lucide-react";

interface Integration {
  id: string;
  calendarId: string;
  syncDirection: string;
  lastSyncedAt: Date | null;
  isActive: boolean;
}

interface Props {
  tenantSlug: string;
  integrations: Integration[];
}

const DIRECTION_LABELS: Record<string, string> = {
  READ_ONLY: "Read only (import busy times)",
  WRITE_ONLY: "Write only (export appointments)",
  BIDIRECTIONAL: "Bidirectional",
};

export function CalendarPanel({ tenantSlug, integrations: initial }: Props) {
  const [integrations, setIntegrations] = useState(initial);
  const [syncDirection, setSyncDirection] = useState<"READ_ONLY" | "WRITE_ONLY" | "BIDIRECTIONAL">("BIDIRECTIONAL");
  const [isPending, startTransition] = useTransition();
  const [syncStatus, setSyncStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const activeIntegrations = integrations.filter((i) => i.isActive);

  function handleConnect() {
    const url = `/api/calendar/google/connect?tenantSlug=${tenantSlug}&syncDirection=${syncDirection}`;
    window.location.href = url;
  }

  function handleSync() {
    setSyncStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/calendar/google/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantSlug }),
        });
        const data = await res.json();
        if (data.ok) {
          setSyncStatus({ ok: true, msg: `Synced — ${data.created} events imported, ${data.deleted} old entries removed.` });
        } else {
          setSyncStatus({ ok: false, msg: data.error ?? "Sync failed" });
        }
      } catch {
        setSyncStatus({ ok: false, msg: "Network error" });
      }
    });
  }

  function handleDisconnect(integrationId: string) {
    startTransition(async () => {
      const res = await fetch("/api/calendar/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId, tenantSlug }),
      });
      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((i) => (i.id === integrationId ? { ...i, isActive: false } : i))
        );
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Google Calendar</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Sync appointments with Google Calendar to keep your schedule in one place.
        </p>
      </div>

      {/* Connected integrations */}
      {activeIntegrations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">Connected calendars</p>
          {activeIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--success)]/10">
                <Calendar className="h-4 w-4 text-[var(--success)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {integration.calendarId}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {DIRECTION_LABELS[integration.syncDirection] ?? integration.syncDirection}
                  {integration.lastSyncedAt &&
                    ` · Last synced ${integration.lastSyncedAt.toLocaleString()}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDisconnect(integration.id)}
                disabled={isPending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:opacity-50 transition-colors"
                title="Disconnect"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Sync busy times */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg)] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              Sync busy times now
            </button>
          </div>

          {syncStatus && (
            <div
              className={[
                "flex items-center gap-2 rounded-lg px-4 py-3 text-sm border",
                syncStatus.ok
                  ? "bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]"
                  : "bg-[var(--danger)]/10 border-[var(--danger)]/30 text-[var(--danger)]",
              ].join(" ")}
            >
              {syncStatus.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {syncStatus.msg}
            </div>
          )}
        </div>
      )}

      {/* Connect new */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {activeIntegrations.length > 0 ? "Connect another calendar" : "Connect Google Calendar"}
        </p>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Sync direction
          </label>
          <select
            value={syncDirection}
            onChange={(e) => setSyncDirection(e.target.value as typeof syncDirection)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="BIDIRECTIONAL">Bidirectional — sync both ways</option>
            <option value="WRITE_ONLY">Export only — push appointments to Google</option>
            <option value="READ_ONLY">Import only — pull busy times from Google</option>
          </select>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            <strong>Bidirectional:</strong> appointments appear in Google Calendar and Google events block your availability.
          </p>
        </div>

        <button
          type="button"
          onClick={handleConnect}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9V8h2v9zm4 0h-2V8h2v9z" />
          </svg>
          Connect with Google
        </button>
      </div>

      <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)] space-y-1">
        <p><strong>How it works:</strong></p>
        <p>• <strong>Export:</strong> New appointments are automatically added to your Google Calendar.</p>
        <p>• <strong>Import:</strong> Events in your Google Calendar block the corresponding time slots in your booking page.</p>
        <p>• Cancellations and rescheduled appointments are kept in sync automatically.</p>
      </div>
    </div>
  );
}
