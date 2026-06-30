import { NextResponse } from "next/server";

import { calculateYearlyRefundQuote, YearlyRefundError } from "@/lib/server/yearly-refund-service";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(code: string, message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

function parseBody(value: unknown) {
  if (!value || typeof value !== "object") return { subscriptionId: null };
  const subscriptionId = (value as { subscriptionId?: unknown }).subscriptionId;
  return {
    subscriptionId: typeof subscriptionId === "string" && subscriptionId.trim() ? subscriptionId.trim() : null,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { subscriptionId } = parseBody(body);
  if (!subscriptionId) {
    return jsonError("SUBSCRIPTION_ID_REQUIRED", "구독 정보를 확인할 수 없습니다.");
  }

  try {
    const quote = await calculateYearlyRefundQuote({
      subscriptionId,
      userId: user.id,
    });

    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    if (error instanceof YearlyRefundError) {
      return jsonError(error.code, error.message, error.status, {
        reasonIfNotRefundable: error.message,
      });
    }

    return jsonError("REFUND_QUOTE_FAILED", "예상 환불금액을 계산하지 못했습니다.", 500);
  }
}
