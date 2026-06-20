import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AISettingsForm } from "@/components/settings/ai-settings-form";

export const metadata: Metadata = { title: "AI Settings" };

interface Props {
  params: Promise<{ tenant: string }>;
}

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
  gemini: ["gemini-1.5-pro", "gemini-1.5-flash"],
  grok: ["grok-2"],
};

export default async function AISettingsPage({ params }: Props) {
  const { tenant: slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, plan: true },
  });
  if (!tenant) redirect("/login");

  const aiSettings = await prisma.aISettings.findUnique({
    where: { tenantId: tenant.id },
    select: {
      provider: true,
      model: true,
      temperature: true,
      maxTokens: true,
      systemPrompt: true,
      autoBook: true,
      requireConfirm: true,
    },
  });

  const defaults = {
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: "",
    autoBook: true,
    requireConfirm: false,
  };

  const settings = aiSettings ?? defaults;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">AI Settings</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Configure the AI receptionist — provider, model, behavior, and personality.
        </p>
      </div>
      <AISettingsForm
        tenantId={tenant.id}
        settings={settings}
        providerModels={PROVIDER_MODELS}
      />
    </div>
  );
}
