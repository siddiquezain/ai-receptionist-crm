import { prisma } from "@/lib/prisma";
import { getAIProvider, estimateCostUsd } from "./index";
import type { AIMessage } from "./types";
import { getAvailableSlots, getAvailableDates } from "@/lib/booking-queries";
import { queueBookingNotifications } from "@/lib/notifications";
import { pushAppointmentSync } from "@/lib/calendar/sync";

// ─── System prompt builder ────────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function buildSystemPrompt(tenantId: string): Promise<string> {
  const [tenant, services, workingHours, aiSettings] = await Promise.all([
    prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { name: true, timezone: true },
    }),
    prisma.service.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: { id: true, name: true, description: true, duration: true, price: true, currency: true },
      orderBy: { name: "asc" },
    }),
    prisma.workingHours.findMany({
      where: { tenantId, teamMemberId: null },
      select: { dayOfWeek: true, isOpen: true, startTime: true, endTime: true },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.aISettings.findFirst({
      where: { tenantId },
      select: { systemPrompt: true },
    }),
  ]);

  const servicesText = services
    .map(
      (s) =>
        `- ${s.name} (${s.duration} min${s.price ? `, ${s.currency} ${s.price}` : ""}) [ID: ${s.id}]${
          s.description ? " — " + s.description : ""
        }`
    )
    .join("\n");

  const hoursText = workingHours
    .filter((h) => h.isOpen)
    .map((h) => `- ${DAY_NAMES[h.dayOfWeek]}: ${h.startTime}–${h.endTime}`)
    .join("\n");

  const today = new Date().toISOString().slice(0, 10);

  return `You are a friendly AI booking assistant for ${tenant?.name ?? "this business"}.
Today's date: ${today} (${tenant?.timezone ?? "UTC"} timezone)

## Services
${servicesText || "No services currently available."}

## Working Hours
${hoursText || "Contact us for availability."}

## How to help customers book
1. Greet and identify what service they want (match to a service ID above).
2. Ask for their preferred date.
3. Check real availability: output exactly <check_slots>{"serviceId":"ID","date":"YYYY-MM-DD"}</check_slots>
4. Present the available time slots to the customer and ask them to pick one.
5. Collect their name and phone number (required). Email is optional.
6. Confirm all details, then book: output exactly <book>{"serviceId":"ID","date":"YYYY-MM-DD","time":"HH:MM","name":"NAME","phone":"PHONE","email":"EMAIL"}</book>

## Rules
- Always use <check_slots> before stating available times — never invent time slots.
- Place action tags on their own line. Never nest them or use them in casual text.
- The <book> tag ends your message — do not add text after it.
- If a date has no slots, suggest trying a nearby date and use <check_slots> again.
- Keep replies concise and conversational.${
    aiSettings?.systemPrompt ? "\n\n## Additional Instructions\n" + aiSettings.systemPrompt : ""
  }`;
}

// ─── Tool parsers ─────────────────────────────────────────────────────────────

function extractTag<T>(text: string, tag: string): { value: T; stripped: string } | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = text.match(re);
  if (!match) return null;
  try {
    const value = JSON.parse(match[1].trim()) as T;
    const stripped = text.replace(re, "").trim();
    return { value, stripped };
  } catch {
    return null;
  }
}

// ─── Booking helper (shared with API route) ───────────────────────────────────

export interface BookingParams {
  tenantId: string;
  serviceId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  conversationId?: string;
}

export async function executeBooking(params: BookingParams): Promise<string> {
  const { tenantId, serviceId, date, time, name, phone, email, notes, conversationId } = params;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId, isActive: true },
    select: { duration: true, bufferTime: true, name: true },
  });
  if (!service) return "crit:Service not found";

  const [h, m] = time.split(":").map(Number);
  const startAt = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`);
  const endAt = new Date(startAt.getTime() + (service.duration + service.bufferTime) * 60000);

  let customer = await prisma.customer.findFirst({
    where: { tenantId, phone },
    select: { id: true },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId,
        name,
        phone,
        email: email || null,
        source: "AI",
        lastSeenAt: new Date(),
      },
      select: { id: true },
    });
  } else {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastSeenAt: new Date(), name },
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      customerId: customer.id,
      serviceId,
      startAt,
      endAt,
      status: "PENDING",
      notes: notes || null,
      bookedVia: "AI",
      conversationId: conversationId || null,
    },
    select: { id: true },
  });

  if (conversationId) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { customerId: customer.id, updatedAt: new Date() },
    });
  }

  queueBookingNotifications(appointment.id).catch((err) =>
    console.error("[booking-agent] failed to queue notifications:", err)
  );
  pushAppointmentSync(appointment.id).catch((err) =>
    console.error("[booking-agent] failed to push to calendar:", err)
  );

  return appointment.id;
}

// ─── Agent run ────────────────────────────────────────────────────────────────

export interface AgentInput {
  tenantId: string;
  conversationId?: string;
  userMessage: string;
  channel?: "WEB_CHAT" | "WHATSAPP";
}

export interface AgentOutput {
  reply: string;
  conversationId: string;
  appointmentId?: string;
}

export async function runBookingAgent(input: AgentInput): Promise<AgentOutput> {
  const { tenantId, userMessage, channel = "WEB_CHAT" } = input;

  // ── 1. Load or create conversation ─────────────────────────────────────────
  let conversation = input.conversationId
    ? await prisma.conversation.findFirst({
        where: { id: input.conversationId, tenantId },
        select: { id: true },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { tenantId, channel, status: "OPEN", aiHandled: true },
      select: { id: true },
    });
  }

  const conversationId = conversation.id;

  // ── 2. Save user message ────────────────────────────────────────────────────
  await prisma.message.create({
    data: { conversationId, role: "USER", content: userMessage },
  });

  // ── 3. Load history (last 20 messages) ─────────────────────────────────────
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { role: true, content: true },
  });

  // ── 4. Load AI settings ─────────────────────────────────────────────────────
  const aiSettings = await prisma.aISettings.findFirst({
    where: { tenantId },
    select: {
      provider: true, model: true, temperature: true, maxTokens: true,
      byokApiKey: true, autoBook: true, requireConfirm: true,
    },
  });

  const providerSettings = {
    provider: aiSettings?.provider ?? "openai",
    model: aiSettings?.model ?? "gpt-4o-mini",
    temperature: aiSettings?.temperature ?? 0.7,
    maxTokens: aiSettings?.maxTokens ?? 1000,
    apiKey: aiSettings?.byokApiKey ?? undefined,
  };

  const systemPrompt = await buildSystemPrompt(tenantId);
  const provider = getAIProvider(providerSettings);

  // ── 5. Tool loop (max 3 iterations) ────────────────────────────────────────
  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: (m.role === "USER" ? "user" : m.role === "ASSISTANT" ? "assistant" : "system") as AIMessage["role"],
      content: m.content,
    })),
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let appointmentId: string | undefined;
  let finalReply = "";

  for (let i = 0; i < 3; i++) {
    const response = await provider.chat(messages, providerSettings);
    totalPromptTokens += response.promptTokens;
    totalCompletionTokens += response.completionTokens;

    let text = response.content;

    // Check for <check_slots> tool call
    const slotsCall = extractTag<{ serviceId: string; date: string }>(text, "check_slots");
    if (slotsCall) {
      const slots = await getAvailableSlots(tenantId, slotsCall.value.serviceId, slotsCall.value.date);
      const slotsText =
        slots.length > 0
          ? `Available slots on ${slotsCall.value.date}: ${slots.map((s) => s.label).join(", ")}`
          : `No available slots on ${slotsCall.value.date}. Please suggest another date.`;

      // Add assistant message (stripped) + tool result, then loop
      messages.push({ role: "assistant", content: slotsCall.stripped || "(checking slots…)" });
      messages.push({ role: "user", content: `[System: ${slotsText}]` });
      continue;
    }

    // Check for <book> tool call
    const bookCall = extractTag<{
      serviceId: string; date: string; time: string;
      name: string; phone: string; email?: string;
    }>(text, "book");

    if (bookCall) {
      try {
        const id = await executeBooking({
          tenantId,
          serviceId: bookCall.value.serviceId,
          date: bookCall.value.date,
          time: bookCall.value.time,
          name: bookCall.value.name,
          phone: bookCall.value.phone,
          email: bookCall.value.email,
          conversationId,
        });

        if (id.startsWith("crit:")) {
          // Booking failed — tell AI so it can respond appropriately
          messages.push({ role: "assistant", content: bookCall.stripped || "" });
          messages.push({ role: "user", content: `[System: Booking failed — ${id.slice(5)}. Please let the customer know and try to help.]` });
          continue;
        }

        appointmentId = id;
        // Replace the <book> tag section with the stripped text
        finalReply = bookCall.stripped;
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        messages.push({ role: "assistant", content: bookCall.stripped || "" });
        messages.push({ role: "user", content: `[System: Booking failed — ${msg}]` });
        continue;
      }
    }

    // No action tag — final reply
    finalReply = text;
    break;
  }

  if (!finalReply) finalReply = "I'm sorry, I had trouble processing that. Please try again.";

  // ── 6. Save assistant reply ─────────────────────────────────────────────────
  await prisma.message.create({
    data: {
      conversationId,
      role: "ASSISTANT",
      content: finalReply,
      tokensUsed: totalPromptTokens + totalCompletionTokens,
      provider: providerSettings.provider,
      model: providerSettings.model,
    },
  });

  // ── 7. Log usage ────────────────────────────────────────────────────────────
  const costUsd = estimateCostUsd(
    providerSettings.provider,
    providerSettings.model,
    totalPromptTokens,
    totalCompletionTokens
  );

  await prisma.aIUsageRecord.create({
    data: {
      tenantId,
      conversationId,
      provider: providerSettings.provider,
      model: providerSettings.model,
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
      estimatedCostUsd: costUsd,
      isByok: !!aiSettings?.byokApiKey,
    },
  });

  // ── 8. Update conversation timestamp ────────────────────────────────────────
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return { reply: finalReply, conversationId, appointmentId };
}
