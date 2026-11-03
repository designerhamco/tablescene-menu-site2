"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/postpay-order-runtime";
import { setMenuOrderFeatureEnabled } from "@/lib/server/menu-order-settings-service";
import type { MenuOrderSettingsSection } from "@/lib/menu-order-settings";
import { setMenuPublicationStatus } from "@/lib/server/menu-publication-service";

export type OperationFeatureUpdateResult = { status: "success" | "error"; message: string };

export async function updateOperationPublication(input: { menuId: string; published: boolean; expectedPublished: boolean }): Promise<OperationFeatureUpdateResult> {
  try {
    if (!input || !isUuid(input.menuId) || typeof input.published !== "boolean" || typeof input.expectedPublished !== "boolean") throw new Error("변경할 공개 상태를 확인해 주세요.");
    const result = await setMenuPublicationStatus(input.menuId, input.published ? "published" : "draft", input.expectedPublished);
    revalidatePath("/menu", "layout");
    if (result.slug) revalidatePath(`/menu/${result.slug}`);
    revalidatePath("/mypage");
    revalidatePath(`/mypage/menus/${input.menuId}/edit`);
    for (const section of ["orders", "calls", "orders/settings", "calls/settings", "tables"]) revalidatePath(`/mypage/menus/${input.menuId}/${section}`);
    revalidatePath("/mypage/operations");
    return { status: "success", message: input.published ? "메뉴판을 공개했습니다. 주문·호출은 직접 켜 주세요." : "비공개로 변경하고 주문·호출을 OFF로 저장했습니다. 기존 내역은 유지됩니다." };
  } catch (error) {
    revalidatePath("/mypage/operations");
    return { status: "error", message: error instanceof Error ? error.message : "공개 설정을 저장하지 못했습니다." };
  }
}

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
    revalidatePath(`/mypage/menus/${input.menuId}/tables`);
    revalidatePath("/mypage/operations");
    return { status: "success", message: `전체 ${input.feature === "orders" ? "주문" : "호출"} 사용 설정을 ${input.enabled ? "ON" : "OFF"}으로 저장했습니다.` };
  } catch (error) {
    // Refresh stale flags and table readiness on failure as well; the client never
    // displays an unconfirmed change as successfully saved.
    revalidatePath("/mypage/operations");
    return { status: "error", message: error instanceof Error ? error.message : "사용 설정을 저장하지 못했습니다. 다시 시도해 주세요." };
  }
}
