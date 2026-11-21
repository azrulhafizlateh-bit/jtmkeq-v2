import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimisation, favicon, asset extensions and exactly /api/health.
    // Backslashes are doubled because this is a plain string literal.
    "/((?!_next/static/|_next/image|favicon\\.ico$|api/health$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$).*)",
  ],
};
