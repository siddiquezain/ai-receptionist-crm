import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runBookingAgent } from "@/lib/ai/booking-agent";
import { sendWhatsAppMessage, markWhatsAppMessageRead } from "@/lib/whatsapp";

// ── Meta webhook verification ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Accept verification from any tenant whose phone number ID verify token matches,
  // or fall back to the global env var.
  const globalToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (globalToken && token === globalToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ── Incoming message handler ───────────────────────────────────────────────────

interface WaTextMessage {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
}

interface WaValue {
  messaging_product: string;
  metadata: { phone_number_id: string };
  messages?: WaTextMessage[];
}

interface WaChange {
  field: string;
  value: WaValue;
}

interface WaEntry {
  id: string;
  changes: WaChange[];
}

interface WaWebhookPayload {
  object: string;
  entry: WaEntry[];
}

export async function POST(request: NextRequest) {
  let body: WaWebhookPayload;
  try {
    body = (await request.json()) as WaWebhookPayload;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ ok: true });
  }

  // Process each entry / change asynchronously — respond to Meta immediately.
  processWebhook(body).catch((err) =>
    console.error("[whatsapp/webhook] processing error:", err)
  );

  return NextResponse.json({ ok: true });
}

async function processWebhook(payload: WaWebhookPayload) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const phoneNumberId = change.value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const messages = change.value.messages ?? [];
      for (const msg of messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;

        const from = msg.from; // sender's WhatsApp number
        const text = msg.text.body;

        // Find tenant by phone number ID
        const tenant = await prisma.tenant.findFirst({
          where: {
            whatsappPhoneNumberId: phoneNumberId,
            deletedAt: null,
          },
          select: {
            id: true,
            whatsappPhoneNumberId: true,
            whatsappAccessToken: true,
          },
        });

        if (!tenant?.whatsappAccessToken) {
          console.warn(`[whatsapp/webhook] no tenant found for phone_number_id=${phoneNumberId}`);
          continue;
        }

        // Find existing open WhatsApp conversation for this sender
        const existingConversation = await prisma.conversation.findFirst({
          where: {
            tenantId: tenant.id,
            channel: "WHATSAPP",
            externalId: from,
            status: "OPEN",
            deletedAt: null,
          },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });

        try {
          // Mark as read first (non-blocking)
          markWhatsAppMessageRead(
            tenant.whatsappPhoneNumberId!,
            tenant.whatsappAccessToken,
            msg.id
          ).catch(() => undefined);

          const result = await runBookingAgent({
            tenantId: tenant.id,
            conversationId: existingConversation?.id,
            userMessage: text,
            channel: "WHATSAPP",
          });

          // Store the sender's WhatsApp number on the conversation for continuity
          if (!existingConversation) {
            await prisma.conversation.update({
              where: { id: result.conversationId },
              data: { externalId: from },
            });
          }

          // Send reply back via WhatsApp
          await sendWhatsAppMessage(
            tenant.whatsappPhoneNumberId!,
            tenant.whatsappAccessToken,
            from,
            result.reply
          );
        } catch (err) {
          console.error(`[whatsapp/webhook] agent error for tenant=${tenant.id}:`, err);

          // Best-effort fallback message
          sendWhatsAppMessage(
            tenant.whatsappPhoneNumberId!,
            tenant.whatsappAccessToken,
            from,
            "Sorry, I'm having trouble right now. Please try again in a moment."
          ).catch(() => undefined);
        }
      }
    }
  }
}
