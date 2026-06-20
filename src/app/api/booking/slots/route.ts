import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/booking-queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tenantId = searchParams.get("tenantId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!tenantId || !serviceId || !date) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const slots = await getAvailableSlots(tenantId, serviceId, date);
  return NextResponse.json({ slots });
}
