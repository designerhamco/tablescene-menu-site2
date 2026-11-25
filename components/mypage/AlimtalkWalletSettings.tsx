"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Button } from "@/app/components/ui/button";
import { FieldMessage } from "@/app/components/ui/field-message";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/app/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/app/components/ui/table";
import InfoTooltip from "@/components/ui/InfoTooltip";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { ALIMTALK_TOPUP_AMOUNTS, ALIMTALK_ENTRY_LABELS, ALIMTALK_REFUND_LABELS, type AlimtalkWalletAction, type AlimtalkWalletInput, type AlimtalkWalletView } from "@/lib/alimtalk-wallet";
import { ALIMTALK_BILLING_TERMS_VERSION, ALIMTALK_BILLING_TERMS } from "@/lib/alimtalk-billing-policy";

const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
export default function AlimtalkWalletSettings({ initial, action, menuId,allowCheckout=true }: { initial: AlimtalkWalletView; action?: AlimtalkWalletAction; menuId: string;allowCheckout?:boolean }) {
  const [wallet, setWallet] = useState(initial), [busy, start] = useTransition();
  const [amount, setAmount] = useState<number>(10000), [error, setError] = useState<string>();
  const [notice, setNotice] = useState<{ text: string; event: number }>();
  const [checkoutOpen,setCheckoutOpen] = useState(false), [agreed,setAgreed] = useState(false);
  const [refundQuote,setRefundQuote] = useState<{id:string;amount:number}>();
  const activeRefund = wallet.refunds?.find(row=>["requested","processing","review"].includes(row.state));
  const returnedPayment = useRef(false), pendingCheckout = useRef(false);
  async function run(input: AlimtalkWalletInput) {
    if (!action) return;
    setError(undefined);
    const result = await action(input);
    if (result.error) { setError(result.error); return; }
    if (result.wallet) setWallet(result.wallet);
    if (input.intent==="topup" && result.wallet) {setCheckoutOpen(false);setAgreed(false);}
    if (result.notice) setNotice({ text: result.notice, event: Date.now() });
    if (input.intent==="refund-request" || input.intent==="refund-cancel") setRefundQuote(undefined);
    if (!result.checkout) return;
    setCheckoutOpen(false); setAgreed(false);
    const c = result.checkout;
    // Persist the intent before opening the external payment UI; interruptions
    // recover through the result button or the provider webhook.
    setWallet(current => ({ ...current, pendingTopups: [{ paymentId: c.paymentId, amount: c.amount, createdAt: new Date().toISOString() }, ...current.pendingTopups].slice(0, 5) }));
    const redirect = new URL(`/mypage/menus/${menuId}/orders/settings`, window.location.origin);
    redirect.searchParams.set("tab", "ready"); redirect.searchParams.set("alimtalkPaymentId", c.paymentId);
    const payment = await PortOne.requestPayment({
      storeId: c.storeId, channelKey: c.channelKey, paymentId: c.paymentId,
      orderName: `아티메뉴 알림톡 ${won(c.amount)} 충전`, totalAmount: c.amount,
      currency: "KRW", payMethod: "CARD", customer: { customerId: c.ownerId },
      customData: { purpose: "alimtalk_topup", owner_id: c.ownerId, menu_site_id: menuId },
      redirectUrl: redirect.toString(), noticeUrls: [new URL("/api/alimtalk/wallet/webhook", window.location.origin).toString()],
    } as unknown as Parameters<typeof PortOne.requestPayment>[0]);
    if (payment?.code) { setError(payment.message ?? "결제가 취소되었거나 실패했습니다."); return; }
    await run({ intent: "complete", paymentId: c.paymentId });
  }
  function perform(input: AlimtalkWalletInput) {
    if (busy || pendingCheckout.current || !action) return;
    pendingCheckout.current = true;
    start(async () => {
      try { await run(input); }
      catch { setError("처리를 마치지 못했습니다. 결제를 반복하지 말고 결제 결과를 확인해 주세요."); }
      finally { pendingCheckout.current = false; }
    });
  }
  useEffect(() => {
    if (returnedPayment.current || !action) return;
    const paymentId = new URL(window.location.href).searchParams.get("alimtalkPaymentId");
    if (!paymentId) return;
    returnedPayment.current = true;
    perform({ intent: "complete", paymentId });
  });
  return <ContentPanel aria-label="알림톡 잔액과 이용 내역">
    <ActionFeedbackToast message={notice?.text} eventKey={notice?.event} />
    <div className="site-content-heading-row">
      <div className="site-action-row" data-wrap="nowrap"><h3 className="type-content-title">알림톡 잔액</h3>
        <InfoTooltip label="알림톡 요금과 잔액 안내"><p>이 계정에서 관리하는 모든 메뉴판이 함께 사용하는 잔액입니다. 성공한 발송만 차감하며, 재발송도 성공하면 1건으로 계산합니다.</p><p>발송 결과 확인·환불 처리 중인 금액은 사용 가능 잔액에서 먼저 제외합니다. 발송 실패나 환불 신청 취소가 확인되면 다시 사용할 수 있습니다. 충전금은 별도 소멸 없이 유지됩니다.</p></InfoTooltip>
      </div>
      <Button type="button" variant="outline" size="compact" disabled={busy || !action} onClick={() => perform({ intent: "refresh" })}>새로고침</Button>
    </div>
    <dl className="site-field-grid" data-columns="4">
      <div className="site-stack-copy"><dt className="type-label site-copy-muted">사용 가능 잔액</dt><dd className="type-content-title">{won(wallet.balance - wallet.reserved)}</dd></div>
      <div className="site-stack-copy"><dt className="type-label site-copy-muted">보류 금액</dt><dd className="type-item-title">{won(wallet.reserved)}</dd></div>
      <div className="site-stack-copy"><dt className="type-label site-copy-muted">전체 잔액</dt><dd className="type-item-title">{won(wallet.balance)}</dd></div>
      <div className="site-stack-copy"><dt className="type-label site-copy-muted">성공 1건 · 부가세 포함</dt><dd className="type-item-title">{wallet.unitPrice === null ? "요금 설정 전" : won(wallet.unitPrice)}</dd></div>
    </dl>
    {wallet.frozen && <FieldMessage role="alert">취소된 충전 결제 확인이 필요해 잔액 사용을 중지했습니다. 고객지원에 문의해 주세요.</FieldMessage>}
    <div className="site-field-stack">
      {allowCheckout && <>
      <label htmlFor={`alimtalk-topup-${menuId}`} className="type-label">충전 금액</label>
      <div className="site-form-row" data-alignment="center">
        <select id={`alimtalk-topup-${menuId}`} className="site-field" value={amount} disabled={busy} onChange={event => setAmount(Number(event.target.value))}>
          {ALIMTALK_TOPUP_AMOUNTS.map(value => <option key={value} value={value}>{won(value)}</option>)}
        </select>
        <Button type="button" disabled={busy || !action || !wallet.checkoutEnabled} onClick={() => {setError(undefined);setAgreed(false);setCheckoutOpen(true);}}>충전하기</Button>
        {!wallet.checkoutEnabled && <InfoTooltip label="충전 준비 상태"><p>{wallet.message ?? "충전 결제와 요금 안내를 검수하고 있습니다. 실제 카드 결제는 아직 열리지 않았습니다."}</p></InfoTooltip>}
      </div>
      </>}
      <div className="site-action-row"><Button type="button" variant="outline" size="compact" disabled={busy || !action || wallet.frozen || wallet.reserved>0 || wallet.balance<=0 || Boolean(activeRefund)}
        onClick={()=>{setError(undefined);setRefundQuote({id:crypto.randomUUID(),amount:wallet.balance});}}>잔액 환불 신청</Button>
        <InfoTooltip label="충전금 환불 안내"><p>미사용 유상 잔액 전체를 수수료 없이 원래 결제수단으로 환불 신청할 수 있습니다. 결과 확인 중인 발송은 먼저 정산해야 하며, 진행 중인 환불 신청이나 결제 확인 문제가 있으면 새 신청을 받지 않습니다.</p></InfoTooltip>
        <a href="/policies/alimtalk" className="site-button site-button-link" target="_blank" rel="noopener noreferrer">충전·환불 안내<span className="sr-only"> (새 창)</span></a>
      </div>
    </div>
    {error && !checkoutOpen && !refundQuote && <FieldMessage role="alert">{error}</FieldMessage>}
    {(wallet.refunds?.length??0)>0 && <div className="site-stack-block site-content-divider">
      <h4 className="type-item-title">환불 신청 내역</h4>
      {wallet.refunds!.map(refund=><div key={refund.id} className="site-content-heading-row">
        <div className="site-stack-copy"><p className="type-body-sm">{ALIMTALK_REFUND_LABELS[refund.state]} · {won(refund.amount)}</p>
          <p className="type-caption site-copy-muted">{formatKoreanDateTime(refund.createdAt)}{refund.refundedAmount>0?` · 환불 확인 ${won(refund.refundedAmount)}`:""}</p></div>
        {refund.state==="requested" && <Button type="button" size="compact" variant="outline" disabled={busy || !action} onClick={()=>perform({intent:"refund-cancel",requestId:refund.id})}>신청 취소</Button>}
      </div>)}
    </div>}
    {wallet.pendingTopups.length > 0 && <div className="site-stack-block site-content-divider">
      <h4 className="type-item-title">결제 결과 확인</h4>
      {wallet.pendingTopups.map(topup => <div key={topup.paymentId} className="site-action-row" data-distribution="between">
        <p className="type-body-sm">{won(topup.amount)} <span className="type-caption site-copy-muted">{formatKoreanDateTime(topup.createdAt)}</span></p>
        <Button type="button" variant="outline" size="compact" disabled={busy || !action} onClick={() => perform({ intent: "complete", paymentId: topup.paymentId })}>결제 결과 확인</Button>
      </div>)}
    </div>}
    <div className="site-stack-block site-content-divider">
      <div className="site-content-heading-row"><h4 className="type-item-title">충전·이용 내역</h4><span className="type-caption site-copy-muted">최근 50건</span></div>
      {wallet.entries.length === 0 ? <p className="type-body-sm site-copy-muted">충전·이용 내역이 없습니다.</p> : <Table variant="management" label="알림톡 충전 및 이용 내역">
        <TableHeader><TableRow><TableHead>일시</TableHead><TableHead>매장 · 주문</TableHead><TableHead>구분</TableHead><TableHead align="end">금액</TableHead><TableHead align="end">사용 가능 잔액</TableHead></TableRow></TableHeader>
        <TableBody>{wallet.entries.map(entry => <TableRow key={entry.id}>
          <TableCell nowrap><span className="type-caption">{formatKoreanDateTime(entry.createdAt)}</span></TableCell>
          <TableCell>{entry.menuName}{entry.orderNumber !== null ? ` · #${entry.orderNumber}` : ""}</TableCell>
          <TableCell nowrap>{ALIMTALK_ENTRY_LABELS[entry.kind]}</TableCell>
          <TableCell nowrap align="end">{entry.kind === "topup" ? "+" : entry.kind === "charge" || entry.kind === "refund" ? "−" : ""}{won(entry.amount)}{entry.kind === "hold" || entry.kind === "refund_hold" ? " 보류" : entry.kind === "release" || entry.kind === "refund_release" ? " 반환" : ""}</TableCell>
          <TableCell nowrap align="end">{won(entry.balance - entry.reserved)}</TableCell>
        </TableRow>)}</TableBody>
      </Table>}
    </div>
    <Dialog open={checkoutOpen} onOpenChange={open=>{if(!busy)setCheckoutOpen(open);}}>
      <DialogContent scrollable><DialogHeader reserveCloseButton><DialogTitle>알림톡 충전 확인</DialogTitle>
        <DialogDescription>이 계정의 모든 메뉴판에서 함께 사용하는 잔액입니다.</DialogDescription></DialogHeader>
        <dl className="site-field-grid"><div className="site-stack-copy"><dt className="type-label">충전·결제 금액</dt><dd className="type-content-title">{won(amount)}</dd></div>
          <div className="site-stack-copy"><dt className="type-label">발송 성공 1건 · 부가세 포함</dt><dd className="type-item-title">{wallet.unitPrice===null?"요금 확인 필요":won(wallet.unitPrice)}</dd></div></dl>
        <div className="site-stack-copy">{ALIMTALK_BILLING_TERMS.slice(1).map(text=><p key={text} className="type-body-sm">{text}</p>)}</div>
        <label className="site-action-row type-label" data-wrap="nowrap"><Checkbox checked={agreed} disabled={busy} onCheckedChange={value=>setAgreed(value===true)} />요금과 충전·환불 조건을 확인했습니다.</label>
        {error && <FieldMessage role="alert">{error}</FieldMessage>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>setCheckoutOpen(false)}>취소</Button>
          <Button type="button" disabled={busy || !agreed || wallet.unitPrice===null || !wallet.checkoutEnabled} onClick={()=>perform({intent:"topup",amount,termsVersion:ALIMTALK_BILLING_TERMS_VERSION,unitPrice:wallet.unitPrice!})}>{won(amount)} 결제하기</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(refundQuote)} onOpenChange={open=>{if(!busy&&!open)setRefundQuote(undefined);}}>
      <DialogContent scrollable><DialogHeader reserveCloseButton><DialogTitle>미사용 잔액 환불 신청</DialogTitle>
        <DialogDescription>이 계정의 모든 메뉴판에서 함께 쓰는 미사용 잔액 전체를 환불 신청합니다.</DialogDescription></DialogHeader>
        <dl className="site-stack-block"><div className="site-content-heading-row"><dt className="type-label">신청 잔액</dt><dd className="type-item-title">{won(refundQuote?.amount??0)}</dd></div>
          <div className="site-content-heading-row"><dt className="type-label">환불 수수료</dt><dd className="type-body">0원</dd></div>
          <div className="site-content-heading-row"><dt className="type-label">환불 예정 금액</dt><dd className="type-content-title">{won(refundQuote?.amount??0)}</dd></div></dl>
        <p className="type-body-sm">신청 금액은 처리 중 사용할 수 없습니다. 원래 결제수단으로 환불하며, 관리자가 처리를 시작하기 전까지 신청을 취소할 수 있습니다.</p>
        {error && <FieldMessage role="alert">{error}</FieldMessage>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>setRefundQuote(undefined)}>돌아가기</Button>
          <Button type="button" disabled={busy || !refundQuote} onClick={()=>refundQuote&&perform({intent:"refund-request",requestId:refundQuote.id,amount:refundQuote.amount,termsVersion:ALIMTALK_BILLING_TERMS_VERSION})}>환불 신청</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </ContentPanel>;
}
