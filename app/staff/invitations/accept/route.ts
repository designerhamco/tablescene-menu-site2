import { NextResponse, type NextRequest } from "next/server";

import {
  isValidStaffInvitationToken,
  STAFF_INVITATION_INTENT_COOKIE,
  STAFF_INVITATION_INTENT_MAX_AGE_SECONDS,
} from "@/lib/staff-invitation-token";

function buildReviewUrl(request: NextRequest, error?: string) {
  const reviewUrl = new URL("/staff/invitations/review", request.nextUrl.origin);
  if (error) reviewUrl.searchParams.set("error", error);
  return reviewUrl;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const response = NextResponse.redirect(
    isValidStaffInvitationToken(token)
      ? buildReviewUrl(request)
      : buildReviewUrl(request, "invalid"),
  );

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  if (!isValidStaffInvitationToken(token)) {
    response.cookies.set({
      name: STAFF_INVITATION_INTENT_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/staff/invitations",
      maxAge: 0,
    });
    return response;
  }

  response.cookies.set({
    name: STAFF_INVITATION_INTENT_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/staff/invitations",
    maxAge: STAFF_INVITATION_INTENT_MAX_AGE_SECONDS,
    priority: "high",
  });

  return response;
}
