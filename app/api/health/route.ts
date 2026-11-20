import { appVersion } from "@/lib/version";

export async function GET() {
  return Response.json(
    { status: "ok", version: appVersion(), time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
