import { type NextRequest, NextResponse } from "next/server";

import { CallManagementInputError } from "@/lib/call-management";
import {
  cancelPendingStaffCall,
  StaffCallSubmissionError,
  submitStaffCall,
} from "@/lib/server/staff-call-service";
import { resolveTableVisitSession } from "@/lib/server/table-visit-session-service";
import { TABLE_VISIT_SESSION_COOKIE } from "@/lib/table-qr-session-tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 2 * 1024;

function response(body: Record<string, unknown>, status: number) {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "no-store");
  return result;
}

function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function readBody(request: NextRequest) {
  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new CallManagementInputError("호출 정보가 너무 큽니다.");
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    throw new CallManagementInputError("호출 정보가 너무 큽니다.");
  }
  const value = JSON.parse(rawBody) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CallManagementInputError("호출 정보를 다시 확인해 주세요.");
  }
  return value as Record<string, unknown>;
}

async function resolveSession(request: NextRequest, menuSiteId: unknown) {
  if (typeof menuSiteId !== "string") return null;
  return resolveTableVisitSession({
    expectedMenuSiteId: menuSiteId,
    sessionToken: request.cookies.get(TABLE_VISIT_SESSION_COOKIE)?.value,
    userAgent: request.headers.get("user-agent"),
  });
}

function handleKnownError(error: unknown) {
  if (error instanceof SyntaxError) return response({ ok: false, message: "호출 정보를 다시 확인해 주세요." }, 400);
  if (error instanceof CallManagementInputError) return response({ ok: false, message: error.message }, 400);
  if (error instanceof StaffCallSubmissionError) {
    return response({ ok: false, message: error.message, code: error.code }, 409);
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return response({ ok: false, message: "요청을 확인할 수 없습니다." }, 403);
  try {
    const body = await readBody(request);
    const tableSession = await resolveSession(request, body.menuSiteId);
    if (!tableSession) return response({ ok: false, message: "테이블 방문 세션이 만료되었습니다." }, 401);
    const call = await submitStaffCall({
      menuSiteId: tableSession.menuSiteId,
      callItemKey: body.callItemKey,
      tableSession,
    });
    return response({ ok: true, call }, call.duplicate ? 200 : 201);
  } catch (error) {
    const known = handleKnownError(error);
    if (known) return known;
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return response({ ok: false, message: "요청을 확인할 수 없습니다." }, 403);
  try {
    const body = await readBody(request);
    const tableSession = await resolveSession(request, body.menuSiteId);
    if (!tableSession) return response({ ok: false, message: "테이블 방문 세션이 만료되었습니다." }, 401);
    const call = await cancelPendingStaffCall({
      menuSiteId: tableSession.menuSiteId,
      callId: body.callId,
      tableSession,
    });
    return response({ ok: true, call }, 200);
  } catch (error) {
    const known = handleKnownError(error);
    if (known) return known;
    throw error;
  }
}
