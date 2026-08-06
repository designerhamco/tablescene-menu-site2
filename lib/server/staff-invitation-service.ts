import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { isEmailProviderConfigured, sendNotificationEmail } from "@/lib/email-notifications";
import type { MenuSiteMemberRole } from "@/lib/menu-site-permissions";
import {
  buildStaffInvitationEmail,
  isStaffInvitationRole,
  isValidStaffInvitationEmail,
  normalizeStaffInvitationEmail,
  STAFF_INVITATION_EXPIRY_DAYS,
  STAFF_INVITATION_MAX_MENU_SITES,
  STAFF_INVITATION_MAX_ROWS_PER_HOUR,
} from "@/lib/staff-invitations";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;
type InvitationInsert = Database["public"]["Tables"]["menu_site_invitations"]["Insert"];
type AuditInsert = Database["public"]["Tables"]["menu_site_audit_logs"]["Insert"];
type EmailSender = typeof sendNotificationEmail;

export type CreateStaffInvitationInput = {
  actorUserId: string;
  actorEmail: string;
  email: string;
  menuSiteIds: string[];
  role: MenuSiteMemberRole;
};

export type CreateStaffInvitationResult = {
  inviteBatchId: string;
  invitationCount: number;
  expiresAt: string;
};

export type StaffInvitationErrorCode =
  | "INVITATIONS_DISABLED"
  | "INVALID_EMAIL"
  | "INVALID_ROLE"
  | "INVALID_MENU_SITES"
  | "SELF_INVITATION"
  | "OWNER_ACCESS_REQUIRED"
  | "MENU_SITE_UNAVAILABLE"
  | "ACTIVE_MEMBER_EXISTS"
  | "PENDING_INVITATION_EXISTS"
  | "RATE_LIMITED"
  | "INVITATION_CREATE_FAILED"
  | "EMAIL_DELIVERY_FAILED";

export class StaffInvitationError extends Error {
  constructor(
    public readonly code: StaffInvitationErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "StaffInvitationError";
  }
}

function getStaffInvitationSiteOrigin() {
  const rawValue = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!rawValue) return null;

  try {
    const url = new URL(rawValue);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isStaffInvitationCreationEnabled() {
  return process.env.STAFF_INVITATIONS_ENABLED === "true"
    && isEmailProviderConfigured()
    && Boolean(getStaffInvitationSiteOrigin());
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function getUniqueMenuSiteIds(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildAuditRows({
  invitations,
  actorUserId,
  action,
  inviteBatchId,
  role,
  extraMetadata,
}: {
  invitations: Array<{ id: string; menu_site_id: string }>;
  actorUserId: string;
  action: string;
  inviteBatchId: string;
  role: MenuSiteMemberRole;
  extraMetadata?: Record<string, Json>;
}): AuditInsert[] {
  return invitations.map((invitation) => ({
    menu_site_id: invitation.menu_site_id,
    actor_user_id: actorUserId,
    actor_role: "owner",
    action,
    target_type: "menu_site_invitation",
    target_id: invitation.id,
    metadata: {
      invite_batch_id: inviteBatchId,
      role,
      ...extraMetadata,
    },
  }));
}

async function revokeInvitationBatch(
  adminSupabase: AdminClient,
  inviteBatchId: string,
  nowIso: string,
) {
  await adminSupabase
    .from("menu_site_invitations")
    .update({
      status: "revoked",
      revoked_at: nowIso,
      updated_at: nowIso,
    })
    .eq("invite_batch_id", inviteBatchId)
    .eq("status", "pending");
}

export async function createStaffInvitation(
  input: CreateStaffInvitationInput,
  {
    adminSupabase,
    sendEmail = sendNotificationEmail,
    now = new Date(),
  }: {
    adminSupabase?: AdminClient;
    sendEmail?: EmailSender;
    now?: Date;
  } = {},
): Promise<CreateStaffInvitationResult> {
  if (!isStaffInvitationCreationEnabled()) {
    throw new StaffInvitationError(
      "INVITATIONS_DISABLED",
      "직원 초대 발송은 수락 화면과 이메일 환경 검증이 끝난 뒤 활성화됩니다.",
      503,
    );
  }

  const adminClient = adminSupabase ?? createAdminClient();

  const actorUserId = input.actorUserId.trim();
  const actorEmail = normalizeStaffInvitationEmail(input.actorEmail);
  const email = normalizeStaffInvitationEmail(input.email);
  const menuSiteIds = getUniqueMenuSiteIds(input.menuSiteIds);

  if (!isValidStaffInvitationEmail(email)) {
    throw new StaffInvitationError("INVALID_EMAIL", "올바른 이메일 주소를 입력해 주세요.", 400);
  }
  if (!isStaffInvitationRole(input.role)) {
    throw new StaffInvitationError("INVALID_ROLE", "올바른 직원 역할을 선택해 주세요.", 400);
  }
  if (!actorUserId || menuSiteIds.length === 0 || menuSiteIds.length > STAFF_INVITATION_MAX_MENU_SITES) {
    throw new StaffInvitationError(
      "INVALID_MENU_SITES",
      `한 번에 1개 이상 ${STAFF_INVITATION_MAX_MENU_SITES}개 이하의 메뉴판을 선택해 주세요.`,
      400,
    );
  }
  if (actorEmail === email) {
    throw new StaffInvitationError("SELF_INVITATION", "본인 계정은 직원으로 초대할 수 없습니다.", 400);
  }

  const { data: menuSitesData, error: menuSitesError } = await adminClient
    .from("menu_sites")
    .select("id, name, status, user_id")
    .in("id", menuSiteIds)
    .eq("user_id", actorUserId);
  const menuSites = menuSitesData ?? [];

  if (menuSitesError || menuSites.length !== menuSiteIds.length) {
    throw new StaffInvitationError("OWNER_ACCESS_REQUIRED", "선택한 모든 메뉴판의 사장 권한이 필요합니다.", 403);
  }
  if (menuSites.some((menuSite) => menuSite.status === "archived")) {
    throw new StaffInvitationError("MENU_SITE_UNAVAILABLE", "보관된 메뉴판에는 직원을 초대할 수 없습니다.", 409);
  }

  const oneHourAgoIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { count: recentInvitationCount, error: rateLimitError } = await adminClient
    .from("menu_site_invitations")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", actorUserId)
    .gte("created_at", oneHourAgoIso);

  if (rateLimitError) {
    throw new StaffInvitationError("INVITATION_CREATE_FAILED", "초대 요청 한도를 확인하지 못했습니다.", 500);
  }
  if ((recentInvitationCount ?? 0) + menuSiteIds.length > STAFF_INVITATION_MAX_ROWS_PER_HOUR) {
    throw new StaffInvitationError("RATE_LIMITED", "초대 요청이 너무 많습니다. 1시간 뒤 다시 시도해 주세요.", 429);
  }

  const { data: pendingData, error: pendingError } = await adminClient
    .from("menu_site_invitations")
    .select("id, menu_site_id, expires_at")
    .in("menu_site_id", menuSiteIds)
    .eq("email_normalized", email)
    .eq("status", "pending");

  if (pendingError) {
    throw new StaffInvitationError("INVITATION_CREATE_FAILED", "기존 초대 상태를 확인하지 못했습니다.", 500);
  }

  const nowIso = now.toISOString();
  const expiredPendingIds = (pendingData ?? [])
    .filter((invitation) => Date.parse(invitation.expires_at) <= now.getTime())
    .map((invitation) => invitation.id);
  const activePending = (pendingData ?? []).filter(
    (invitation) => Date.parse(invitation.expires_at) > now.getTime(),
  );

  if (expiredPendingIds.length > 0) {
    const { error: expireError } = await adminClient
      .from("menu_site_invitations")
      .update({ status: "expired", updated_at: nowIso })
      .in("id", expiredPendingIds)
      .eq("status", "pending");

    if (expireError) {
      throw new StaffInvitationError("INVITATION_CREATE_FAILED", "만료된 초대 상태를 정리하지 못했습니다.", 500);
    }
  }
  if (activePending.length > 0) {
    throw new StaffInvitationError("PENDING_INVITATION_EXISTS", "선택한 메뉴판에 아직 유효한 동일 이메일 초대가 있습니다.", 409);
  }

  const { data: acceptedInvitations, error: acceptedError } = await adminClient
    .from("menu_site_invitations")
    .select("menu_site_id, accepted_by")
    .in("menu_site_id", menuSiteIds)
    .eq("email_normalized", email)
    .eq("status", "accepted")
    .not("accepted_by", "is", null);

  if (acceptedError) {
    throw new StaffInvitationError("INVITATION_CREATE_FAILED", "기존 직원 상태를 확인하지 못했습니다.", 500);
  }

  const acceptedUserIds = [...new Set(
    (acceptedInvitations ?? []).map((invitation) => invitation.accepted_by).filter((value): value is string => Boolean(value)),
  )];
  if (acceptedUserIds.length > 0) {
    const { data: activeMembers, error: activeMembersError } = await adminClient
      .from("menu_site_members")
      .select("menu_site_id, user_id")
      .in("menu_site_id", menuSiteIds)
      .in("user_id", acceptedUserIds)
      .eq("status", "active");

    if (activeMembersError) {
      throw new StaffInvitationError("INVITATION_CREATE_FAILED", "기존 직원 상태를 확인하지 못했습니다.", 500);
    }

    const activeMembershipKeys = new Set(
      (activeMembers ?? []).map((member) => `${member.menu_site_id}:${member.user_id}`),
    );
    const hasActiveMember = (acceptedInvitations ?? []).some(
      (invitation) => invitation.accepted_by
        && activeMembershipKeys.has(`${invitation.menu_site_id}:${invitation.accepted_by}`),
    );

    if (hasActiveMember) {
      throw new StaffInvitationError("ACTIVE_MEMBER_EXISTS", "선택한 메뉴판에 이미 활동 중인 직원입니다.", 409);
    }
  }

  const inviteBatchId = randomUUID();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(now.getTime() + STAFF_INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const invitationRows: InvitationInsert[] = menuSites.map((menuSite) => ({
    invite_batch_id: inviteBatchId,
    menu_site_id: menuSite.id,
    email_normalized: email,
    role: input.role,
    token_hash: tokenHash,
    status: "pending",
    invited_by: actorUserId,
    expires_at: expiresAt.toISOString(),
  }));
  const { data: createdInvitationsData, error: createError } = await adminClient
    .from("menu_site_invitations")
    .insert(invitationRows)
    .select("id, menu_site_id");
  const createdInvitations = createdInvitationsData ?? [];

  if (createError || createdInvitations.length !== invitationRows.length) {
    throw new StaffInvitationError(
      createError?.code === "23505" ? "PENDING_INVITATION_EXISTS" : "INVITATION_CREATE_FAILED",
      createError?.code === "23505"
        ? "선택한 메뉴판에 아직 유효한 동일 이메일 초대가 있습니다."
        : "직원 초대를 만들지 못했습니다.",
      createError?.code === "23505" ? 409 : 500,
    );
  }

  const { error: auditCreateError } = await adminClient
    .from("menu_site_audit_logs")
    .insert(buildAuditRows({
      invitations: createdInvitations,
      actorUserId,
      action: "staff.invitation_created",
      inviteBatchId,
      role: input.role,
    }));

  if (auditCreateError) {
    await revokeInvitationBatch(adminClient, inviteBatchId, nowIso);
    throw new StaffInvitationError("INVITATION_CREATE_FAILED", "초대 감사 기록을 만들지 못했습니다.", 500);
  }

  const siteOrigin = getStaffInvitationSiteOrigin();
  if (!siteOrigin) {
    await revokeInvitationBatch(adminClient, inviteBatchId, nowIso);
    throw new StaffInvitationError("INVITATIONS_DISABLED", "직원 초대 링크 환경이 설정되지 않았습니다.", 503);
  }

  const inviteUrl = new URL("/staff/invitations/accept", siteOrigin);
  inviteUrl.searchParams.set("token", rawToken);
  const emailTemplate = buildStaffInvitationEmail({
    inviterEmail: actorEmail,
    inviteUrl: inviteUrl.toString(),
    menuSiteNames: menuSites.map((menuSite) => menuSite.name),
    role: input.role,
    expiresAt,
  });
  let emailResult: Awaited<ReturnType<EmailSender>>;

  try {
    emailResult = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });
  } catch {
    emailResult = { ok: false, provider: "resend", error: "email request failed" };
  }

  if (!emailResult.ok) {
    await revokeInvitationBatch(adminClient, inviteBatchId, nowIso);
    await adminClient.from("menu_site_audit_logs").insert(buildAuditRows({
      invitations: createdInvitations,
      actorUserId,
      action: "staff.invitation_delivery_failed",
      inviteBatchId,
      role: input.role,
      extraMetadata: { provider: emailResult.provider },
    }));
    throw new StaffInvitationError("EMAIL_DELIVERY_FAILED", "초대 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
  }

  const { error: auditSentError } = await adminClient
    .from("menu_site_audit_logs")
    .insert(buildAuditRows({
      invitations: createdInvitations,
      actorUserId,
      action: "staff.invitation_sent",
      inviteBatchId,
      role: input.role,
      extraMetadata: { provider: emailResult.provider },
    }));

  if (auditSentError) {
    await revokeInvitationBatch(adminClient, inviteBatchId, nowIso);
    throw new StaffInvitationError("INVITATION_CREATE_FAILED", "초대 발송 감사 기록을 만들지 못했습니다.", 500);
  }

  return {
    inviteBatchId,
    invitationCount: createdInvitations.length,
    expiresAt: expiresAt.toISOString(),
  };
}
