import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type NotificationReadRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, { params }: NotificationReadRouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notification_events" as never)
    .update({ read_at: new Date().toISOString() } as never)
    .eq("id" as never, id as never)
    .eq("user_id" as never, user.id as never)
    .select("id, read_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: "알림 읽음 처리에 실패했습니다." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, message: "알림을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, notification: data });
}
