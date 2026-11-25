"use server";

import { revalidatePath } from "next/cache";
import type { OrderAlimtalkAction } from "@/lib/order-ready-alimtalk";
import { handleOrderAlimtalk, OrderAlimtalkError } from "@/lib/server/order-ready-alimtalk-service";
import { OrderManagementInputError } from "@/lib/order-management";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";

export async function updateOrderAlimtalkAction(
  menuSiteId: string,
  input: Parameters<OrderAlimtalkAction>[0],
): ReturnType<OrderAlimtalkAction> {
  try {
    const attempt = await handleOrderAlimtalk(menuSiteId, input);
    revalidatePath(`/mypage/menus/${menuSiteId}/orders`);
    return { attempt };
  } catch (error) {
    if (error instanceof MenuSiteAccessError) return { error: "알림톡을 처리할 권한이 없습니다." };
    if (error instanceof OrderAlimtalkError || error instanceof OrderManagementInputError) {
      return { error: error.message };
    }
    return { error: "알림톡 처리 중 오류가 발생했습니다. 잠시 뒤 다시 확인해 주세요." };
  }
}
