"use client";

import { useActionState, useEffect, useRef } from "react";
import { MessageCircle, CheckCircle, AlertCircle, Copy, Unlink } from "lucide-react";
import { updateWhatsappSettings, disconnectWhatsapp } from "@/lib/actions/settings";
import type { SettingsState } from "@/lib/actions/settings";

interface Props {
  tenantId: string;
  tenantSlug: string;
  phoneNumberId: string | null;
  isConnected: boolean;
  appUrl: string;
}

const initial: SettingsState = {};

export function WhatsappPanel({ tenantId, tenantSlug, phoneNumberId, isConnected, appUrl }: Props) {
  const [saveState, saveAction, saving] = useActionState(updateWhatsappSettings, initial);
  const [disconnectState, disconnectAction, disconnecting] = useActionState(disconnectWhatsapp, initial);
  const copyRef = useRef<HTMLInputElement>(null);

  const webhookUrl = `${appUrl}/api/whatsapp/webhook`;
  const verifyToken = process.env.NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN ?? "appointease-verify";

  useEffect(() => {
    if (saveState.success || disconnectState.success) {
      window.location.reload();
    }
  }, [saveState.success, disconnectState.success]);

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl).catch(() => undefined);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">WhatsApp Integration</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Let customers book appointments by chatting with your AI agent on WhatsApp.
        </p>
      </div>

      {/* Webhook URL */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <p className="text-sm font-medium text-[var(--text-primary)]">Webhook configuration</p>
        <p className="text-xs text-[var(--text-muted)]">
          In your Meta for Developers app, set the webhook URL and verify token below under
          <strong> WhatsApp → Configuration → Webhook</strong>. Subscribe to the{" "}
          <code className="rounded bg-[var(--bg)] px-1 py-0.5">messages</code> field.
        </p>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Webhook URL</label>
          <div className="flex items-center gap-2">
            <input
              ref={copyRef}
              readOnly
              value={webhookUrl}
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
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Verify Token</label>
          <input
            readOnly
            value={verifyToken}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none"
          />
        </div>
      </div>

      {/* Connected status */}
      {isConnected && phoneNumberId && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/8 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--success)]/15">
            <MessageCircle className="h-4 w-4 text-[var(--success)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">WhatsApp connected</p>
            <p className="text-xs text-[var(--text-muted)] truncate">Phone Number ID: {phoneNumberId}</p>
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

      {/* Connect / update form */}
      <form action={saveAction} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {isConnected ? "Update credentials" : "Connect WhatsApp"}
        </p>

        <input type="hidden" name="tenantId" value={tenantId} />

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Phone Number ID
          </label>
          <input
            name="whatsappPhoneNumberId"
            type="text"
            placeholder="e.g. 123456789012345"
            defaultValue={phoneNumberId ?? ""}
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Found in Meta for Developers → WhatsApp → API Setup.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Permanent Access Token
          </label>
          <input
            name="whatsappAccessToken"
            type="password"
            placeholder={isConnected ? "Enter new token to update" : "EAAxxxxxxxxx…"}
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Generate a permanent system user token in Meta Business Suite — temporary tokens expire in 24 hours.
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
          {saving ? "Saving…" : isConnected ? "Update" : "Connect WhatsApp"}
        </button>
      </form>

      {/* How it works */}
      <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)] space-y-1.5">
        <p className="font-semibold text-[var(--text-primary)]">How it works</p>
        <p>• Customers send a WhatsApp message to your business number.</p>
        <p>• AppointEase&apos;s AI agent replies, checks availability, and books the appointment.</p>
        <p>• Conversations are logged in the Inbox with full history.</p>
        <p>• Email reminders and calendar sync work automatically — just like web bookings.</p>
      </div>
    </div>
  );
}
