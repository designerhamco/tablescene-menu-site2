"use server";
import { revalidatePath } from "next/cache";
import type { AlimtalkWalletAction } from "@/lib/alimtalk-wallet";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { AlimtalkWalletError, handleAlimtalkWallet } from "@/lib/server/alimtalk-wallet-service";
export async function updateAlimtalkWallet(menuId: string, input: Parameters<AlimtalkWalletAction>[0]): ReturnType<AlimtalkWalletAction> {
  try {
    const result = await handleAlimtalkWallet(menuId, input);
    revalidatePath(`/mypage/menus/${menuId}/orders/settings`);
    return result;
  } catch (error) {
    if (error instanceof MenuSiteAccessError) return { error: "충전과 잔액 조회는 이용 가능한 매장의 사장님만 할 수 있습니다." };
    return { error: error instanceof AlimtalkWalletError ? error.message : "충전 내역을 처리하지 못했습니다. 잠시 뒤 다시 확인해 주세요." };
  }
}
