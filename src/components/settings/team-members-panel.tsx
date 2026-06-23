"use client";

import { useState, useTransition, useActionState } from "react";
import { UserPlus, X, CheckCircle, Circle } from "lucide-react";
import { createTeamMember, deactivateTeamMember, type SettingsState } from "@/lib/actions/settings";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string | null;
  isActive: boolean;
  createdAt: Date;
  inviteToken: string | null;
}

interface Props {
  tenantId: string;
  tenantSlug: string;
  members: Member[];
}

export function TeamMembersPanel({ tenantId, tenantSlug, members }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formState, formAction, formPending] = useActionState<SettingsState, FormData>(createTeamMember, {});

  const handleDeactivate = (memberId: string) => {
    setDeactivating(memberId);
    startTransition(async () => {
      await deactivateTeamMember(tenantId, memberId, tenantSlug);
      setDeactivating(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Member list */}
      <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <UserPlus className="size-8 text-[var(--border)]" />
            <p className="text-sm text-[var(--text-muted)]">No team members yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Name", "Email", "Role", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)]"
                >
                  <td className="px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">
                    {m.name}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-[var(--text-muted)]">{m.email}</td>
                  <td className="px-4 py-2.5 text-sm text-[var(--text-muted)]">
                    {m.role ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {m.isActive ? (
                        <CheckCircle className="size-3.5 text-[var(--success)]" />
                      ) : (
                        <Circle className="size-3.5 text-[var(--border)]" />
                      )}
                      <span
                        className={`text-xs ${
                          m.isActive ? "text-[var(--success)]" : "text-[var(--text-muted)]"
                        }`}
                      >
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {m.isActive && (
                      <button
                        onClick={() => handleDeactivate(m.id)}
                        disabled={deactivating === m.id || isPending}
                        className="text-xs text-[var(--danger)] hover:underline disabled:opacity-50"
                      >
                        {deactivating === m.id ? "Deactivating…" : "Deactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add member */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-[6px] border border-dashed border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] w-full justify-center"
        >
          <UserPlus className="size-4" />
          Add Team Member
        </button>
      ) : (
        <form
          action={formAction}
          className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">New Team Member</p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="size-4" />
            </button>
          </div>

          <input type="hidden" name="tenantId" value={tenantId} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-muted)]">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Jane Smith"
                className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-muted)]">Email *</label>
              <input
                type="email"
                name="email"
                required
                placeholder="jane@clinic.com"
                className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Job Title</label>
            <input
              type="text"
              name="role"
              placeholder="e.g. Doctor, Therapist"
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {formState.error && (
            <p className="text-xs text-[var(--danger)]">{formState.error}</p>
          )}
          {formState.success && (
            <p className="text-xs text-[var(--success)]">Team member added successfully.</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={formPending}
              className="rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {formPending ? "Adding…" : "Add Member"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-[6px] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
