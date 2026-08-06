import { createHash } from "node:crypto";

export const STAFF_INVITATION_INTENT_COOKIE = "menulink_staff_invite_intent";
export const STAFF_INVITATION_INTENT_MAX_AGE_SECONDS = 30 * 60;

export function isValidStaffInvitationToken(value: string | null | undefined): value is string {
  return typeof value === "string"
    && value.length >= 43
    && value.length <= 128
    && /^[A-Za-z0-9_-]+$/.test(value);
}

export function hashStaffInvitationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
