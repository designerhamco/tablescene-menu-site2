"use server";
import {revalidatePath} from "next/cache";
import type {AlimtalkWalletAction} from "@/lib/alimtalk-wallet";
import {AlimtalkWalletError,loadAccountAlimtalkWallet,reconcileAlimtalkTopup} from "@/lib/server/alimtalk-wallet-service";
import {AlimtalkRefundError,handleAccountAlimtalkRefund} from "@/lib/server/alimtalk-refund-service";
import {createClient} from "@/lib/supabase/server";
export async function updateAccountAlimtalkWallet(input:Parameters<AlimtalkWalletAction>[0]):ReturnType<AlimtalkWalletAction>{
  try{
    const db=await createClient(),{data:{user}}=await db.auth.getUser();
    if(!user)throw new AlimtalkWalletError("로그인이 필요합니다.");
    if(!input||!["refresh","complete","refund-request","refund-cancel"].includes(input.intent))throw new AlimtalkWalletError("충전은 메뉴판의 주문 설정에서 이용해 주세요.");
    if(input.intent==="refund-request"||input.intent==="refund-cancel")await handleAccountAlimtalkRefund(input);
    if(input.intent==="complete")await reconcileAlimtalkTopup(input.paymentId,user.id);
    revalidatePath("/mypage/alimtalk");
    return {wallet:await loadAccountAlimtalkWallet(),notice:input.intent==="refund-request"?"환불 신청 상태를 저장했습니다.":input.intent==="refund-cancel"?"환불 신청을 취소했습니다.":input.intent==="complete"?"결제 상태를 확인했습니다.":undefined};
  }catch(error){return {error:error instanceof AlimtalkWalletError||error instanceof AlimtalkRefundError?error.message:"알림톡 잔액을 확인하지 못했습니다."};}
}
