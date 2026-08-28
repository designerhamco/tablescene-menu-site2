"use server";

import { revalidatePath } from "next/cache";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  CallManagementError,
  transitionStaffCall,
} from "@/lib/server/call-management-service";
import { CallItemServiceError, saveStaffCallItems } from "@/lib/server/call-item-service";

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

export type CallItemActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialCallItemActionState: CallItemActionState = {
  status: "idle",
  message: "",
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

export async function saveCallItemsAction(
  _previousState: CallItemActionState,
  formData: FormData,
): Promise<CallItemActionState> {
  const menuSiteId = formString(formData, "menuSiteId");
  try {
    const items = JSON.parse(formString(formData, "itemsJson")) as unknown;
    await saveStaffCallItems({ menuSiteId, items });
    revalidatePath(`/mypage/menus/${menuSiteId}/calls`);
    return { status: "success", message: "호출 항목을 저장했습니다." };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { status: "error", message: "호출 항목을 다시 확인해 주세요." };
    }
    if (error instanceof CallItemServiceError || error instanceof MenuSiteAccessError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "호출 항목을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
