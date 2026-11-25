"use server";
import { revalidatePath } from "next/cache";
import type { MerchantChannelAction } from "@/lib/merchant-alimtalk-channel";
import { MerchantChannelInputError } from "@/lib/merchant-alimtalk-channel";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { OrderManagementInputError } from "@/lib/order-management";
import { handleMerchantChannel, MerchantChannelError } from "@/lib/server/merchant-alimtalk-channel-service";
import { MerchantChannelProviderError } from "@/lib/server/merchant-alimtalk-channel-provider";

export async function updateMerchantAlimtalkChannel(menuId: string, input: Parameters<MerchantChannelAction>[0]): ReturnType<MerchantChannelAction> {
  try {
    const result = await handleMerchantChannel(menuId, input);
    revalidatePath(`/mypage/menus/${menuId}/orders/settings`);
    return result;
  } catch (error) {
    if (error instanceof MerchantChannelInputError) return { error: error.message, field: error.field };
    if (error instanceof MenuSiteAccessError) return { error: "채널 연결은 이용 가능한 매장의 사장님만 변경할 수 있습니다." };
    if (error instanceof MerchantChannelError || error instanceof MerchantChannelProviderError || error instanceof OrderManagementInputError) return { error: error.message };
    return { error: "채널 연결을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
}
