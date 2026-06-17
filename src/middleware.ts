import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { TENANT_SLUG_HEADER } from "@/lib/tenant";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];
const BOOKING_ROUTE_PREFIX = "/book/";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith(BOOKING_ROUTE_PREFIX)
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const tenantSlugMatch = pathname.match(/^\/([^/]+)\//);
  const tenantSlug = tenantSlugMatch?.[1];

  if (tenantSlug && !["api", "_next", "favicon.ico"].includes(tenantSlug)) {
    response.headers.set(TENANT_SLUG_HEADER, tenantSlug);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
