"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/postpay-order-runtime";
import { setMenuOrderFeatureEnabled } from "@/lib/server/menu-order-settings-service";
import type { MenuOrderSettingsSection } from "@/lib/menu-order-settings";

export type OperationFeatureUpdateResult = { status: "success" | "error"; message: string };

export async function updateOperationFeature(input: {
  menuId: string;
  feature: MenuOrderSettingsSection;
  enabled: boolean;
  expectedEnabled: boolean;
}): Promise<OperationFeatureUpdateResult> {
  try {
    if (!input || !isUuid(input.menuId) || !["orders", "calls"].includes(input.feature)
      || typeof input.enabled !== "boolean" || typeof input.expectedEnabled !== "boolean")
      throw new Error("변경할 메뉴판과 사용 설정을 확인해 주세요.");
    await setMenuOrderFeatureEnabled(input.menuId, input.feature, input.enabled, input.expectedEnabled);
    revalidatePath("/menu", "layout");
    revalidatePath(`/mypage/menus/${input.menuId}/orders/settings`);
    revalidatePath(`/mypage/menus/${input.menuId}/calls/settings`);
    revalidatePath(`/mypage/menus/${input.menuId}/order-settings`);
    revalidatePath("/mypage/operations");
    return { status: "success", message: `${input.feature === "orders" ? "주문" : "호출"} 사용 설정을 ${input.enabled ? "ON" : "OFF"}으로 저장했습니다.` };
  } catch (error) {
    // Refresh stale flags and table readiness on failure as well; the client never
    // displays an unconfirmed change as successfully saved.
    revalidatePath("/mypage/operations");
    return { status: "error", message: error instanceof Error ? error.message : "사용 설정을 저장하지 못했습니다. 다시 시도해 주세요." };
  }
}
