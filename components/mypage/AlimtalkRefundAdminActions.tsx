"use client";
import { useState,useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { FieldMessage } from "@/app/components/ui/field-message";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { manageAlimtalkRefund } from "@/app/admin/alimtalk-refunds/actions";
export default function AlimtalkRefundAdminActions({id,state,paymentPage}:{id:string;state:string;paymentPage:number}) {
  const [busy,start]=useTransition(),[error,setError]=useState<string>(),[notice,setNotice]=useState<{text:string;event:number}>();
  function run(intent:"claim"|"check"){if(busy)return;setError(undefined);start(async()=>{try{const result=await manageAlimtalkRefund(id,intent,paymentPage);if(result.error)setError(result.error);if(result.notice)setNotice({text:result.notice,event:Date.now()});}catch{setError("처리하지 못했습니다. 결과를 다시 확인해 주세요.");}});}
  return <div className="site-stack-copy"><ActionFeedbackToast message={notice?.text} eventKey={notice?.event}/><div className="site-action-row">
    {state==="requested"&&<Button variant="outline" disabled={busy} onClick={()=>run("claim")}>환불 처리 시작</Button>}
    <Button variant="outline" disabled={busy} onClick={()=>run("check")}>이 페이지 결제 결과 확인</Button>
    <a href="https://admin.portone.io" target="_blank" rel="noopener noreferrer" className="site-button site-button-link">포트원 관리자 열기<span className="sr-only"> (새 창)</span></a>
  </div>{error&&<FieldMessage role="alert">{error}</FieldMessage>}</div>;
}
