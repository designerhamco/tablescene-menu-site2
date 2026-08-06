import { type NextRequest, NextResponse } from "next/server";

import {
  InvalidPostpayOrderPayloadError,
  parsePostpayOrderPayload,
} from "@/lib/postpay-order-payload";
import {
  PostpayOrderSubmissionError,
  submitPostpayOrder,
} from "@/lib/server/postpay-order-service";
import { resolveTableVisitSession } from "@/lib/server/table-visit-session-service";
import { TABLE_VISIT_SESSION_COOKIE } from "@/lib/table-qr-session-tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;

function response(body: Record<string, unknown>, status: number) {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "no-store");
  return result;
}

function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) {
    return response({ ok: false, message: "요청을 확인할 수 없습니다." }, 403);
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return response({ ok: false, message: "주문 정보가 너무 큽니다." }, 413);
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return response({ ok: false, message: "주문 정보가 너무 큽니다." }, 413);
    }
    const input = parsePostpayOrderPayload(JSON.parse(rawBody));
    const tableSession = await resolveTableVisitSession({
      expectedMenuSiteId: input.menuSiteId,
      sessionToken: request.cookies.get(TABLE_VISIT_SESSION_COOKIE)?.value,
      userAgent: request.headers.get("user-agent"),
    });
    if (!tableSession) {
      return response({ ok: false, message: "테이블 방문 세션이 만료되었습니다." }, 401);
    }

    const order = await submitPostpayOrder({ input, tableSession });
    return response({ ok: true, order }, order.duplicate ? 200 : 201);
  } catch (error) {
    if (error instanceof InvalidPostpayOrderPayloadError) {
      return response({ ok: false, message: error.message }, 400);
    }
    if (error instanceof SyntaxError) {
      return response({ ok: false, message: "주문 정보를 다시 확인해 주세요." }, 400);
    }
    if (error instanceof PostpayOrderSubmissionError) {
      return response({ ok: false, message: error.message }, 409);
    }
    throw error;
  }
}
