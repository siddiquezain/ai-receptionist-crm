/**
 * n8n adapter layer — feature-flagged bridge for the migration to n8n-first architecture.
 *
 * Every function returns null/false when its env var is unset so the caller
 * transparently falls back to the local (Next.js-hosted) implementation.
 * Set the corresponding env var to hand that capability over to n8n.
 *
 * Required env vars (set when the matching n8n workflow is ready):
 *
 *   N8N_CHAT_WEBHOOK_URL      — n8n webhook for web-chat AI conversations
 *   N8N_REPLY_WEBHOOK_URL     — n8n webhook for staff sending a WhatsApp reply from Inbox
 *   N8N_WHATSAPP_WEBHOOK_URL  — n8n webhook URL that Evolution API sends messages to
 *                               (Next.js forwards here when acting as a thin proxy;
 *                                in production configure Evolution API → n8n directly)
 *
 * n8n webhook contract for each URL is documented below.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface N8NChatInput {
  tenantId: string;
  conversationId?: string;
  message: string;
  channel?: "WEB_CHAT" | "WHATSAPP";
}

export interface N8NChatOutput {
  reply: string;
  conversationId: string;
  appointmentId?: string;
}

export interface N8NReplyInput {
  tenantId: string;
  conversationId: string;
  content: string;
  channel: "WEB_CHAT" | "WHATSAPP";
  /** Customer's WhatsApp number (externalId from Conversation) — required for WHATSAPP */
  to?: string | null;
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function post<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[n8n] POST ${url} failed: ${res.status} ${await res.text()}`);
      return null;
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch (err) {
    console.error(`[n8n] POST ${url} threw:`, err);
    return null;
  }
}

// ── n8n chat webhook ──────────────────────────────────────────────────────────
/**
 * Delegates a web-chat or WhatsApp AI conversation turn to n8n.
 *
 * n8n webhook node receives:
 *   { tenantId, conversationId?, message, channel }
 *
 * n8n workflow should:
 *   1. Load/create Conversation in Supabase
 *   2. Save the user Message
 *   3. Run AI Agent node (with booking tools)
 *   4. Save the assistant Message
 *   5. Return { reply, conversationId, appointmentId? }
 *
 * Returns null → caller should fall back to local booking-agent.
 */
export async function n8nChat(input: N8NChatInput): Promise<N8NChatOutput | null> {
  const url = process.env.N8N_CHAT_WEBHOOK_URL;
  if (!url) return null;
  return post<N8NChatOutput>(url, input);
}

// ── n8n send-reply webhook ────────────────────────────────────────────────────
/**
 * Asks n8n to deliver a staff reply (from the Inbox) via WhatsApp and persist it.
 *
 * n8n webhook node receives:
 *   { tenantId, conversationId, content, channel, to? }
 *
 * n8n workflow should:
 *   1. If channel === WHATSAPP and to is set: send message via Evolution API
 *   2. Create a Message row in Supabase with role=STAFF
 *   3. Update Conversation.updatedAt
 *   4. Return { ok: true }
 *
 * Returns false → caller should fall back to direct DB write (no WhatsApp delivery).
 */
export async function n8nSendReply(input: N8NReplyInput): Promise<boolean> {
  const url = process.env.N8N_REPLY_WEBHOOK_URL;
  if (!url) return false;
  const result = await post<{ ok: boolean }>(url, input);
  return result?.ok === true;
}

// ── n8n WhatsApp webhook forward ──────────────────────────────────────────────
/**
 * Forwards a raw Evolution API webhook payload to n8n.
 *
 * Used when Next.js receives WhatsApp webhooks as a thin proxy.
 * In production, configure Evolution API to send webhooks directly to n8n —
 * this function (and the /api/whatsapp/webhook route) becomes unnecessary.
 *
 * n8n webhook node receives: the raw Evolution API payload as-is.
 *
 * Returns false → caller should fall back to local processing.
 */
export async function n8nForwardWhatsapp(payload: unknown): Promise<boolean> {
  const url = process.env.N8N_WHATSAPP_WEBHOOK_URL;
  if (!url) return false;
  const result = await post<{ ok?: boolean }>(url, payload);
  return result !== null;
}
