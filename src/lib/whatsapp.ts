// Meta Cloud API — WhatsApp Business Platform

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${detail}`);
  }
}

export async function markWhatsAppMessageRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<void> {
  await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}
