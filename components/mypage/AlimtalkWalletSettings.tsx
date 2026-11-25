"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Button } from "@/app/components/ui/button";
import { FieldMessage } from "@/app/components/ui/field-message";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/app/components/ui/table";
import InfoTooltip from "@/components/ui/InfoTooltip";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { ALIMTALK_TOPUP_AMOUNTS, ALIMTALK_ENTRY_LABELS, type AlimtalkWalletAction, type AlimtalkWalletInput, type AlimtalkWalletView } from "@/lib/alimtalk-wallet";

const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
export default function AlimtalkWalletSettings({ initial, action, menuId }: { initial: AlimtalkWalletView; action?: AlimtalkWalletAction; menuId: string }) {
  const [wallet, setWallet] = useState(initial), [busy, start] = useTransition();
  const [amount, setAmount] = useState<number>(10000), [error, setError] = useState<string>();
  const [notice, setNotice] = useState<{ text: string; event: number }>();
  const returnedPayment = useRef(false), pendingCheckout = useRef(false);
  async function run(input: AlimtalkWalletInput) {
    if (!action) return;
    setError(undefined);
    const result = await action(input);
    if (result.error) { setError(result.error); return; }
    if (result.wallet) setWallet(result.wallet);
    if (result.notice) setNotice({ text: result.notice, event: Date.now() });
    if (!result.checkout) return;
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
        <InfoTooltip label="알림톡 요금과 잔액 안내"><p>같은 사장님 계정의 매장들이 함께 사용하는 잔액입니다. 성공한 발송만 차감하며, 재발송도 성공하면 1건으로 계산합니다.</p><p>결과를 확인 중인 금액은 사용 가능 잔액에서 먼저 제외합니다. 발송 실패가 확인되면 다시 사용할 수 있습니다. 충전금은 월별로 초기화되지 않습니다.</p></InfoTooltip>
      </div>
      <Button type="button" variant="outline" size="compact" disabled={busy || !action} onClick={() => perform({ intent: "refresh" })}>새로고침</Button>
    </div>
    <dl className="site-field-grid" data-columns="4">
      <div className="site-stack-copy"><dt className="type-label site-copy-muted">사용 가능 잔액</dt><dd className="type-content-title">{won(wallet.balance - wallet.reserved)}</dd></div>
      <div className="site-stack-copy"><dt className="type-label site-copy-muted">확인 중인 금액</dt><dd className="type-item-title">{won(wallet.reserved)}</dd></div>
      <div className="site-stack-copy"><dt className="type-label site-copy-muted">전체 잔액</dt><dd className="type-item-title">{won(wallet.balance)}</dd></div>
      <div className="site-stack-copy"><dt className="type-label site-copy-muted">성공 1건 · 부가세 포함</dt><dd className="type-item-title">{wallet.unitPrice === null ? "요금 설정 전" : won(wallet.unitPrice)}</dd></div>
    </dl>
    {wallet.frozen && <FieldMessage role="alert">취소된 충전 결제 확인이 필요해 잔액 사용을 중지했습니다. 고객지원에 문의해 주세요.</FieldMessage>}
    <div className="site-field-stack">
      <label htmlFor={`alimtalk-topup-${menuId}`} className="type-label">충전 금액</label>
      <div className="site-form-row" data-alignment="center">
        <select id={`alimtalk-topup-${menuId}`} className="site-field" value={amount} disabled={busy} onChange={event => setAmount(Number(event.target.value))}>
          {ALIMTALK_TOPUP_AMOUNTS.map(value => <option key={value} value={value}>{won(value)}</option>)}
        </select>
        <Button type="button" disabled={busy || !action || !wallet.checkoutEnabled} onClick={() => perform({ intent: "topup", amount })}>충전하기</Button>
        {!wallet.checkoutEnabled && <InfoTooltip label="충전 준비 상태"><p>{wallet.message ?? "충전 결제와 요금 안내를 검수하고 있습니다. 실제 카드 결제는 아직 열리지 않았습니다."}</p></InfoTooltip>}
      </div>
    </div>
    {error && <FieldMessage role="alert">{error}</FieldMessage>}
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
          <TableCell nowrap align="end">{entry.kind === "topup" ? "+" : entry.kind === "charge" ? "−" : ""}{won(entry.amount)}{entry.kind === "hold" ? " 확보" : entry.kind === "release" ? " 반환" : ""}</TableCell>
          <TableCell nowrap align="end">{won(entry.balance - entry.reserved)}</TableCell>
        </TableRow>)}</TableBody>
      </Table>}
    </div>
  </ContentPanel>;
}
