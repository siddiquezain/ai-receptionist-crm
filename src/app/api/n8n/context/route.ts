/**
 * n8n context endpoint — called by n8n at the start of every WhatsApp or Web Chat workflow.
 *
 * For WHATSAPP: looks up tenant by evolutionInstanceName, finds/creates Customer and
 * Conversation, saves the incoming user message, and returns full agent context.
 *
 * For WEB_CHAT: looks up by tenantId, finds/creates Conversation, saves user message,
 * and returns the same context shape.
 *
 * n8n uses the returned context to run the AI Agent node.
 *
 * Auth: x-n8n-secret header must match N8N_INTERNAL_SECRET env var (when set).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/ai/booking-agent";

function unauthorized() {
  return new NextResponse("Forbidden", { status: 403 });
}

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function notFound(msg: string) {
  return NextResponse.json({ error: msg }, { status: 404 });
}

export async function POST(request: NextRequest) {
  const secret = process.env.N8N_INTERNAL_SECRET;
  if (secret && request.headers.get("x-n8n-secret") !== secret) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { channel } = body as { channel?: string };

  if (channel === "WHATSAPP" || !channel) {
    return handleWhatsapp(body as WhatsAppInput);
  }
  if (channel === "WEB_CHAT") {
    return handleWebChat(body as WebChatInput);
  }
  return badRequest("Unknown channel");
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

interface WhatsAppInput {
  instanceName: string;
  from: string;
  text: string;
  pushName?: string | null;
  channel?: "WHATSAPP";
}

async function handleWhatsapp(input: WhatsAppInput) {
  const { instanceName, from, text, pushName } = input;
  if (!instanceName || !from || !text) {
    return badRequest("Missing instanceName, from, or text");
  }

  const tenant = await prisma.tenant.findFirst({
    where: { evolutionInstanceName: instanceName, deletedAt: null },
    select: {
      id: true,
      evolutionInstanceName: true,
      evolutionApiKey: true,
      evolutionApiUrl: true,
    },
  });
  if (!tenant?.evolutionApiKey) {
    return notFound(`No tenant found for instance "${instanceName}"`);
  }

  const { customerId, conversationId } = await findOrCreateWhatsappSession(
    tenant.id,
    from,
    pushName ?? null,
    text
  );
  void customerId;

  const context = await buildContext(tenant.id, conversationId, text);

  return NextResponse.json({
    ...context,
    evolutionInstanceName: tenant.evolutionInstanceName,
    evolutionApiKey: tenant.evolutionApiKey,
    evolutionApiUrl: tenant.evolutionApiUrl ?? null,
    to: from,
  });
}

async function findOrCreateWhatsappSession(
  tenantId: string,
  phone: string,
  pushName: string | null,
  text: string
) {
  let customer = await prisma.customer.findFirst({
    where: { tenantId, phone },
    select: { id: true },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId,
        name: pushName || phone,
        phone,
        source: "AI",
        lastSeenAt: new Date(),
      },
      select: { id: true },
    });
  } else {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastSeenAt: new Date() },
    });
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      tenantId,
      channel: "WHATSAPP",
      externalId: phone,
      status: "OPEN",
      deletedAt: null,
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId,
        customerId: customer.id,
        channel: "WHATSAPP",
        externalId: phone,
        status: "OPEN",
        aiHandled: true,
      },
      select: { id: true },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "USER", content: text },
  });

  return { customerId: customer.id, conversationId: conversation.id };
}

// ── Web Chat ──────────────────────────────────────────────────────────────────

interface WebChatInput {
  channel: "WEB_CHAT";
  tenantId: string;
  conversationId?: string | null;
  text: string;
}

async function handleWebChat(input: WebChatInput) {
  const { tenantId, conversationId: existingId, text } = input;
  if (!tenantId || !text) {
    return badRequest("Missing tenantId or text");
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) return notFound("Tenant not found");

  let conversation = existingId
    ? await prisma.conversation.findFirst({
        where: { id: existingId, tenantId },
        select: { id: true },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { tenantId, channel: "WEB_CHAT", status: "OPEN", aiHandled: true },
      select: { id: true },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "USER", content: text },
  });

  const context = await buildContext(tenantId, conversation.id, text);
  return NextResponse.json(context);
}

// ── Shared context builder ────────────────────────────────────────────────────

async function buildContext(tenantId: string, conversationId: string, currentText: string) {
  const [aiSettings, history, systemPrompt] = await Promise.all([
    prisma.aISettings.findFirst({
      where: { tenantId },
      select: { provider: true, model: true, temperature: true, maxTokens: true },
    }),
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { role: true, content: true },
    }),
    buildSystemPrompt(tenantId),
  ]);

  const historyForAgent = history.map((m) => ({
    role:
      m.role === "USER"
        ? "user"
        : m.role === "ASSISTANT"
          ? "assistant"
          : ("system" as const),
    content: m.content,
  }));

  return {
    tenantId,
    conversationId,
    systemPrompt,
    history: historyForAgent,
    currentMessage: currentText,
    aiProvider: aiSettings?.provider ?? "openai",
    aiModel: aiSettings?.model ?? "gpt-4o-mini",
    aiTemperature: aiSettings?.temperature ?? 0.7,
    aiMaxTokens: aiSettings?.maxTokens ?? 1000,
  };
}
