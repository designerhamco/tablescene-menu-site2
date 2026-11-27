"use client";
import { useEffect,useState,useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { FieldMessage } from "@/app/components/ui/field-message";
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from "@/app/components/ui/dialog";
import InfoTooltip from "@/components/ui/InfoTooltip";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { manageAlimtalkRefund } from "@/app/admin/alimtalk-refunds/actions";
import type { AlimtalkRefundAdminAction,AlimtalkRefundAdminIntent } from "@/lib/alimtalk-refund-admin";
export default function AlimtalkRefundAdminActions({id,state,paymentPage,remaining,totalPayments,approved,executionEnabled,action=manageAlimtalkRefund}:{
  id:string;state:string;paymentPage:number;remaining:number;totalPayments:number;approved:boolean;executionEnabled:boolean;action?:AlimtalkRefundAdminAction;
}) {
  const router=useRouter(),[busy,start]=useTransition(),[open,setOpen]=useState(false),[error,setError]=useState<string>(),[notice,setNotice]=useState<{text:string;event:number}>();
  const canApprove=!approved&&["requested","processing"].includes(state)&&remaining>0;
  useEffect(()=>{
    if(!approved||state!=="processing"||!executionEnabled||action!==manageAlimtalkRefund)return;
    let running=false;
    const timer=setInterval(async()=>{if(running||document.hidden)return;running=true;try{await action(id,"process",paymentPage);router.refresh();}catch{/* The next read-only status refresh can recover. */}finally{running=false;}},15000);
    return()=>clearInterval(timer);
  },[approved,state,executionEnabled,action,id,paymentPage,router]);
  function run(intent:AlimtalkRefundAdminIntent){if(busy)return;setError(undefined);start(async()=>{try{
    const result=await action(id,intent,paymentPage,intent==="approve"?remaining:undefined);
    if(result.error)setError(result.error);
    if(result.notice){setNotice({text:result.notice,event:Date.now()});setOpen(false);if(action===manageAlimtalkRefund)router.refresh();}
  }catch{setError("처리하지 못했습니다. 새 환불을 실행하지 말고 기존 결과를 다시 확인해 주세요.");}});}
  return <div className="site-stack-copy"><ActionFeedbackToast message={notice?.text} eventKey={notice?.event}/><div className="site-action-row">
    {canApprove&&<Button disabled={busy||!executionEnabled} onClick={()=>setOpen(true)}>환불 승인</Button>}
    {approved&&state==="processing"&&<Button variant="outline" disabled={busy||!executionEnabled} onClick={()=>run("process")}>환불 처리 계속</Button>}
    {!executionEnabled&&<InfoTooltip label="자동 환불 실행 안내">PG 계약과 실결제 환불 검수를 마친 뒤 실행할 수 있습니다. 지금은 실제 카드 취소가 꺼져 있습니다.</InfoTooltip>}
    <Button variant="outline" disabled={busy} onClick={()=>run("check")}>이 페이지 결제 결과 확인</Button>
    <a href="https://admin.portone.io" target="_blank" rel="noopener noreferrer" className="site-button site-button-link">포트원 관리자 열기<span className="sr-only"> (새 창)</span></a>
  </div>{error&&!open&&<FieldMessage role="alert">{error}</FieldMessage>}
    <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><DialogContent scrollable>
      <DialogHeader reserveCloseButton><DialogTitle>카드 환불 승인</DialogTitle><DialogDescription>미사용 충전금 {remaining.toLocaleString("ko-KR")}원을 원래 결제한 카드로 환불합니다.</DialogDescription></DialogHeader>
      <div className="site-stack-block"><p className="type-body-sm">원 결제 {totalPayments.toLocaleString("ko-KR")}건에 나누어 취소하며 수수료는 0원입니다. 카드사에서 취소가 확인된 금액만 환불 완료로 반영됩니다.</p><p className="type-caption site-copy-muted break-all">신청 {id}</p></div>
      {error&&<FieldMessage role="alert">{error}</FieldMessage>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>돌아가기</Button><Button disabled={busy||!executionEnabled} onClick={()=>run("approve")}>{busy?"승인 중…":`${remaining.toLocaleString("ko-KR")}원 환불 승인`}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
