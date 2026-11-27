"use client";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Table,TableHeader,TableBody,TableRow,TableHead,TableCell } from "@/app/components/ui/table";
import AlimtalkRefundAdminActions from "@/components/mypage/AlimtalkRefundAdminActions";
import type { AlimtalkRefundAdminAction } from "@/lib/alimtalk-refund-admin";

export default function RefundDemo() {
  const [mode,setMode]=useState<"success"|"pending"|"disabled">("success"),[approved,setApproved]=useState(false),[done,setDone]=useState(false);
  function reset(next:typeof mode){setMode(next);setApproved(false);setDone(false);}
  const action:AlimtalkRefundAdminAction=async(_id,intent)=>{
    if(intent==="approve") {setApproved(true);if(mode==="success")setDone(true);return {notice:mode==="success"?"체험용 원 결제 2건의 환불을 확인했습니다.":"승인했습니다. 결과 확인 중인 금액은 계속 보류합니다."};}
    if(approved&&intent==="check"){setDone(true);return {notice:"기존 환불 결과만 다시 조회해 완료를 확인했습니다."};}
    return {notice:"기존 요청을 확인했습니다. 추가 카드 취소는 실행하지 않았습니다."};
  };
  return <div className="site-stack-group"><p className="type-body-sm">로컬 체험 화면입니다. 실제 카드 취소·결제사 조회·운영 데이터 변경은 없습니다.</p>
    <div className="site-action-row"><Button variant="outline" onClick={()=>reset("success")}>환불 성공 체험</Button><Button variant="outline" onClick={()=>reset("pending")}>응답 지연 체험</Button><Button variant="outline" onClick={()=>reset("disabled")}>실행 차단 체험</Button></div>
    <ContentPanel><h2 className="type-section-title">{done?"환불 완료":approved?"환불 처리 중":"환불 신청"}</h2>
      <dl className="site-field-grid"><div className="site-stack-copy"><dt className="type-label">환불 신청 금액 · 수수료 0원</dt><dd className="type-content-title">9,988원</dd></div><div className="site-stack-copy"><dt className="type-label">결제사 취소 확인 금액</dt><dd className="type-content-title">{done?"9,988원":"0원"}</dd></div></dl>
      <AlimtalkRefundAdminActions id="11111111-1111-4111-8111-111111111111" state={done?"completed":approved?"processing":"requested"} paymentPage={1} remaining={done?0:9988} totalPayments={2} approved={approved} executionEnabled={mode!=="disabled"} action={action}/>
      <Table variant="management" label="체험용 원 결제"><TableHeader><TableRow><TableHead>원 결제</TableHead><TableHead align="end">이번 환불 금액</TableHead><TableHead>처리 상태</TableHead></TableRow></TableHeader><TableBody>{[6000,3988].map((amount,i)=><TableRow key={i}><TableCell>체험 카드 결제 {i+1}</TableCell><TableCell align="end" nowrap>{amount.toLocaleString("ko-KR")}원</TableCell><TableCell nowrap>{done?"환불 확인":approved?"결과 확인 중":"승인 대기"}</TableCell></TableRow>)}</TableBody></Table>
      {approved&&!done&&<p className="type-body-sm" role="status">환불 결과를 확인하고 있습니다. 같은 카드 취소를 다시 요청하지 않습니다.</p>}
    </ContentPanel>
  </div>;
}
