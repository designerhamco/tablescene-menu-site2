import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/same-origin-request";
import { isDeletedAccountStatus } from "@/lib/account-status";
import { NOTIFICATION_VISIBLE_CHANNELS } from "@/lib/notification-display-policy";

export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return json({ ok: false }, 403);
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || isDeletedAccountStatus(user.app_metadata)) {
    return json({ ok: false, message: "로그인이 필요합니다." }, 401);
  }

  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from("notification_events" as never)
    .update({ read_at: readAt } as never)
    .eq("user_id" as never, user.id as never)
    .in("channel" as never, [...NOTIFICATION_VISIBLE_CHANNELS] as never)
    .neq("status" as never, "skipped" as never)
    .is("read_at" as never, null)
    .lte("created_at" as never, readAt as never);
  if (error) return json({ ok: false, message: "알림 읽음 처리에 실패했습니다." }, 500);
  return json({ ok: true, readAt, userId: user.id });
}
