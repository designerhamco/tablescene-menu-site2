"use server";

import { revalidatePath } from "next/cache";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  cancelUnpaidOrder,
  markOrderManualPayment,
  manageOrderSettlement,
  moveTableOrders,
  OrderManagementError,
  transitionOrderStatus,
} from "@/lib/server/order-management-service";
import type { OrderManagementActionState } from "./action-state";

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
  let orderId = formString(formData, "orderId");
  const intent = formString(formData, "intent");
  const fromTableDetail = formString(formData, "source") === "table-detail";

  try {
    let groupMessage: string | undefined;
    let movedCount: number | undefined;
    if (intent === "move-table") {
      movedCount = await moveTableOrders({
        menuSiteId,
        sourceTableId: formString(formData, "sourceTableId"),
        destinationTableId: formString(formData, "destinationTableId"),
        orderIds: formData.getAll("orderIds"),
        requestId: formString(formData, "requestId"),
      });
    } else if (intent === "combine" || intent === "release" || intent === "pay") {
      const result = await manageOrderSettlement({
        menuSiteId, action: intent, requestId: formString(formData, "requestId"), groupId: formString(formData, "groupId"),
        tableIds: formData.getAll("tableIds"), orderIds: formData.getAll("orderIds"),
        expectedTotal: formString(formData, "expectedTotal"), method: formString(formData, "method"),
      });
      orderId = result.groupId;
      groupMessage = intent === "combine" ? `주문 ${result.count}건을 결합했습니다.`
        : intent === "release" ? "주문 결합을 해제했습니다."
          : `결합 주문 ${result.count}건의 외부 결제 완료를 기록했습니다.`;
    } else if (intent === "transition") {
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
        fromTableDetail,
      });
    } else if (intent === "manual-payment") {
      await markOrderManualPayment({
        menuSiteId,
        orderId,
        method: formString(formData, "method"),
        fromTableDetail,
      });
    } else {
      return { status: "error", message: "올바른 주문 작업을 선택해 주세요.", orderId };
    }

    revalidatePath(`/mypage/menus/${menuSiteId}/orders`);
    revalidatePath(`/mypage/menus/${menuSiteId}/kitchen`);
    revalidatePath("/mypage/operations");
    revalidatePath("/mypage/operations/orders");
    return {
      status: "success",
      message: groupMessage ?? (movedCount ? `주문 ${movedCount}건을 이동했습니다.` : intent === "manual-payment"
        ? "외부 결제 완료로 기록했습니다."
        : intent === "cancel"
          ? "미결제 주문을 취소했습니다."
          : formString(formData, "nextStatus") === "served"
            ? "픽업·서빙 완료로 표시했습니다."
            : "주문 상태를 다음 단계로 변경했습니다."),
      orderId,
    };
  } catch (error) {
    return actionError(error, orderId);
  }
}
