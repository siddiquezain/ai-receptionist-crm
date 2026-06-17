import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserWithTenant } from "@/lib/auth-actions";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const { user } = data;
  const meta = user.user_metadata ?? {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
  const businessName =
    typeof meta.business_name === "string" ? meta.business_name : null;

  // If metadata is present (registration flow), create Prisma records
  if (fullName && businessName) {
    if (!user.email) {
      return NextResponse.redirect(`${origin}/login?error=missing_email`);
    }
    try {
      const slug = await ensureUserWithTenant({
        supabaseUserId: user.id,
        email: user.email,
        fullName,
        businessName,
      });
      return NextResponse.redirect(`${origin}/${slug}/dashboard`);
    } catch {
      return NextResponse.redirect(`${origin}/login?error=setup_failed`);
    }
  }

  // Login flow — user already has records
  if (next.startsWith("/")) {
    return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(origin);
}
