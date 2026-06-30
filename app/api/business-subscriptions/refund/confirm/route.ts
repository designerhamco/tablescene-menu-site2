import { NextResponse } from "next/server";

import { confirmYearlyRefund, YearlyRefundError } from "@/lib/server/yearly-refund-service";
import { createClient } from "@/lib/supabase/server";
import { isYearlyRefundConfirmQaEnabled } from "@/lib/yearly-refund-confirm-qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfirmRefundBody = {
  subscriptionId?: unknown;
  customerReason?: unknown;
  acceptedRefundQuote?: unknown;
};

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function parseBody(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      subscriptionId: null,
      customerReason: null,
      acceptedRefundQuote: false,
    };
  }

  const body = value as ConfirmRefundBody;
  const subscriptionId = typeof body.subscriptionId === "string" && body.subscriptionId.trim()
    ? body.subscriptionId.trim()
    : null;
  const customerReason = typeof body.customerReason === "string" && body.customerReason.trim()
    ? body.customerReason.trim()
    : null;

  return {
    subscriptionId,
    customerReason,
    acceptedRefundQuote: body.acceptedRefundQuote === true,
  };
}

export async function POST(request: Request) {
  if (!isYearlyRefundConfirmQaEnabled()) {
    return jsonError("YEARLY_REFUND_CONFIRM_QA_DISABLED", "연결제 자동 환불 기능은 현재 QA 준비 중입니다.", 503);
  }

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

  const { subscriptionId, customerReason, acceptedRefundQuote } = parseBody(body);
  if (!subscriptionId) {
    return jsonError("SUBSCRIPTION_ID_REQUIRED", "구독 정보를 확인할 수 없습니다.");
  }

  if (!acceptedRefundQuote) {
    return jsonError("REFUND_QUOTE_CONFIRMATION_REQUIRED", "예상 환불금액과 환불 기준을 확인해주세요.");
  }

  try {
    const result = await confirmYearlyRefund({
      subscriptionId,
      userId: user.id,
      customerReason,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof YearlyRefundError) {
      return jsonError(error.code, error.message, error.status);
    }

    return jsonError("REFUND_CONFIRM_FAILED", "환불 처리에 실패했습니다. 추가 결제나 재요청 없이 고객지원으로 문의해주세요.", 500);
  }
}
