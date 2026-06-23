/**
 * Appointment creation endpoint for n8n's book_appointment tool.
 *
 * Delegates to executeBooking() which handles: customer upsert, appointment
 * record, notification queueing, and Google Calendar sync.
 *
 * Auth: x-n8n-secret header must match N8N_INTERNAL_SECRET env var (when set).
 */

import { NextRequest, NextResponse } from "next/server";
import { executeBooking } from "@/lib/ai/booking-agent";

export async function POST(request: NextRequest) {
  const secret = process.env.N8N_INTERNAL_SECRET;
  if (secret && request.headers.get("x-n8n-secret") !== secret) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: {
    tenantId: string;
    serviceId: string;
    date: string;
    time: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    conversationId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tenantId, serviceId, date, time, name, phone, email, notes, conversationId } = body;

  if (!tenantId || !serviceId || !date || !time || !name || !phone) {
    return NextResponse.json(
      { error: "Missing required fields: tenantId, serviceId, date, time, name, phone" },
      { status: 400 }
    );
  }

  const result = await executeBooking({
    tenantId,
    serviceId,
    date,
    time,
    name,
    phone,
    email,
    notes,
    conversationId,
  });

  if (result.startsWith("crit:")) {
    return NextResponse.json({ error: result.slice(5) }, { status: 400 });
  }

  return NextResponse.json({ success: true, appointmentId: result });
}
