"use server";
import { revalidatePath } from "next/cache";
import { saveMenuOrderSettings } from "@/lib/server/menu-order-settings-service";
import { readMenuOrderSettings } from "@/lib/menu-order-settings";
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
    const section = form.get("section");
    if (section !== "orders" && section !== "calls") throw new Error("변경할 설정을 확인해 주세요.");
    const preferences=readMenuOrderSettings({table_order:{customerCheckout:form.get("customerCheckout"),terminalOrderEnabled:form.get("terminalOrderEnabled")==="on",customerPhone:form.get("customerPhone")}});
    await saveMenuOrderSettings(id, {
      orderEnabled: form.get("orderEnabled") === "on",
      callEnabled: form.get("callEnabled") === "on",
      mobilePrepayVisible: preferences.customerCheckout === "both" || preferences.customerCheckout === "prepay",
      postpayEnabled: true,
      orderableCourseIds: [], // Legacy IDs are preserved by the server merge; no per-course opt-in.
      customerCheckout: preferences.customerCheckout,
      terminalOrderEnabled: preferences.terminalOrderEnabled,
      customerPhone: preferences.customerPhone,
    }, section);
    revalidatePath("/menu", "layout");
    revalidatePath("/mypage/menus/" + id + "/order-settings");
    revalidatePath(`/mypage/menus/${id}/orders/settings`);
    revalidatePath(`/mypage/menus/${id}/calls/settings`);
    return {
      status: "success",
      message:
        section === "calls" ? "호출 설정을 저장했습니다." : "접속 환경별 주문 설정을 저장했습니다. 실제 선결제와 알림톡 발송은 준비 중입니다.",
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "설정을 저장하지 못했습니다.",
    };
  }
}
