"use server";

import { revalidatePath } from "next/cache";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { PaymentTerminalPreparationError, type PaymentTerminalPreparation } from "@/lib/payment-terminal-preparation";
import { savePaymentTerminalPreparation } from "@/lib/server/payment-terminal-preparation-service";

export async function savePaymentTerminalPreparationAction(menuSiteId: string, input: unknown, revision: number): Promise<
  { ok: true; preparation: PaymentTerminalPreparation } | { ok: false; message: string }
> {
  try {
    const preparation = await savePaymentTerminalPreparation(menuSiteId, input, revision);
    revalidatePath(`/mypage/menus/${menuSiteId}/orders/settings`);
    return { ok: true, preparation };
  } catch (error) {
    return { ok: false, message: error instanceof MenuSiteAccessError || error instanceof PaymentTerminalPreparationError ? error.message
      : "연결 준비 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
