import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pruneNotificationContent } from "@/lib/server/notification-retention-service";

export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return json({ ok: false, message: "Cron is not configured" }, 503);
  const expected = Buffer.from(`Bearer ${secret}`), actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return json({ ok: false }, 401);
  // Dry-run is the safe default even for authorized scheduled requests.
  const execute = process.env.ENABLE_NOTIFICATION_RETENTION_EXECUTE === "true"
    && request.nextUrl.searchParams.get("dryRun") !== "true";
  try {
    const result = await pruneNotificationContent(createAdminClient(), execute);
    console.info("[notification-retention]", result);
    return json({ ok: true, ...result });
  } catch (error) {
    console.error("[notification-retention]", error instanceof Error ? error.message : "unknown");
    return json({ ok: false, message: "Notification retention check failed" }, 500);
  }
}
