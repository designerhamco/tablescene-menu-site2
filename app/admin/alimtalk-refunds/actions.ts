"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeOrderManagementId } from "@/lib/order-management";
import { AlimtalkRefundError, requireAlimtalkRefundAdmin, loadAlimtalkRefundDetail } from "@/lib/server/alimtalk-refund-service";
import { reconcileAlimtalkTopup } from "@/lib/server/alimtalk-wallet-service";
export async function manageAlimtalkRefund(requestIdInput:string,intent:"claim"|"check",paymentPage=1) {
  try {
    const actor=await requireAlimtalkRefundAdmin(),id=normalizeOrderManagementId(requestIdInput);
    if(intent==="claim") {
      const result=await createAdminClient().rpc("claim_alimtalk_refund",{p_admin_id:actor,p_request_id:id});
      if(result.error)throw new AlimtalkRefundError("환불 신청 상태와 담당자를 확인해 주세요.");
    }else if(intent==="check") {
      if(!Number.isSafeInteger(paymentPage)||paymentPage<1||paymentPage>20000)throw new AlimtalkRefundError("대상 페이지를 확인해 주세요.");
      const detail=await loadAlimtalkRefundDetail(id,paymentPage);
      const results=await Promise.allSettled(detail.payments.map(payment=>reconcileAlimtalkTopup(payment.payment_id)));
      if(results.some(result=>result.status==="rejected"))throw new AlimtalkRefundError("일부 결제 결과를 확인하지 못했습니다. 이미 완료된 환불을 다시 실행하지 말고 결과를 다시 확인해 주세요.");
    }else throw new AlimtalkRefundError("진행할 작업을 확인해 주세요.");
    revalidatePath("/admin/alimtalk-refunds");
    return {notice:intent==="claim"?"환불 처리를 시작했습니다. 카드 취소는 아직 실행하지 않았습니다.":"이 페이지의 결제 결과를 확인했습니다."};
  }catch(error){return {error:error instanceof AlimtalkRefundError?error.message:"환불 처리 상태를 확인하지 못했습니다."};}
}
