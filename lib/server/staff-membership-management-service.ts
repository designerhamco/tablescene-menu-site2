import "server-only";

import { isStaffInvitationRole } from "@/lib/staff-invitations";
import type { MenuSiteMemberRole } from "@/lib/menu-site-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;
type MembershipRow = Pick<
  Database["public"]["Tables"]["menu_site_members"]["Row"],
  "id" | "menu_site_id" | "user_id" | "role" | "status"
>;

export type StaffMembershipManagementErrorCode =
  | "INVALID_ROLE"
  | "MEMBERSHIP_NOT_FOUND"
  | "OWNER_ACCESS_REQUIRED"
  | "MEMBERSHIP_CHANGED"
  | "MEMBERSHIP_UPDATE_FAILED";

export class StaffMembershipManagementError extends Error {
  constructor(
    public readonly code: StaffMembershipManagementErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "StaffMembershipManagementError";
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getOwnedActiveMembership(
  adminClient: AdminClient,
  actorUserId: string,
  membershipId: string,
) {
  if (!actorUserId || !isUuid(membershipId)) {
    throw new StaffMembershipManagementError("MEMBERSHIP_NOT_FOUND", "활동 중인 직원을 찾을 수 없습니다.", 404);
  }

  const { data, error } = await adminClient
    .from("menu_site_members")
    .select("id, menu_site_id, user_id, role, status")
    .eq("id", membershipId)
    .eq("status", "active")
    .maybeSingle();
  const membership = data as MembershipRow | null;

  if (error || !membership) {
    throw new StaffMembershipManagementError("MEMBERSHIP_NOT_FOUND", "활동 중인 직원을 찾을 수 없습니다.", 404);
  }

  const { data: menuSite, error: menuSiteError } = await adminClient
    .from("menu_sites")
    .select("id")
    .eq("id", membership.menu_site_id)
    .eq("user_id", actorUserId)
    .maybeSingle();

  if (menuSiteError || !menuSite) {
    throw new StaffMembershipManagementError("OWNER_ACCESS_REQUIRED", "직원을 관리할 사장 권한이 없습니다.", 403);
  }

  return membership;
}

export async function updateStaffMembershipRole(
  {
    actorUserId,
    membershipId,
    role,
  }: {
    actorUserId: string;
    membershipId: string;
    role: MenuSiteMemberRole;
  },
  {
    adminSupabase,
    now = new Date(),
  }: {
    adminSupabase?: AdminClient;
    now?: Date;
  } = {},
) {
  if (!isStaffInvitationRole(role)) {
    throw new StaffMembershipManagementError("INVALID_ROLE", "올바른 직원 역할을 선택해 주세요.", 400);
  }

  const adminClient = adminSupabase ?? createAdminClient();
  const normalizedActorUserId = actorUserId.trim();
  const normalizedMembershipId = membershipId.trim();
  const membership = await getOwnedActiveMembership(
    adminClient,
    normalizedActorUserId,
    normalizedMembershipId,
  );

  if (membership.role === role) return { changed: false, role };

  const nowIso = now.toISOString();
  const { data: updatedData, error: updateError } = await adminClient
    .from("menu_site_members")
    .update({ role, updated_at: nowIso })
    .eq("id", membership.id)
    .eq("status", "active")
    .eq("role", membership.role)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedData) {
    throw new StaffMembershipManagementError("MEMBERSHIP_CHANGED", "직원 상태가 변경되었습니다.", 409);
  }

  const { error: auditError } = await adminClient.from("menu_site_audit_logs").insert({
    menu_site_id: membership.menu_site_id,
    actor_user_id: normalizedActorUserId,
    actor_role: "owner",
    action: "staff.role_changed",
    target_type: "menu_site_member",
    target_id: membership.id,
    metadata: { from_role: membership.role, to_role: role },
  });

  if (auditError) {
    await adminClient
      .from("menu_site_members")
      .update({ role: membership.role, updated_at: nowIso })
      .eq("id", membership.id)
      .eq("status", "active")
      .eq("role", role);
    throw new StaffMembershipManagementError("MEMBERSHIP_UPDATE_FAILED", "역할 변경 감사 기록을 만들지 못했습니다.", 500);
  }

  return { changed: true, role };
}

export async function revokeStaffMembership(
  {
    actorUserId,
    membershipId,
  }: {
    actorUserId: string;
    membershipId: string;
  },
  {
    adminSupabase,
    now = new Date(),
  }: {
    adminSupabase?: AdminClient;
    now?: Date;
  } = {},
) {
  const adminClient = adminSupabase ?? createAdminClient();
  const normalizedActorUserId = actorUserId.trim();
  const normalizedMembershipId = membershipId.trim();
  const membership = await getOwnedActiveMembership(
    adminClient,
    normalizedActorUserId,
    normalizedMembershipId,
  );
  const nowIso = now.toISOString();
  const { data: revokedData, error: revokeError } = await adminClient
    .from("menu_site_members")
    .update({ status: "revoked", revoked_at: nowIso, updated_at: nowIso })
    .eq("id", membership.id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (revokeError || !revokedData) {
    throw new StaffMembershipManagementError("MEMBERSHIP_CHANGED", "직원 상태가 변경되었습니다.", 409);
  }

  const { error: auditError } = await adminClient.from("menu_site_audit_logs").insert({
    menu_site_id: membership.menu_site_id,
    actor_user_id: normalizedActorUserId,
    actor_role: "owner",
    action: "staff.access_revoked",
    target_type: "menu_site_member",
    target_id: membership.id,
    metadata: { role: membership.role },
  });

  if (auditError) {
    await adminClient
      .from("menu_site_members")
      .update({ status: "active", revoked_at: null, updated_at: nowIso })
      .eq("id", membership.id)
      .eq("status", "revoked")
      .eq("revoked_at", nowIso);
    throw new StaffMembershipManagementError("MEMBERSHIP_UPDATE_FAILED", "접근 회수 감사 기록을 만들지 못했습니다.", 500);
  }

  return { revoked: true };
}
