"use server";

import { revalidatePath } from "next/cache";
import type { KitchenAction } from "@/lib/kitchen-order";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { OrderManagementError, updateKitchenOrder } from "@/lib/server/order-management-service";

export async function mutateKitchenOrderAction(input: {
  menuSiteId: string;
  orderId: string;
  action: KitchenAction;
  itemId?: string;
  checked?: boolean;
}): Promise<{ error?: string }> {
  try {
    await updateKitchenOrder(input);
    revalidatePath(`/mypage/menus/${input.menuSiteId}/kitchen`);
    revalidatePath(`/mypage/menus/${input.menuSiteId}/orders`);
    revalidatePath("/mypage/operations/orders");
    return {};
  } catch (error) {
    if (error instanceof OrderManagementError || error instanceof MenuSiteAccessError) {
      return { error: error.message };
    }
    return { error: "조리 상태를 저장하지 못했습니다. 다시 시도해 주세요." };
  }
}
