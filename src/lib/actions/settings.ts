"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── Profile ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1, "Business name is required").max(100),
  timezone: z.string().min(1, "Timezone is required"),
});

export type SettingsState = { error?: string; success?: boolean };

export async function updateProfile(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const raw = Object.fromEntries(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tenantId, name, timezone } = parsed.data;

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { name, timezone },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    revalidatePath(`/${tenant?.slug}/settings/profile`);
    return { success: true };
  } catch {
    return { error: "Failed to update profile" };
  }
}

// ─── Working Hours ────────────────────────────────────────────────────────────

const workingHoursSchema = z.object({
  tenantId: z.string(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  isOpen: z.coerce.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
});

export async function upsertWorkingHours(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const raw = {
    tenantId: formData.get("tenantId"),
    dayOfWeek: formData.get("dayOfWeek"),
    isOpen: formData.get("isOpen") === "true",
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  };

  const parsed = workingHoursSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tenantId, dayOfWeek, isOpen, startTime, endTime } = parsed.data;

  try {
    const existing = await prisma.workingHours.findFirst({
      where: { tenantId, dayOfWeek, teamMemberId: null },
    });

    if (existing) {
      await prisma.workingHours.update({
        where: { id: existing.id },
        data: { isOpen, startTime, endTime },
      });
    } else {
      await prisma.workingHours.create({
        data: { tenantId, dayOfWeek, isOpen, startTime, endTime },
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    revalidatePath(`/${tenant?.slug}/settings/working-hours`);
    return { success: true };
  } catch {
    return { error: "Failed to save working hours" };
  }
}

// ─── Team Members ─────────────────────────────────────────────────────────────

const teamMemberSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Enter a valid email"),
  role: z.string().optional(),
});

export async function createTeamMember(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const raw = Object.fromEntries(formData);
  const parsed = teamMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tenantId, name, email, role } = parsed.data;

  try {
    const existing = await prisma.teamMember.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
    if (existing) {
      return { error: "A team member with this email already exists" };
    }

    await prisma.teamMember.create({
      data: {
        tenantId,
        name,
        email,
        role: role || null,
        inviteToken: crypto.randomUUID(),
      },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    revalidatePath(`/${tenant?.slug}/settings/team`);
    return { success: true };
  } catch {
    return { error: "Failed to create team member" };
  }
}

export async function deactivateTeamMember(teamMemberId: string, tenantSlug: string) {
  await prisma.teamMember.update({
    where: { id: teamMemberId },
    data: { isActive: false },
  });
  revalidatePath(`/${tenantSlug}/settings/team`);
}

// ─── AI Settings ──────────────────────────────────────────────────────────────

const aiSettingsSchema = z.object({
  tenantId: z.string(),
  provider: z.enum(["openai", "anthropic", "gemini", "grok"]),
  model: z.string().min(1),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(100).max(8000),
  systemPrompt: z.string().max(4000).optional(),
  autoBook: z.coerce.boolean(),
  requireConfirm: z.coerce.boolean(),
});

export async function updateAISettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const raw = {
    tenantId: formData.get("tenantId"),
    provider: formData.get("provider"),
    model: formData.get("model"),
    temperature: formData.get("temperature"),
    maxTokens: formData.get("maxTokens"),
    systemPrompt: formData.get("systemPrompt") || undefined,
    autoBook: formData.get("autoBook") === "true",
    requireConfirm: formData.get("requireConfirm") === "true",
  };

  const parsed = aiSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tenantId, ...data } = parsed.data;

  try {
    await prisma.aISettings.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    revalidatePath(`/${tenant?.slug}/settings/ai`);
    return { success: true };
  } catch {
    return { error: "Failed to update AI settings" };
  }
}

// ─── WhatsApp / Evolution API ─────────────────────────────────────────────────

const whatsappSchema = z.object({
  tenantId: z.string(),
  evolutionInstanceName: z.string().min(1, "Instance name is required"),
  evolutionApiKey: z.string().min(1, "API key is required"),
  evolutionApiUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export async function updateWhatsappSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const raw = {
    tenantId: formData.get("tenantId"),
    evolutionInstanceName: formData.get("evolutionInstanceName"),
    evolutionApiKey: formData.get("evolutionApiKey"),
    evolutionApiUrl: formData.get("evolutionApiUrl") || undefined,
  };

  const parsed = whatsappSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tenantId, evolutionInstanceName, evolutionApiKey, evolutionApiUrl } = parsed.data;

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        evolutionInstanceName,
        evolutionApiKey,
        evolutionApiUrl: evolutionApiUrl || null,
      },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    revalidatePath(`/${tenant?.slug}/settings/whatsapp`);
    return { success: true };
  } catch {
    return { error: "Instance name is already in use by another account." };
  }
}

export async function disconnectWhatsapp(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const tenantId = formData.get("tenantId") as string;
  if (!tenantId) return { error: "Missing tenant" };

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { evolutionInstanceName: null, evolutionApiKey: null, evolutionApiUrl: null },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    revalidatePath(`/${tenant?.slug}/settings/whatsapp`);
    return { success: true };
  } catch {
    return { error: "Failed to disconnect WhatsApp" };
  }
}
