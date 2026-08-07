"use server";

import { revalidatePath } from "next/cache";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  CallManagementError,
  transitionStaffCall,
} from "@/lib/server/call-management-service";

export type CallManagementActionState = {
  status: "idle" | "success" | "error";
  message: string;
  callId: string | null;
};

export const initialCallManagementActionState: CallManagementActionState = {
  status: "idle",
  message: "",
  callId: null,
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function mutateCallAction(
  _previousState: CallManagementActionState,
  formData: FormData,
): Promise<CallManagementActionState> {
  const menuSiteId = formString(formData, "menuSiteId");
  const callId = formString(formData, "callId");
  const nextStatus = formString(formData, "nextStatus");
  try {
    await transitionStaffCall({ menuSiteId, callId, nextStatus });
    revalidatePath(`/mypage/menus/${menuSiteId}/calls`);
    return {
      status: "success",
      message: nextStatus === "completed" ? "호출을 완료했습니다." : "호출을 확인했습니다.",
      callId,
    };
  } catch (error) {
    if (error instanceof CallManagementError || error instanceof MenuSiteAccessError) {
      return { status: "error", message: error.message, callId };
    }
    return { status: "error", message: "호출 상태를 변경하지 못했습니다. 새로고침 후 다시 시도해 주세요.", callId };
  }
}
