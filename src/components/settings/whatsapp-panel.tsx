"use client";

import { useActionState, useEffect } from "react";
import { MessageCircle, CheckCircle, AlertCircle, Copy, Unlink } from "lucide-react";
import { updateWhatsappSettings, disconnectWhatsapp } from "@/lib/actions/settings";
import type { SettingsState } from "@/lib/actions/settings";

interface Props {
  tenantId: string;
  instanceName: string | null;
  isConnected: boolean;
  appUrl: string;
}

const initial: SettingsState = {};

export function WhatsappPanel({ tenantId, instanceName, isConnected, appUrl }: Props) {
  const [saveState, saveAction, saving] = useActionState(updateWhatsappSettings, initial);
  const [disconnectState, disconnectAction, disconnecting] = useActionState(disconnectWhatsapp, initial);

  // n8n target URL that Evolution API should be configured to call
  const n8nWebhookNote = "Configure your Evolution API instance to send webhook events directly to your n8n workflow URL.";
  // Fallback URL (Next.js shim — used when n8n is not yet set up)
  const fallbackWebhookUrl = `${appUrl}/api/whatsapp/webhook`;
  const verifyToken = process.env.NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN ?? "not-used-for-evolution-api";

  useEffect(() => {
    if (saveState.success || disconnectState.success) {
      window.location.reload();
    }
  }, [saveState.success, disconnectState.success]);

  function copyUrl() {
    navigator.clipboard.writeText(fallbackWebhookUrl).catch(() => undefined);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">WhatsApp via Evolution API</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Connect your WhatsApp Business number through Evolution API so customers can book via chat.
          n8n orchestrates the entire conversation flow.
        </p>
      </div>

      {/* Architecture note */}
      <div className="rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/5 px-4 py-3 text-xs text-[var(--text-muted)] space-y-1.5">
        <p className="font-semibold text-[var(--text-primary)]">Architecture</p>
        <p>• <strong>Production:</strong> Evolution API → n8n → Supabase. No Next.js in the message path.</p>
        <p>• <strong>Development / fallback:</strong> Evolution API → Next.js fallback webhook → local AI agent.</p>
        <p>• The credentials below are stored in Supabase for n8n to read when it needs to send outbound messages.</p>
      </div>

      {/* Webhook configuration */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <p className="text-sm font-medium text-[var(--text-primary)]">Webhook configuration</p>
        <p className="text-xs text-[var(--text-muted)]">
          In your Evolution API instance settings, set the webhook URL to your <strong>n8n workflow webhook URL</strong>.
          {" "}Subscribe to the <code className="rounded bg-[var(--bg)] px-1 py-0.5">MESSAGES_UPSERT</code> event.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {n8nWebhookNote}
        </p>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Fallback webhook URL (Next.js — dev only)
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={fallbackWebhookUrl}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg)] transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Use this URL only during development. Replace with your n8n webhook URL in production.
          </p>
        </div>
      </div>

      {/* Connected status */}
      {isConnected && instanceName && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/8 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--success)]/15">
            <MessageCircle className="h-4 w-4 text-[var(--success)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">Evolution API connected</p>
            <p className="text-xs text-[var(--text-muted)] truncate">Instance: {instanceName}</p>
          </div>
          <form action={disconnectAction}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <button
              type="submit"
              disabled={disconnecting}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/8 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/15 disabled:opacity-50 transition-colors"
            >
              <Unlink className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </form>
        </div>
      )}

      {disconnectState.error && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-4 py-3 text-sm text-[var(--danger)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {disconnectState.error}
        </div>
      )}

      {/* Credentials form */}
      <form action={saveAction} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {isConnected ? "Update Evolution API credentials" : "Connect Evolution API"}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          These credentials are stored in Supabase. n8n reads them to send outbound WhatsApp messages on your behalf.
        </p>

        <input type="hidden" name="tenantId" value={tenantId} />

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Instance Name
          </label>
          <input
            name="evolutionInstanceName"
            type="text"
            placeholder="e.g. my-business"
            defaultValue={instanceName ?? ""}
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            The instance name you created in Evolution API.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            API Key
          </label>
          <input
            name="evolutionApiKey"
            type="password"
            placeholder={isConnected ? "Enter new API key to update" : "Your Evolution API key"}
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            The API key for your Evolution API instance. Found in your Evolution API admin panel.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Evolution API Server URL
            <span className="ml-1.5 text-[var(--text-muted)] font-normal">(optional)</span>
          </label>
          <input
            name="evolutionApiUrl"
            type="url"
            placeholder={`Default: ${process.env.NEXT_PUBLIC_EVOLUTION_API_URL ?? "EVOLUTION_API_URL env var"}`}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Leave blank to use the global <code>EVOLUTION_API_URL</code> env var. Set per-tenant only for multi-server setups.
          </p>
        </div>

        {saveState.error && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-3 py-2.5 text-sm text-[var(--danger)]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveState.error}
          </div>
        )}

        {saveState.success && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 px-3 py-2.5 text-sm text-[var(--success)]">
            <CheckCircle className="h-4 w-4 shrink-0" />
            WhatsApp settings saved.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : isConnected ? "Update" : "Connect"}
        </button>
      </form>
    </div>
  );
}
