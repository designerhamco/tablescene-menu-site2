"use client";
import { useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import AlimtalkWalletSettings from "@/components/mypage/AlimtalkWalletSettings";
import type { AlimtalkWalletAction, AlimtalkWalletEntry, AlimtalkWalletView } from "@/lib/alimtalk-wallet";
import { ALIMTALK_BILLING_TERMS_VERSION } from "@/lib/alimtalk-billing-policy";

const empty = (): AlimtalkWalletView => ({ balance: 0, reserved: 0, frozen: false, unitPrice: 12, checkoutEnabled: true, entries: [], pendingTopups: [],termsVersion:ALIMTALK_BILLING_TERMS_VERSION,refunds:[] });
export default function WalletDemo() {
  const wallet = useRef(empty()), [revision, setRevision] = useState(0), [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(empty);
  const hold = useRef(false);
  function entry(kind: AlimtalkWalletEntry["kind"], amount: number) {
    wallet.current.entries.unshift({ id: crypto.randomUUID(), kind, amount, balance: wallet.current.balance, reserved: wallet.current.reserved,
      createdAt: new Date().toISOString(), menuName: "샘플 매장", orderNumber: ["hold","charge","release"].includes(kind) ? 101 : null });
  }
  const action: AlimtalkWalletAction = async input => {
    if (input.intent === "topup") { wallet.current.balance += input.amount; entry("topup", input.amount); }
    if(input.intent==="refund-request") {
      if(wallet.current.reserved>0 || wallet.current.balance!==input.amount)return {error:"잔액이 변경됐습니다. 다시 확인해 주세요."};
      wallet.current.reserved+=input.amount;wallet.current.checkoutEnabled=false;
      wallet.current.refunds!.unshift({id:input.requestId,amount:input.amount,refundedAmount:0,state:"requested",createdAt:new Date().toISOString()});entry("refund_hold",input.amount);
    }
    if(input.intent==="refund-cancel") {
      const request=wallet.current.refunds!.find(row=>row.id===input.requestId);
      if(!request || request.state!=="requested")return {error:"이미 처리가 시작된 신청입니다."};
      wallet.current.reserved-=request.amount;wallet.current.checkoutEnabled=true;request.state="cancelled";entry("refund_release",request.amount);
    }
    return { wallet: structuredClone(wallet.current), notice: input.intent === "topup" ? "체험용 잔액을 충전했습니다. 실제 결제는 없습니다." : input.intent==="refund-request"?"체험용 환불을 신청했습니다.":input.intent==="refund-cancel"?"체험용 환불 신청을 취소했습니다.":undefined };
  };
  function refund(outcome:"processing"|"completed") {
    const request=wallet.current.refunds!.find(row=>row.state===(outcome==="processing"?"requested":"processing"));
    if(!request){setError("먼저 환불 신청과 처리 시작을 순서대로 체험해 주세요.");return;}
    setError("");request.state=outcome;
    if(outcome==="completed"){wallet.current.balance-=request.amount;wallet.current.reserved-=request.amount;request.refundedAmount=request.amount;wallet.current.checkoutEnabled=true;entry("refund",request.amount);}
    setSnapshot(structuredClone(wallet.current));setRevision(n=>n+1);
  }
  function simulate(outcome: "sent" | "failed" | "pending") {
    setError("");
    if (!hold.current) {
      if (wallet.current.balance - wallet.current.reserved < 12) { setError("잔액이 부족합니다. 체험용 잔액을 먼저 충전해 주세요."); return; }
      wallet.current.reserved += 12; hold.current = true; entry("hold", 12);
    }
    if (outcome !== "pending") {
      wallet.current.reserved -= 12; hold.current = false;
      if (outcome === "sent") wallet.current.balance -= 12;
      entry(outcome === "sent" ? "charge" : "release", 12);
    }
    setSnapshot(structuredClone(wallet.current)); setRevision(n => n + 1);
  }
  return <div className="site-stack-group">
    <p className="type-body-sm">로컬 체험 화면입니다. 카드 결제·카카오톡 발송·운영 데이터 변경은 없습니다.</p>
    <div className="site-action-row">
      <Button variant="outline" onClick={() => simulate("sent")}>발송 성공 체험</Button>
      <Button variant="outline" onClick={() => simulate("failed")}>발송 실패 체험</Button>
      <Button variant="outline" onClick={() => simulate("pending")}>결과 확인 중 체험</Button>
      <Button variant="outline" onClick={()=>refund("processing")}>환불 처리 시작 체험</Button>
      <Button variant="outline" onClick={()=>refund("completed")}>환불 완료 체험</Button>
      <Button variant="outline" onClick={() => { wallet.current = empty(); hold.current = false; setError(""); setSnapshot(empty()); setRevision(n => n + 1); }}>체험 초기화</Button>
    </div>
    {error && <p role="alert" className="type-body-sm">{error}</p>}
    <AlimtalkWalletSettings key={revision} initial={snapshot} action={action} menuId="local-wallet" />
  </div>;
}
