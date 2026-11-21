import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import {
  LAST_ACTIVITY_COOKIE,
  INACTIVITY_LIMIT_MS,
  isInactive,
  isProtectedPath,
  parseLastActivity,
} from "@/lib/auth/session";
import type { Database } from "@/lib/supabase/database.types";

type CookieToSet = Parameters<
  NonNullable<
    NonNullable<Parameters<typeof createServerClient>[2]["cookies"]> extends infer C
      ? C extends { setAll?: infer S }
        ? S
        : never
      : never
  >
>[0];

const activityCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  // Browser-side lifetime only; the server decides inactivity from the value.
  maxAge: INACTIVITY_LIMIT_MS / 1000,
});

/**
 * Refreshes the Supabase session (getClaims validates the JWT; never getSession),
 * enforces the 30-minute inactivity timeout and redirects unauthenticated
 * requests for protected routes. Follows the @supabase/ssr Next.js pattern:
 * refreshed auth cookies are written to both the request and the response.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = publicEnv();
  let response = NextResponse.next({ request });
  const authCookies: CookieToSet = [];

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
          for (const [key, value] of Object.entries(headers ?? {})) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims.
  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;
  const now = Date.now();

  /** Redirect that keeps any refreshed/cleared Supabase cookies. */
  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const redirect = NextResponse.redirect(url);
    for (const { name, value, options } of authCookies) redirect.cookies.set(name, value, options);
    return redirect;
  };

  if (!authenticated) {
    if (isProtectedPath(pathname)) {
      return redirectTo("/login", { next: `${pathname}${search}` });
    }
    return response;
  }

  const last = parseLastActivity(request.cookies.get(LAST_ACTIVITY_COOKIE)?.value);
  if (isInactive(last, now)) {
    await supabase.auth.signOut();
    const redirect = redirectTo("/login", { reason: "timeout" });
    redirect.cookies.delete(LAST_ACTIVITY_COOKIE);
    return redirect;
  }

  const result = pathname === "/login" ? redirectTo("/dashboard") : response;
  result.cookies.set(LAST_ACTIVITY_COOKIE, String(now), activityCookieOptions());
  return result;
}
