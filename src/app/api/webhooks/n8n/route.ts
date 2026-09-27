import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

const Schema = z.object({
  action: z.string().min(1),
  tenantId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-n8n-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature", code: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { action, tenantId, payload } = parsed.data;

  console.log("[webhook/n8n]", { action, tenantId, keys: Object.keys(payload) });

  return NextResponse.json({ ok: true });
}
