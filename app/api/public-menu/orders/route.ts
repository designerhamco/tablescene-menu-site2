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
import { CustomerOrderHistoryError, listCustomerVisitOrders, cancelCustomerVisitOrder } from "@/lib/server/customer-order-history-service";
import { isUuid } from "@/lib/postpay-order-runtime";
import { TABLE_VISIT_SESSION_COOKIE } from "@/lib/table-qr-session-tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;

function response(body: Record<string, unknown>, status: number) {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "no-store");
  result.headers.set("Vary", "Cookie");
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
      return response({ ok: false, message: error.message, code: error.code, repeatOrderId: error.repeatOrderId }, 409);
    }
    throw error;
  }
}

function historyError(error: unknown) {
  if (error instanceof CustomerOrderHistoryError) return response({ok: false, code: error.code, message: error.message}, error.status);
  if (error instanceof SyntaxError) return response({ok: false, message: "주문 정보를 다시 확인해 주세요."}, 400);
  return null;
}
async function visitForHistory(request: NextRequest, menuSiteId: unknown) {
  if (!isUuid(menuSiteId)) throw new CustomerOrderHistoryError("INVALID_INPUT", "주문 정보를 다시 확인해 주세요.", 400);
  const visit = await resolveTableVisitSession({expectedMenuSiteId: menuSiteId.toLowerCase(),
    sessionToken: request.cookies.get(TABLE_VISIT_SESSION_COOKIE)?.value, userAgent: request.headers.get("user-agent")});
  if (!visit) throw new CustomerOrderHistoryError("SESSION_EXPIRED", "테이블 방문 세션이 만료되었습니다.", 401);
  return visit;
}
export async function GET(request: NextRequest) {
  try {
    const menuSiteId = request.nextUrl.searchParams.get("menuSiteId"), tableSession = await visitForHistory(request, menuSiteId);
    const history = await listCustomerVisitOrders({menuSiteId, tableSession});
    return response({ok: true, ...history}, 200);
  } catch (error) { const known = historyError(error); if (known) return known; throw error; }
}
export async function PATCH(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return response({ok: false, message: "요청을 확인할 수 없습니다."}, 403);
  const declared = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (declared > 2048) return response({ok: false, message: "주문 정보가 너무 큽니다."}, 413);
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 2048) return response({ok: false, message: "주문 정보가 너무 큽니다."}, 413);
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || !("menuSiteId" in body) || !("orderId" in body) || !isUuid(body.orderId)) {
      return response({ok: false, message: "주문 정보를 다시 확인해 주세요."}, 400);
    }
    const tableSession = await visitForHistory(request, body.menuSiteId);
    const order = await cancelCustomerVisitOrder({menuSiteId: body.menuSiteId, orderId: body.orderId, tableSession});
    return response({ok: true, order}, 200);
  } catch (error) { const known = historyError(error); if (known) return known; throw error; }
}
