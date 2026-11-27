import "server-only";
import type { AlimtalkWalletInput } from "@/lib/alimtalk-wallet";
import { ALIMTALK_BILLING_TERMS_VERSION } from "@/lib/alimtalk-billing-policy";
import { normalizeOrderManagementId } from "@/lib/order-management";
import { requireMenuSitePermission } from "./menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { alimtalkRefundExecutionEnabled } from "./alimtalk-refund-worker";

export class AlimtalkRefundError extends Error {}
const errors: Record<string,string> = {
  WALLET_OWNER_REQUIRED: "환불 신청은 사장님만 할 수 있습니다.", WALLET_FROZEN: "결제 내역 확인이 필요합니다. 고객지원에 문의해 주세요.",
  WALLET_REFUND_HELD: "결과 확인 중인 발송을 먼저 정산한 뒤 환불을 신청해 주세요.", WALLET_REFUND_EMPTY: "환불할 잔액이 없습니다.",
  WALLET_REFUND_STALE: "잔액이 변경됐습니다. 새로고침한 뒤 환불 금액을 다시 확인해 주세요.",
  WALLET_REFUND_FUNDING: "충전 결제 내역을 확인해야 합니다. 고객지원에 문의해 주세요.",
  WALLET_TERMS_CHANGED: "충전·환불 안내가 변경됐습니다. 새로고침한 뒤 다시 확인해 주세요.",
  WALLET_REFUND_PROCESSING: "관리자가 처리를 시작했거나 이미 종료된 신청입니다. 상태를 새로고침해 주세요.",
};
function dbError(message: string) { return new AlimtalkRefundError(Object.entries(errors).find(([key])=>message.includes(key))?.[1] ?? "환불 신청을 처리하지 못했습니다. 잠시 뒤 다시 확인해 주세요."); }
export async function handleOwnerAlimtalkRefund(menuId: string, input: Extract<AlimtalkWalletInput,{intent:"refund-request" | "refund-cancel"}>) {
  const context = await requireMenuSitePermission(menuId,"menu.edit");
  if (!context.isOwner) throw new AlimtalkRefundError("환불 신청은 사장님만 할 수 있습니다.");
  return handleRefundForActor(menuId,context.actorUserId,input);
}
export async function handleAccountAlimtalkRefund(input:Extract<AlimtalkWalletInput,{intent:"refund-request"|"refund-cancel"}>) {
  const db=await createClient(),{data:{user}}=await db.auth.getUser();
  if(!user)throw new AlimtalkRefundError("로그인이 필요합니다.");
  return handleRefundForActor(null,user.id,input);
}
async function handleRefundForActor(menuId:string|null,actorId:string,input:Extract<AlimtalkWalletInput,{intent:"refund-request"|"refund-cancel"}>) {
  const id = normalizeOrderManagementId(input.requestId), db = createAdminClient();
  if (input.intent === "refund-request") {
    if (input.termsVersion !== ALIMTALK_BILLING_TERMS_VERSION || !Number.isSafeInteger(input.amount) || input.amount<=0 || input.amount>1_000_000_000) throw new AlimtalkRefundError("환불 금액과 충전·환불 안내를 다시 확인해 주세요.");
    const {error} = await db.rpc("request_alimtalk_refund",{p_menu_id:menuId,p_actor_id:actorId,p_request_id:id,p_expected_balance:input.amount,p_terms_version:input.termsVersion});
    if (error) throw dbError(error.message);
  } else {
    const {error} = await db.rpc("cancel_alimtalk_refund",{p_actor_id:actorId,p_request_id:id});
    if (error) throw dbError(error.message);
  }
}

export async function requireAlimtalkRefundAdmin() {
  const db = await createClient(), {data:{user}} = await db.auth.getUser();
  if (!user) throw new AlimtalkRefundError("관리자 로그인이 필요합니다.");
  const admin = await db.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
  if (admin.error || !admin.data) throw new AlimtalkRefundError("관리자 권한이 필요합니다.");
  return user.id;
}
export async function loadAlimtalkRefundQueue(page=1) {
  await requireAlimtalkRefundAdmin(); const db = createAdminClient();
  const requests = await db.from("alimtalk_refund_requests").select("id,owner_id,menu_site_id,amount,refunded_amount,state,created_at,processing_at",{count:"exact"}).order("created_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*50,page*50-1);
  if (requests.error) throw new AlimtalkRefundError("환불 신청 목록을 불러오지 못했습니다.");
  const ids = requests.data.map(row=>row.id);
  const sites=ids.length?await db.from("menu_sites").select("id,name").in("id",[...new Set(requests.data.map(row=>row.menu_site_id))]):null;
  if (sites?.error) throw new AlimtalkRefundError("환불 결제 내역을 불러오지 못했습니다.");
  const names = new Map(sites?.data?.map(row=>[row.id,row.name]));
  return {rows:requests.data.map(row=>({...row,menuName:names.get(row.menu_site_id)??"이전 메뉴판"})),total:requests.count??0};
}
export async function approveAlimtalkRefund(requestIdInput:string,amount:number) {
  const actor=await requireAlimtalkRefundAdmin(),id=normalizeOrderManagementId(requestIdInput);
  if(!Number.isSafeInteger(amount)||amount<=0||amount>1_000_000_000)throw new AlimtalkRefundError("환불 금액을 다시 확인해 주세요.");
  if(!(await alimtalkRefundExecutionEnabled()))throw new AlimtalkRefundError("PG 계약과 환불 검수 전에는 자동 카드 환불을 실행할 수 없습니다.");
  const result=await createAdminClient().rpc("approve_alimtalk_refund",{p_admin_id:actor,p_request_id:id,p_expected_remaining:amount});
  if(result.error)throw new AlimtalkRefundError("신청 금액·처리 상태·담당자가 변경되었는지 새로고침해 확인해 주세요.");
}
export async function loadAlimtalkRefundDetail(requestIdInput:string,paymentPage=1) {
  await requireAlimtalkRefundAdmin();const requestId=normalizeOrderManagementId(requestIdInput),db=createAdminClient();
  const request=await db.from("alimtalk_refund_requests").select("*").eq("id",requestId).maybeSingle();
  if(request.error||!request.data)throw new AlimtalkRefundError("환불 신청을 불러오지 못했습니다.");
  const payments=await db.from("alimtalk_refund_payments").select("payment_id,amount,refunded_amount",{count:"exact"}).eq("refund_id",requestId).order("payment_id").range((paymentPage-1)*50,paymentPage*50-1);
  if(payments.error)throw new AlimtalkRefundError("환불 대상 결제를 불러오지 못했습니다.");
  const jobs=payments.data.length?await db.from("alimtalk_refund_jobs").select("payment_id,state,last_error_code").eq("refund_id",requestId).in("payment_id",payments.data.map(p=>p.payment_id)):null;
  if(jobs?.error)throw new AlimtalkRefundError("환불 처리 상태를 불러오지 못했습니다.");
  const byPayment=new Map(jobs?.data.map(j=>[j.payment_id,j]));
  return {request:request.data,payments:payments.data.map(p=>({...p,job:byPayment.get(p.payment_id)})),total:payments.count??0,executionEnabled:await alimtalkRefundExecutionEnabled()};
}
