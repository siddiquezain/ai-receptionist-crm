import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { pullBusyFromCalendars } from "@/lib/calendar/sync";

const schema = z.object({ tenantSlug: z.string().min(1) });

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

  const tenant = await prisma.tenant.findFirst({
    where: { slug: parsed.data.tenantSlug, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const member = await prisma.tenantMember.findFirst({
    where: { tenantId: tenant.id, user: { supabaseAuthId: user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await pullBusyFromCalendars(tenant.id);
  return NextResponse.json({ ok: true, ...result });
}
