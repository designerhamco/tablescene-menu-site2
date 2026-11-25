"use client";
import { useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import AlimtalkWalletSettings from "@/components/mypage/AlimtalkWalletSettings";
import type { AlimtalkWalletAction, AlimtalkWalletEntry, AlimtalkWalletView } from "@/lib/alimtalk-wallet";

const empty = (): AlimtalkWalletView => ({ balance: 0, reserved: 0, frozen: false, unitPrice: 12, checkoutEnabled: true, entries: [], pendingTopups: [] });
export default function WalletDemo() {
  const wallet = useRef(empty()), [revision, setRevision] = useState(0), [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(empty);
  const hold = useRef(false);
  function entry(kind: AlimtalkWalletEntry["kind"], amount: number) {
    wallet.current.entries.unshift({ id: crypto.randomUUID(), kind, amount, balance: wallet.current.balance, reserved: wallet.current.reserved,
      createdAt: new Date().toISOString(), menuName: "샘플 매장", orderNumber: kind === "topup" ? null : 101 });
  }
  const action: AlimtalkWalletAction = async input => {
    if (input.intent === "topup") { wallet.current.balance += input.amount; entry("topup", input.amount); }
    return { wallet: structuredClone(wallet.current), notice: input.intent === "topup" ? "체험용 잔액을 충전했습니다. 실제 결제는 없습니다." : undefined };
  };
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
      <Button variant="outline" onClick={() => { wallet.current = empty(); hold.current = false; setError(""); setSnapshot(empty()); setRevision(n => n + 1); }}>체험 초기화</Button>
    </div>
    {error && <p role="alert" className="type-body-sm">{error}</p>}
    <AlimtalkWalletSettings key={revision} initial={snapshot} action={action} menuId="local-wallet" />
  </div>;
}
