"use server";

import { revalidatePath } from "next/cache";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  createManualPickupQueueEntry,
  PickupQueueServiceError,
  transitionPickupQueueEntry,
} from "@/lib/server/pickup-queue-service";

export type PickupQueueActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function actionError(error: unknown, fallback: string): PickupQueueActionState {
  if (error instanceof PickupQueueServiceError || error instanceof MenuSiteAccessError) {
    return { status: "error", message: error.message };
  }
  return { status: "error", message: fallback };
}

export async function createPickupQueueAction(
  _previousState: PickupQueueActionState,
  formData: FormData,
): Promise<PickupQueueActionState> {
  const menuSiteId = formString(formData, "menuSiteId");
  try {
    await createManualPickupQueueEntry({
      menuSiteId,
      queueNumber: formString(formData, "queueNumber"),
    });
    revalidatePath(`/mypage/menus/${menuSiteId}/pickup`);
    return { status: "success", message: "대기번호를 등록했습니다." };
  } catch (error) {
    return actionError(error, "대기번호를 등록하지 못했습니다.");
  }
}

export async function transitionPickupQueueAction(
  _previousState: PickupQueueActionState,
  formData: FormData,
): Promise<PickupQueueActionState> {
  const menuSiteId = formString(formData, "menuSiteId");
  const nextStatus = formString(formData, "nextStatus");
  try {
    await transitionPickupQueueEntry({
      menuSiteId,
      entryId: formString(formData, "entryId"),
      nextStatus,
    });
    revalidatePath(`/mypage/menus/${menuSiteId}/pickup`);
    return {
      status: "success",
      message: nextStatus === "ready"
        ? "픽업 요청 번호로 이동했습니다."
        : nextStatus === "completed"
          ? "수령 완료로 처리했습니다."
          : "대기번호를 취소했습니다.",
    };
  } catch (error) {
    return actionError(error, "대기번호 상태를 변경하지 못했습니다.");
  }
}
