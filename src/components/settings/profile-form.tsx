"use client";

import { useActionState } from "react";
import { updateProfile, type SettingsState } from "@/lib/actions/settings";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

interface Props {
  tenant: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    plan: string;
    logo: string | null;
  };
}

export function ProfileForm({ tenant }: Props) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenant.id} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Business Name
        </label>
        <input
          type="text"
          name="name"
          defaultValue={tenant.name}
          required
          className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          placeholder="Acme Clinic"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-primary)]">Slug</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">yourapp.com/</span>
          <input
            type="text"
            value={tenant.slug}
            readOnly
            className="flex-1 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-muted)] cursor-not-allowed"
          />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Slug cannot be changed after creation.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-primary)]">Timezone</label>
        <select
          name="timezone"
          defaultValue={tenant.timezone}
          className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-primary)]">Plan</label>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            {tenant.plan}
          </span>
        </div>
      </div>

      {state.error && (
        <p className="rounded-[6px] border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-[6px] border border-[var(--success)]/20 bg-[var(--success)]/5 px-3 py-2 text-sm text-[var(--success)]">
          Profile updated successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[6px] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
