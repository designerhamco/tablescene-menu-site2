import { NextResponse } from "next/server";

import {
  BusinessSubscriptionManagementError,
  scheduleBusinessSubscriptionCancellation,
} from "@/lib/server/business-subscription-management-service";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ subscriptionId: string }>;
};

function toErrorResponse(error: unknown) {
  if (error instanceof BusinessSubscriptionManagementError) {
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status });
  }

  return NextResponse.json({ ok: false, code: "UNKNOWN_ERROR", message: "구독 해지 예약에 실패했습니다." }, { status: 500 });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { subscriptionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { reason?: unknown } = {};
  try {
    body = (await request.json()) as { reason?: unknown };
  } catch {
    body = {};
  }

  try {
    const result = await scheduleBusinessSubscriptionCancellation({
      subscriptionId,
      userId: user.id,
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
