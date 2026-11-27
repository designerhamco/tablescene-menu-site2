"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { normalizeOrderManagementId } from "@/lib/order-management";
import { AlimtalkRefundError, requireAlimtalkRefundAdmin, loadAlimtalkRefundDetail, approveAlimtalkRefund } from "@/lib/server/alimtalk-refund-service";
import { reconcileAlimtalkTopup } from "@/lib/server/alimtalk-wallet-service";
import { alimtalkRefundExecutionEnabled, drainAlimtalkRefundJobs } from "@/lib/server/alimtalk-refund-worker";
import type { AlimtalkRefundAdminIntent } from "@/lib/alimtalk-refund-admin";
export async function manageAlimtalkRefund(requestIdInput:string,intent:AlimtalkRefundAdminIntent,paymentPage=1,amount?:number) {
  try {
    await requireAlimtalkRefundAdmin();const id=normalizeOrderManagementId(requestIdInput);
    if(intent==="approve" || intent==="process") {
      if(intent==="approve")await approveAlimtalkRefund(id,amount??NaN);
      else if(!(await alimtalkRefundExecutionEnabled()))throw new AlimtalkRefundError("자동 환불 실행은 아직 꺼져 있습니다.");
      // Approval enqueues all source payments, including other table pages.
      after(async()=>{try{await drainAlimtalkRefundJobs(id);}catch{console.error("[alimtalk-refund] background batch needs reconciliation");}finally{revalidatePath("/admin/alimtalk-refunds");}});
    }else if(intent==="check") {
      if(!Number.isSafeInteger(paymentPage)||paymentPage<1||paymentPage>20000)throw new AlimtalkRefundError("대상 페이지를 확인해 주세요.");
      const detail=await loadAlimtalkRefundDetail(id,paymentPage);
      const results=await Promise.allSettled(detail.payments.map(payment=>reconcileAlimtalkTopup(payment.payment_id)));
      if(results.some(result=>result.status==="rejected"))throw new AlimtalkRefundError("일부 결제 결과를 확인하지 못했습니다. 이미 완료된 환불을 다시 실행하지 말고 결과를 다시 확인해 주세요.");
    }else throw new AlimtalkRefundError("진행할 작업을 확인해 주세요.");
    revalidatePath("/admin/alimtalk-refunds");
    return {notice:intent==="approve"?"환불을 승인했습니다. 원 결제별로 취소 결과를 확인하고 있습니다.":intent==="process"?"승인된 환불의 처리 상태를 확인하고 있습니다.":"이 페이지의 결제 결과를 확인했습니다."};
  }catch(error){return {error:error instanceof AlimtalkRefundError?error.message:"환불 처리 상태를 확인하지 못했습니다."};}
}
