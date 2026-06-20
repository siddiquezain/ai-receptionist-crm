import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const schema = z.object({ integrationId: z.string().min(1), tenantSlug: z.string().min(1) });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  const { integrationId, tenantSlug } = parsed.data;

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const member = await prisma.tenantMember.findFirst({
    where: { tenantId: tenant.id, user: { supabaseAuthId: user.id }, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.calendarIntegration.updateMany({
    where: { id: integrationId, tenantId: tenant.id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
