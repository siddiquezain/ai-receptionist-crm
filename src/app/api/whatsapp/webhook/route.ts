/**
 * WhatsApp webhook — transitional shim.
 *
 * TARGET ARCHITECTURE:
 *   Evolution API ──webhook──► n8n (configure this in Evolution API instance settings)
 *   Next.js is NOT in this path.
 *
 * CURRENT (pre-n8n) BEHAVIOR:
 *   Evolution API ──webhook──► this route
 *     ├── N8N_WHATSAPP_WEBHOOK_URL set → forward raw payload to n8n, return 200
 *     └── not set → run local booking-agent (dev/fallback)
 *
 * Once your n8n workflow is live, point Evolution API directly at n8n and
 * remove this route (or leave it as a dead stub — it won't receive traffic).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runBookingAgent } from "@/lib/ai/booking-agent";
import { sendEvolutionMessage, parseEvolutionWebhook } from "@/lib/whatsapp";
import { n8nForwardWhatsapp } from "@/lib/n8n";

// Evolution API doesn't use Meta's GET challenge-response.
// Keep a simple health-check GET so the URL is easy to verify.
export async function GET() {
  return NextResponse.json({ ok: true, service: "whatsapp-webhook" });
}

export async function POST(request: NextRequest) {
  // Validate the Evolution API webhook secret.
  // Evolution API sends the configured API key in the "apikey" header.
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (secret) {
    const incomingKey = request.headers.get("apikey");
    if (incomingKey !== secret) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // ── Primary path: forward to n8n ─────────────────────────────────────────
  const forwarded = await n8nForwardWhatsapp(body);
  if (forwarded) {
    return NextResponse.json({ ok: true });
  }

  // ── Fallback: local booking-agent ─────────────────────────────────────────
  const msg = parseEvolutionWebhook(body);
  if (!msg) {
    // Not a text message or not a supported event — acknowledge and ignore
    return NextResponse.json({ ok: true });
  }

  // Process asynchronously so we return 200 to Evolution API immediately
  processLocally(msg).catch((err) =>
    console.error("[whatsapp/webhook] local processing error:", err)
  );

  return NextResponse.json({ ok: true });
}

// ── Local fallback processing ─────────────────────────────────────────────────

async function processLocally(msg: ReturnType<typeof parseEvolutionWebhook> & {}) {
  if (!msg) return;

  // Find tenant by Evolution API instance name
  const tenant = await prisma.tenant.findFirst({
    where: {
      evolutionInstanceName: msg.instanceName,
      deletedAt: null,
    },
    select: {
      id: true,
      evolutionInstanceName: true,
      evolutionApiKey: true,
      evolutionApiUrl: true,
    },
  });

  if (!tenant?.evolutionApiKey) {
    console.warn(`[whatsapp/webhook] no tenant found for instance="${msg.instanceName}"`);
    return;
  }

  // Find existing open conversation for this sender
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      tenantId: tenant.id,
      channel: "WHATSAPP",
      externalId: msg.from,
      status: "OPEN",
      deletedAt: null,
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  try {
    const result = await runBookingAgent({
      tenantId: tenant.id,
      conversationId: existingConversation?.id,
      userMessage: msg.text,
      channel: "WHATSAPP",
    });

    // Store sender's number on conversation for continuity
    if (!existingConversation) {
      await prisma.conversation.update({
        where: { id: result.conversationId },
        data: { externalId: msg.from },
      });
    }

    await sendEvolutionMessage(
      tenant.evolutionInstanceName!,
      tenant.evolutionApiKey!,
      msg.from,
      result.reply,
      tenant.evolutionApiUrl
    );
  } catch (err) {
    console.error(`[whatsapp/webhook] agent error for tenant=${tenant.id}:`, err);

    sendEvolutionMessage(
      tenant.evolutionInstanceName!,
      tenant.evolutionApiKey!,
      msg.from,
      "Sorry, I'm having trouble right now. Please try again in a moment.",
      tenant.evolutionApiUrl
    ).catch(() => undefined);
  }
}
