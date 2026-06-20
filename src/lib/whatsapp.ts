/**
 * Evolution API client for WhatsApp messaging.
 *
 * Evolution API is a self-hosted WhatsApp Business API wrapper.
 * Docs: https://doc.evolution-api.com
 *
 * In production, n8n communicates with Evolution API directly.
 * These helpers are used by the Next.js fallback path (dev / pre-n8n).
 *
 * Required env vars:
 *   EVOLUTION_API_URL          — base URL of your Evolution API server
 *   EVOLUTION_WEBHOOK_SECRET   — the apikey Evolution sends in webhook headers (for validation)
 */

function evolutionBase(tenantApiUrl?: string | null): string {
  return (tenantApiUrl ?? process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
}

// ── Send a text message ───────────────────────────────────────────────────────

export async function sendEvolutionMessage(
  instanceName: string,
  apiKey: string,
  to: string,
  text: string,
  serverUrl?: string | null
): Promise<void> {
  const base = evolutionBase(serverUrl);
  if (!base) throw new Error("EVOLUTION_API_URL is not configured");

  // Strip any WhatsApp JID suffix so callers can pass either format
  const number = to.replace(/@s\.whatsapp\.net$/, "");

  const res = await fetch(`${base}/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number,
      text,
      delay: 1200, // typing delay in ms (cosmetic)
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Evolution API sendText failed (${res.status}): ${detail}`);
  }
}

// ── Parse an incoming Evolution API webhook payload ───────────────────────────

export interface EvolutionIncomingMessage {
  instanceName: string;
  /** Remote JID, e.g. "5511999999999@s.whatsapp.net" */
  remoteJid: string;
  /** Cleaned phone number without JID suffix */
  from: string;
  messageId: string;
  text: string;
  pushName: string | null;
  fromMe: boolean;
}

/**
 * Parses an Evolution API messages.upsert webhook payload.
 * Returns null for non-text messages, outbound messages, or unrecognised formats.
 */
export function parseEvolutionWebhook(body: unknown): EvolutionIncomingMessage | null {
  if (typeof body !== "object" || body === null) return null;

  const payload = body as Record<string, unknown>;

  // Only handle the messages.upsert event
  if (payload.event !== "messages.upsert") return null;

  const instanceName = payload.instance as string | undefined;
  if (!instanceName) return null;

  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const key = data.key as Record<string, unknown> | undefined;
  if (!key) return null;

  // Skip messages sent by the business itself
  if (key.fromMe === true) return null;

  const remoteJid = key.remoteJid as string | undefined;
  if (!remoteJid) return null;

  const messageId = key.id as string | undefined;
  if (!messageId) return null;

  // Extract text from various message types
  const message = data.message as Record<string, unknown> | undefined;
  let text: string | null = null;

  if (message) {
    // Plain text
    if (typeof message.conversation === "string") {
      text = message.conversation;
    }
    // Extended text (e.g. with URL preview)
    const extText = message.extendedTextMessage as Record<string, unknown> | undefined;
    if (!text && typeof extText?.text === "string") {
      text = extText.text;
    }
    // Button/template reply
    const btnReply = message.buttonsResponseMessage as Record<string, unknown> | undefined;
    if (!text && typeof btnReply?.selectedDisplayText === "string") {
      text = btnReply.selectedDisplayText;
    }
  }

  if (!text) return null; // non-text message — ignore for now

  return {
    instanceName,
    remoteJid,
    from: remoteJid.replace(/@s\.whatsapp\.net$/, "").replace(/@.*$/, ""),
    messageId,
    text,
    pushName: typeof data.pushName === "string" ? data.pushName : null,
    fromMe: false,
  };
}
