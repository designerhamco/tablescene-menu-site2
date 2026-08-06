import { type NextRequest, NextResponse } from "next/server";

import { getPublicMenuPath } from "@/lib/menu-url";
import {
  issueTableVisitSession,
  TableVisitSessionError,
} from "@/lib/server/table-visit-session-service";
import {
  getTableVisitSessionCookieMaxAge,
  TABLE_VISIT_SESSION_COOKIE,
  TABLE_VISIT_SESSION_COOKIE_SECURITY,
} from "@/lib/table-qr-session-tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unavailableResponse(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/table/unavailable", request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const session = await issueTableVisitSession({
      tableToken: token,
      existingSessionToken: request.cookies.get(TABLE_VISIT_SESSION_COOKIE)?.value,
      userAgent: request.headers.get("user-agent"),
    });
    const response = NextResponse.redirect(new URL(getPublicMenuPath(session.slug), request.url), 303);
    response.cookies.set(TABLE_VISIT_SESSION_COOKIE, session.rawSessionToken, {
      ...TABLE_VISIT_SESSION_COOKIE_SECURITY,
      expires: new Date(session.expiresAt),
      maxAge: getTableVisitSessionCookieMaxAge(session.expiresAt),
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    if (error instanceof TableVisitSessionError) return unavailableResponse(request);
    throw error;
  }
}
