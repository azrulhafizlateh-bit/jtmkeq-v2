import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import {
  LAST_ACTIVITY_COOKIE,
  activityCookie,
  isInactive,
  isProtectedPath,
  parseLastActivity,
} from "@/lib/auth/session";
import type { Database } from "@/lib/supabase/database.types";

type AuthCookie = { name: string; value: string; options: Record<string, unknown> };

function isPrefetch(request: NextRequest): boolean {
  const h = request.headers;
  return (
    h.get("next-router-prefetch") === "1" ||
    h.get("purpose") === "prefetch" ||
    h.get("sec-purpose")?.includes("prefetch") === true
  );
}

/**
 * Refreshes the Supabase session (getClaims validates the JWT; never getSession),
 * enforces the 30-minute inactivity timeout (fail closed) and redirects
 * unauthenticated requests for protected routes. Follows the @supabase/ssr
 * Next.js pattern: refreshed auth cookies are written to request and response.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = publicEnv();
  let response = NextResponse.next({ request });
  const authCookies: AuthCookie[] = [];
  const cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          authCookies.push(...cookiesToSet);
          Object.assign(cacheHeaders, headers ?? {});
          for (const [key, value] of Object.entries(cacheHeaders)) response.headers.set(key, value);
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims.
  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;
  const now = Date.now();

  /** Redirect that keeps refreshed/cleared Supabase cookies and cache headers. */
  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const redirect = NextResponse.redirect(url);
    for (const { name, value, options } of authCookies) redirect.cookies.set(name, value, options);
    for (const [key, value] of Object.entries(cacheHeaders)) redirect.headers.set(key, value);
    return redirect;
  };

  if (!authenticated) {
    const result = isProtectedPath(pathname)
      ? redirectTo("/login", { next: `${pathname}${search}` })
      : response;
    if (request.cookies.has(LAST_ACTIVITY_COOKIE)) result.cookies.delete(LAST_ACTIVITY_COOKIE);
    return result;
  }

  const last = parseLastActivity(request.cookies.get(LAST_ACTIVITY_COOKIE)?.value);
  if (isInactive(last, now)) {
    // Local scope: end only this browser's session, not every device's.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    const redirect = redirectTo("/login", { reason: "timeout" });
    if (error) {
      // Sign-out failed (network/5xx): expire every Supabase auth cookie ourselves.
      for (const { name } of request.cookies.getAll()) {
        if (name.startsWith("sb-")) redirect.cookies.set(name, "", { path: "/", maxAge: 0 });
      }
    }
    redirect.cookies.delete(LAST_ACTIVITY_COOKIE);
    return redirect;
  }

  // Only GET/HEAD are bounced away from /login; a POST (login action) must pass.
  const bounce = pathname === "/login" && (request.method === "GET" || request.method === "HEAD");
  const result = bounce ? redirectTo("/dashboard") : response;
  if (!isPrefetch(request)) {
    const c = activityCookie(now);
    result.cookies.set(c.name, c.value, c.options);
  }
  return result;
}
