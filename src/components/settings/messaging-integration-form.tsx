"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  saveMessagingIntegration,
  disableMessagingIntegration,
} from "@/lib/actions/integrations";

interface Existing {
  id: string;
  provider: string;
  instanceName: string;
  displayName: string | null;
  phoneNumber: string | null;
  apiEndpoint: string | null;
  isActive: boolean;
  lastConnectedAt: Date | null;
}

interface Props {
  tenantId: string;
  tenantSlug: string;
  existing: Existing | null;
}

interface FormValues {
  instanceName: string;
  displayName: string;
  apiEndpoint: string;
  apiKey: string;
  phoneNumber: string;
}

export function MessagingIntegrationForm({ tenantId, tenantSlug, existing }: Props) {
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      instanceName: existing?.instanceName ?? "",
      displayName: existing?.displayName ?? "",
      apiEndpoint: existing?.apiEndpoint ?? "",
      apiKey: "",
      phoneNumber: existing?.phoneNumber ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const result = await saveMessagingIntegration(tenantId, tenantSlug, {
        provider: "EVOLUTION_API",
        instanceName: values.instanceName,
        displayName: values.displayName,
        apiEndpoint: values.apiEndpoint,
        apiKey: values.apiKey,
        phoneNumber: values.phoneNumber || undefined,
      });
      if (result.success) {
        toast.success("WhatsApp integration saved");
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (!existing) return;
    setDisabling(true);
    try {
      const result = await disableMessagingIntegration(
        tenantId,
        tenantSlug,
        existing.id
      );
      if (result.success) {
        toast.success("Integration disabled");
      } else {
        toast.error(result.error);
      }
    } finally {
      setDisabling(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            WhatsApp via Evolution API
          </h3>
          {existing ? (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {existing.isActive ? (
                <span className="text-green-500">Connected</span>
              ) : (
                <span className="text-[var(--text-muted)]">Disconnected</span>
              )}
              {existing.phoneNumber && ` · ${existing.phoneNumber}`}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Not connected</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Instance Name
          </label>
          <input
            {...register("instanceName", { required: "Required" })}
            placeholder="acme-salon"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          {errors.instanceName && (
            <p className="text-xs text-red-500">{errors.instanceName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Display Name
          </label>
          <input
            {...register("displayName")}
            placeholder="Main WhatsApp"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            API Endpoint
          </label>
          <input
            {...register("apiEndpoint")}
            placeholder="https://your-evolution-api.example.com"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            API Key
          </label>
          <input
            {...register("apiKey", { required: "Required" })}
            type="password"
            placeholder={
              existing
                ? "Leave blank to keep existing key"
                : "Paste your Evolution API key"
            }
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          {errors.apiKey && (
            <p className="text-xs text-red-500">{errors.apiKey.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Phone Number (optional)
          </label>
          <input
            {...register("phoneNumber")}
            placeholder="+14155551234"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? "Saving…" : existing ? "Update Integration" : "Connect WhatsApp"}
          </button>

          {existing && existing.isActive && (
            <button
              type="button"
              onClick={handleDisable}
              disabled={disabling}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {disabling ? "Disabling…" : "Disable"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
