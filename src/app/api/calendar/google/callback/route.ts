import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { makeOAuthClient, listCalendars } from "@/lib/calendar/google";

interface OAuthState {
  tenantId: string;
  tenantSlug: string;
  syncDirection: "READ_ONLY" | "WRITE_ONLY" | "BIDIRECTIONAL";
  userId: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/settings?calendarError=access_denied`);
  }

  let state: OAuthState;
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString()) as OAuthState;
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?calendarError=invalid_state`);
  }

  const { tenantId, tenantSlug, syncDirection } = state;

  // Exchange code for tokens
  const client = makeOAuthClient();
  let tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null };
  try {
    const res = await client.getToken(code);
    tokens = res.tokens;
  } catch {
    return NextResponse.redirect(
      `${appUrl}/${tenantSlug}/settings/calendar?error=token_exchange`
    );
  }

  if (!tokens.access_token || !tokens.refresh_token) {
    return NextResponse.redirect(
      `${appUrl}/${tenantSlug}/settings/calendar?error=missing_tokens`
    );
  }

  // Pick the primary calendar
  const calendars = await listCalendars(tokens.access_token, tokens.refresh_token).catch(() => []);
  const primary = calendars.find((c) => c.primary) ?? calendars[0];
  if (!primary) {
    return NextResponse.redirect(
      `${appUrl}/${tenantSlug}/settings/calendar?error=no_calendar`
    );
  }

  // Upsert the integration (one per tenant per calendar for now)
  await prisma.calendarIntegration.upsert({
    where: {
      // There's no unique constraint by tenantId+calendarId, so use a
      // findFirst+update approach instead
      id: (
        await prisma.calendarIntegration.findFirst({
          where: { tenantId, calendarId: primary.id },
          select: { id: true },
        })
      )?.id ?? "new",
    },
    create: {
      tenantId,
      provider: "GOOGLE",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
      calendarId: primary.id,
      syncDirection,
      isActive: true,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
      syncDirection,
      isActive: true,
    },
  });

  return NextResponse.redirect(
    `${appUrl}/${tenantSlug}/settings/calendar?connected=1`
  );
}
