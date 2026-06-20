import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runBookingAgent } from "@/lib/ai/booking-agent";

const requestSchema = z.object({
  tenantId: z.string().min(1),
  conversationId: z.string().optional(),
  message: z.string().min(1).max(2000),
  channel: z.enum(["WEB_CHAT", "WHATSAPP"]).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 }
    );
  }

  const { tenantId, conversationId, message, channel } = parsed.data;

  // Verify tenant exists and is not deleted
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    const result = await runBookingAgent({
      tenantId,
      conversationId,
      userMessage: message,
      channel: channel ?? "WEB_CHAT",
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai/chat] agent error:", err);
    return NextResponse.json(
      { error: "The AI assistant is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
