"use client";

import { useState, useActionState } from "react";
import { updateAISettings, type SettingsState } from "@/lib/actions/settings";

interface Settings {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string | null;
  autoBook: boolean;
  requireConfirm: boolean;
}

interface Props {
  tenantId: string;
  settings: Settings;
  providerModels: Record<string, string[]>;
}

export function AISettingsForm({ tenantId, settings, providerModels }: Props) {
  const [provider, setProvider] = useState(settings.provider);
  const models = providerModels[provider] ?? [];

  const [state, action, pending] = useActionState<SettingsState, FormData>(updateAISettings, {});

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="tenantId" value={tenantId} />

      {/* Provider & Model */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
          Provider & Model
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Provider</label>
            <select
              name="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="grok">Grok (xAI)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Model</label>
            <select
              name="model"
              defaultValue={settings.model}
              key={provider}
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Behavior */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
          Behavior
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Temperature
              <span className="ml-1 text-xs text-[var(--text-muted)]">(0 = precise, 2 = creative)</span>
            </label>
            <input
              type="number"
              name="temperature"
              defaultValue={settings.temperature}
              min={0}
              max={2}
              step={0.1}
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Max Tokens
            </label>
            <input
              type="number"
              name="maxTokens"
              defaultValue={settings.maxTokens}
              min={100}
              max={8000}
              step={100}
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-3">
          <BoolToggle
            name="autoBook"
            label="Auto-Book"
            description="Automatically confirm appointments when the AI detects a booking intent."
            defaultChecked={settings.autoBook}
          />
          <BoolToggle
            name="requireConfirm"
            label="Require Staff Confirmation"
            description="Create appointments as Pending — a staff member must confirm before the customer is notified."
            defaultChecked={settings.requireConfirm}
          />
        </div>
      </section>

      {/* System prompt */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
          Personality
        </h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-primary)]">System Prompt</label>
          <p className="text-xs text-[var(--text-muted)]">
            Instructions prepended to every conversation. Describe the AI&apos;s tone, business context, and any rules.
          </p>
          <textarea
            name="systemPrompt"
            defaultValue={settings.systemPrompt ?? ""}
            rows={6}
            maxLength={4000}
            placeholder="You are a friendly AI receptionist for Acme Clinic. Your job is to help patients book appointments. Always be professional and empathetic..."
            className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none resize-y"
          />
        </div>
      </section>

      {state.error && (
        <p className="rounded-[6px] border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-[6px] border border-[var(--success)]/20 bg-[var(--success)]/5 px-3 py-2 text-sm text-[var(--success)]">
          AI settings saved successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[6px] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}

function BoolToggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-start gap-3 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
      <input type="hidden" name={name} value={String(checked)} />
      <button
        type="button"
        onClick={() => setChecked((v) => !v)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
  );
}
