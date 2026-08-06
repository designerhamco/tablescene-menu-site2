"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isDeletedAccountStatus } from "@/lib/account-status";
import {
  hashStaffInvitationToken,
  isValidStaffInvitationToken,
  STAFF_INVITATION_INTENT_COOKIE,
} from "@/lib/staff-invitation-token";
import { createClient } from "@/lib/supabase/server";

export type StaffInvitationAcceptanceState = {
  status: "idle" | "error";
  message: string;
};

function getAcceptanceErrorMessage(code: string | undefined) {
  if (code === "42501") return "로그인 이메일이 초대받은 이메일과 일치하지 않거나 이메일 확인이 필요합니다.";
  if (code === "23505") return "이미 이 메뉴판의 활동 중인 직원입니다.";
  if (code === "55000") return "현재 사용할 수 없는 메뉴판의 초대입니다.";
  if (code === "40001") return "초대 상태가 변경되었습니다. 이메일 링크를 다시 열어 주세요.";
  return "초대가 만료되었거나 이미 사용되어 더 이상 수락할 수 없습니다.";
}

function clearInvitationIntent(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set({
    name: STAFF_INVITATION_INTENT_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/staff/invitations",
    maxAge: 0,
  });
}

export async function acceptStaffInvitationAction(
  previousState: StaffInvitationAcceptanceState,
): Promise<StaffInvitationAcceptanceState> {
  void previousState;
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_INVITATION_INTENT_COOKIE)?.value;

  if (!isValidStaffInvitationToken(token)) {
    clearInvitationIntent(cookieStore);
    return { status: "error", message: "유효한 초대 정보를 찾을 수 없습니다. 이메일 링크를 다시 열어 주세요." };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user || isDeletedAccountStatus(user.app_metadata)) {
    return { status: "error", message: "초대를 수락하려면 다시 로그인해 주세요." };
  }
  if (!user.email || !user.email_confirmed_at) {
    return { status: "error", message: "이메일 확인을 마친 계정으로 로그인해 주세요." };
  }

  const { data, error } = await supabase.rpc("accept_menu_site_invitation", {
    p_token_hash: hashStaffInvitationToken(token),
  });

  if (error || !data || data.length === 0) {
    if (error?.code !== "40001") clearInvitationIntent(cookieStore);
    return { status: "error", message: getAcceptanceErrorMessage(error?.code) };
  }

  clearInvitationIntent(cookieStore);
  redirect("/mypage?tab=menus&message=staff-invitation-accepted");
}
