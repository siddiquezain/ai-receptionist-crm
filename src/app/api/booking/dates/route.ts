import { NextRequest, NextResponse } from "next/server";
import { getAvailableDates } from "@/lib/booking-queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tenantId = searchParams.get("tenantId");
  const serviceId = searchParams.get("serviceId");

  if (!tenantId || !serviceId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const dates = await getAvailableDates(tenantId, serviceId);
  return NextResponse.json({ dates });
}
