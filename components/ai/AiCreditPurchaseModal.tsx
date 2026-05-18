"use client";

import * as PortOne from "@portone/browser-sdk/v2";

import { AI_CREDIT_PACKS, type AiCreditBalance, type AiCreditPackKey } from "@/lib/ai-credits";

type AiCreditPurchaseModalProps = {
  open: boolean;
  onClose: () => void;
  menuSiteId: string;
  menuName: string;
  userId: string;
  userEmail?: string | null;
  storeId?: string;
  channelKey?: string;
  pendingProductKey: AiCreditPackKey | null;
  setPendingProductKey: (productKey: AiCreditPackKey | null) => void;
  onPurchased: (balance: AiCreditBalance, message: string) => void;
  onError: (message: string) => void;
};

type CompleteResponse = {
  ok?: boolean;
  message?: string;
  balance?: AiCreditBalance;
};

function createPaymentId() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `ai_credit_${Date.now()}_${random}`;
}

export default function AiCreditPurchaseModal({
  open,
  onClose,
  menuSiteId,
  menuName,
  userId,
  userEmail,
  storeId,
  channelKey,
  pendingProductKey,
  setPendingProductKey,
  onPurchased,
  onError,
}: AiCreditPurchaseModalProps) {
  if (!open) return null;

  const isPortOneReady = Boolean(storeId && channelKey);

  async function completePurchase(paymentId: string, productKey: AiCreditPackKey) {
    const response = await fetch("/api/ai-credits/purchase/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId,
        productKey,
        menuSiteId,
      }),
    });
    const result = (await response.json()) as CompleteResponse;

    if (!response.ok || !result.ok || !result.balance) {
      throw new Error(result.message ?? "AI 크레딧 충전 처리에 실패했습니다.");
    }

    onPurchased(result.balance, result.message ?? "AI 크레딧 충전이 완료되었습니다.");
    onClose();
  }

  async function startPurchase(productKey: AiCreditPackKey) {
    const product = AI_CREDIT_PACKS[productKey];
    setPendingProductKey(productKey);
    onError("");

    try {
      if (!isPortOneReady || !storeId || !channelKey) {
        throw new Error("AI 크레딧 결제용 PortOne 일반 결제 채널 환경변수를 확인해주세요.");
      }

      const paymentId = createPaymentId();
      const payment = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName: product.name,
        totalAmount: product.amount,
        currency: product.currency,
        payMethod: "CARD",
        customer: {
          customerId: userId,
          email: userEmail ?? undefined,
        },
        customData: {
          purpose: "ai_credit_purchase",
          product_key: product.productKey,
          payment_type: product.paymentType,
          menu_site_id: menuSiteId,
        },
      } as unknown as Parameters<typeof PortOne.requestPayment>[0]);

      if (!payment) {
        throw new Error("결제가 완료되지 않았습니다. 결제창이 닫혔거나 리디렉션 방식으로 진행 중일 수 있습니다.");
      }

      if (payment.code) {
        throw new Error(payment.message ?? "결제가 취소되었거나 실패했습니다.");
      }

      await completePurchase(payment.paymentId, productKey);
    } catch (error) {
      onError(error instanceof Error ? error.message : "AI 크레딧 충전 중 오류가 발생했습니다.");
    } finally {
      setPendingProductKey(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-credit-modal-title"
        className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">AI 크레딧 충전</p>
            <h2 id="ai-credit-modal-title" className="mt-2 text-2xl font-black tracking-tight text-zinc-950">
              계정에 충전할 크레딧을 선택하세요
            </h2>
            <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
              충전한 AI 크레딧은 내 계정의 모든 메뉴판에서 사용할 수 있습니다. 현재 위치는 {menuName}이며, 결제는 일반 결제창의 one_time 단건 결제로 처리됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(pendingProductKey)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-lg font-black text-zinc-500 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="AI 크레딧 충전 닫기"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {Object.values(AI_CREDIT_PACKS).map((product) => {
            const isPending = pendingProductKey === product.productKey;

            return (
              <button
                key={product.productKey}
                type="button"
                disabled={Boolean(pendingProductKey)}
                onClick={() => startPurchase(product.productKey)}
                className="rounded-2xl border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="block text-base font-black text-zinc-950">{product.name}</span>
                <span className="mt-3 block text-2xl font-black text-zinc-950">{product.amount.toLocaleString("ko-KR")}원</span>
                <span className="mt-4 inline-flex rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {isPending ? "결제 진행 중" : "선택하기"}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-5 break-keep rounded-2xl bg-zinc-50 p-4 text-xs font-bold leading-relaxed text-zinc-500">
          AI 설명 작성 1크레딧 · 부분 자동 번역 1크레딧 · AI 메뉴 정리 3크레딧 · 전체 자동 번역 5크레딧. 충전한 AI 크레딧은 내 계정의 모든 메뉴판에서 사용할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
