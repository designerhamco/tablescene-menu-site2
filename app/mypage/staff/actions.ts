"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isDeletedAccountStatus } from "@/lib/account-status";
import { isStaffInvitationRole } from "@/lib/staff-invitations";
import {
  cancelStaffInvitationBatch,
  createStaffInvitation,
  resendStaffInvitationBatch,
  StaffInvitationError,
} from "@/lib/server/staff-invitation-service";
import {
  revokeStaffMembership,
  StaffMembershipManagementError,
  updateStaffMembershipRole,
} from "@/lib/server/staff-membership-management-service";
import { createClient } from "@/lib/supabase/server";

export type StaffInvitationActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createStaffInvitationAction(
  _previousState: StaffInvitationActionState,
  formData: FormData,
): Promise<StaffInvitationActionState> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user || isDeletedAccountStatus(user.app_metadata)) {
    return { status: "error", message: "로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요." };
  }
  if (!user.email || !user.email_confirmed_at) {
    return { status: "error", message: "확인된 이메일 계정만 직원을 초대할 수 있습니다." };
  }

  const role = getFormString(formData, "role");
  if (!isStaffInvitationRole(role)) {
    return { status: "error", message: "올바른 직원 역할을 선택해 주세요." };
  }

  try {
    const result = await createStaffInvitation({
      actorUserId: user.id,
      actorEmail: user.email,
      email: getFormString(formData, "email"),
      menuSiteIds: formData
        .getAll("menuSiteIds")
        .filter((value): value is string => typeof value === "string"),
      role,
    });

    revalidatePath("/mypage/staff");
    return {
      status: "success",
      message: `${result.invitationCount.toLocaleString("ko-KR")}개 메뉴판의 직원 초대 이메일을 보냈습니다.`,
    };
  } catch (error) {
    if (error instanceof StaffInvitationError) {
      return { status: "error", message: error.message };
    }

    return { status: "error", message: "직원 초대를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

function getStaffManagementActionError(error: unknown) {
  if (!(error instanceof StaffInvitationError)) return "unexpected";
  if (error.code === "INVITATIONS_DISABLED") return "delivery-disabled";
  if (error.code === "INVITATION_NOT_FOUND" || error.code === "INVITATION_BATCH_CHANGED") return "invitation-changed";
  if (error.code === "RATE_LIMITED") return "rate-limited";
  if (error.code === "MENU_SITE_UNAVAILABLE") return "menu-unavailable";
  if (error.code === "OWNER_ACCESS_REQUIRED") return "access-denied";
  return "operation-failed";
}

export async function resendStaffInvitationAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  let resultCode = "resent";

  if (userError || !user || !user.email || !user.email_confirmed_at || isDeletedAccountStatus(user.app_metadata)) {
    resultCode = "auth-required";
  } else {
    try {
      await resendStaffInvitationBatch({
        actorUserId: user.id,
        actorEmail: user.email,
        inviteBatchId: getFormString(formData, "inviteBatchId"),
      });
    } catch (error) {
      resultCode = getStaffManagementActionError(error);
    }
  }

  revalidatePath("/mypage/staff");
  redirect(`/mypage/staff?result=${resultCode}`);
}

export async function cancelStaffInvitationAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  let resultCode = "cancelled";

  if (userError || !user || isDeletedAccountStatus(user.app_metadata)) {
    resultCode = "auth-required";
  } else {
    try {
      await cancelStaffInvitationBatch({
        actorUserId: user.id,
        inviteBatchId: getFormString(formData, "inviteBatchId"),
      });
    } catch (error) {
      resultCode = getStaffManagementActionError(error);
    }
  }

  revalidatePath("/mypage/staff");
  redirect(`/mypage/staff?result=${resultCode}`);
}

function getStaffMembershipActionError(error: unknown) {
  if (!(error instanceof StaffMembershipManagementError)) return "unexpected";
  if (error.code === "MEMBERSHIP_NOT_FOUND" || error.code === "MEMBERSHIP_CHANGED") return "member-changed";
  if (error.code === "OWNER_ACCESS_REQUIRED") return "access-denied";
  if (error.code === "INVALID_ROLE") return "invalid-role";
  return "operation-failed";
}

export async function updateStaffMembershipRoleAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const role = getFormString(formData, "role");
  let resultCode = "role-updated";

  if (userError || !user || isDeletedAccountStatus(user.app_metadata)) {
    resultCode = "auth-required";
  } else if (!isStaffInvitationRole(role)) {
    resultCode = "invalid-role";
  } else {
    try {
      await updateStaffMembershipRole({
        actorUserId: user.id,
        membershipId: getFormString(formData, "membershipId"),
        role,
      });
    } catch (error) {
      resultCode = getStaffMembershipActionError(error);
    }
  }

  revalidatePath("/mypage/staff");
  redirect(`/mypage/staff?result=${resultCode}`);
}

export async function revokeStaffMembershipAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  let resultCode = "access-revoked";

  if (userError || !user || isDeletedAccountStatus(user.app_metadata)) {
    resultCode = "auth-required";
  } else {
    try {
      await revokeStaffMembership({
        actorUserId: user.id,
        membershipId: getFormString(formData, "membershipId"),
      });
    } catch (error) {
      resultCode = getStaffMembershipActionError(error);
    }
  }

  revalidatePath("/mypage/staff");
  redirect(`/mypage/staff?result=${resultCode}`);
}
