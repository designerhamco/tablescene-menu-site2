"use server";

import { revalidatePath } from "next/cache";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  cancelUnpaidOrder,
  markOrderManualPayment,
  OrderManagementError,
  transitionOrderStatus,
} from "@/lib/server/order-management-service";

export type OrderManagementActionState = {
  status: "idle" | "success" | "error";
  message: string;
  orderId: string | null;
};

export const initialOrderManagementActionState: OrderManagementActionState = {
  status: "idle",
  message: "",
  orderId: null,
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function actionError(error: unknown, orderId: string): OrderManagementActionState {
  if (error instanceof OrderManagementError || error instanceof MenuSiteAccessError) {
    return { status: "error", message: error.message, orderId };
  }
  return {
    status: "error",
    message: "주문 작업을 완료하지 못했습니다. 새로고침 후 다시 시도해 주세요.",
    orderId,
  };
}

export async function mutateOrderAction(
  _previousState: OrderManagementActionState,
  formData: FormData,
): Promise<OrderManagementActionState> {
  const menuSiteId = formString(formData, "menuSiteId");
  const orderId = formString(formData, "orderId");
  const intent = formString(formData, "intent");

  try {
    if (intent === "transition") {
      await transitionOrderStatus({
        menuSiteId,
        orderId,
        nextStatus: formString(formData, "nextStatus"),
      });
    } else if (intent === "cancel") {
      await cancelUnpaidOrder({
        menuSiteId,
        orderId,
        reason: formString(formData, "reason"),
      });
    } else if (intent === "manual-payment") {
      await markOrderManualPayment({
        menuSiteId,
        orderId,
        method: formString(formData, "method"),
      });
    } else {
      return { status: "error", message: "올바른 주문 작업을 선택해 주세요.", orderId };
    }

    revalidatePath(`/mypage/menus/${menuSiteId}/orders`);
    return {
      status: "success",
      message: intent === "manual-payment"
        ? "외부 결제 완료로 기록했습니다."
        : intent === "cancel"
          ? "미결제 주문을 취소했습니다."
          : "주문 상태를 다음 단계로 변경했습니다.",
      orderId,
    };
  } catch (error) {
    return actionError(error, orderId);
  }
}
