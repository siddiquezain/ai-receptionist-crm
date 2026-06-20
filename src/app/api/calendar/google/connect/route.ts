import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getAuthUrl } from "@/lib/calendar/google";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = request.nextUrl;
  const tenantSlug = searchParams.get("tenantSlug");
  const syncDirection = searchParams.get("syncDirection") ?? "BIDIRECTIONAL";

  if (!tenantSlug) {
    return NextResponse.json({ error: "Missing tenantSlug" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Encode state as base64 JSON so callback can recover context
  const state = Buffer.from(
    JSON.stringify({ tenantId: tenant.id, tenantSlug, syncDirection, userId: user.id })
  ).toString("base64url");

  return NextResponse.redirect(getAuthUrl(state));
}
