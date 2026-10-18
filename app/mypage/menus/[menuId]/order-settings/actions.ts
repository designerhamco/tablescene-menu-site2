"use server";
import { revalidatePath } from "next/cache";
import { saveMenuItemOrderConfiguration } from "@/lib/server/menu-order-catalog-settings-service";
import { saveMenuOrderSettings } from "@/lib/server/menu-order-settings-service";
export type OrderSettingsState = {
  status: "idle" | "success" | "error";
  message: string;
};
export async function updateOrderSettings(
  _previous: OrderSettingsState,
  form: FormData,
): Promise<OrderSettingsState> {
  try {
    const id = String(form.get("menuId") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new Error("올바른 메뉴판 정보가 필요합니다.");
    await saveMenuOrderSettings(id, {
      orderEnabled: form.get("orderEnabled") === "on",
      callEnabled: form.get("callEnabled") === "on",
      mobilePrepayVisible: form.get("mobilePrepayVisible") === "on",
      postpayEnabled: true,
      orderableCourseIds: form.getAll("orderableCourseId").map(String),
    });
    revalidatePath("/menu", "layout");
    revalidatePath("/mypage/menus/" + id + "/order-settings");
    return {
      status: "success",
      message:
        "주문·호출 설정을 저장했습니다. 선결제는 준비 중이며 후불 주문만 사용할 수 있습니다.",
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "설정을 저장하지 못했습니다.",
    };
  }
}

export async function updateOrderItemConfiguration(
  menuId: string,
  configuration: unknown,
): Promise<{ message: string; updatedAt?: string }> {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(menuId))
      throw new Error("메뉴판 정보를 확인해 주세요.");
    const updatedAt = await saveMenuItemOrderConfiguration(
      menuId,
      configuration,
    );
    revalidatePath("/mypage/menus/" + menuId + "/order-settings");
    revalidatePath("/menu", "layout");
    return { message: "주문 상품과 옵션을 저장했습니다.", updatedAt };
  } catch (e) {
    return {
      message: e instanceof Error ? e.message : "설정을 저장하지 못했습니다.",
    };
  }
}
