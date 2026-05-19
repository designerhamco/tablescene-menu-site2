"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import { useState } from "react";

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
  const timestamp = Date.now().toString(36);
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "").slice(0, 18)
    : Math.random().toString(36).slice(2, 20);
  return `ai-${timestamp}-${random}`;
}

function getPaymentErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("cancel") || message.includes("취소")) {
    return "결제가 취소되었습니다.";
  }

  if (lowerMessage.includes("complete") || lowerMessage.includes("verify") || message.includes("검증") || message.includes("충전 처리")) {
    return "AI 크레딧 충전에 실패했습니다. 결제 상태를 확인해주세요.";
  }

  return message || "AI 크레딧 결제창을 열지 못했습니다.";
}

export default function AiCreditPurchaseModal({
  open,
  onClose,
  menuSiteId,
  userId,
  userEmail,
  storeId,
  channelKey,
  pendingProductKey,
  setPendingProductKey,
  onPurchased,
  onError,
}: AiCreditPurchaseModalProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [refundPolicyAgreed, setRefundPolicyAgreed] = useState(false);

  if (!open) return null;

  const isPortOneReady = Boolean(storeId && channelKey);

  function closeModal() {
    setRefundPolicyAgreed(false);
    setLocalError(null);
    onClose();
  }

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
    closeModal();
  }

  async function startPurchase(productKey: AiCreditPackKey) {
    if (!refundPolicyAgreed) {
      const message = "AI 크레딧 충전 후 취소/환불 제한 정책에 동의해주세요.";
      setLocalError(message);
      onError(message);
      return;
    }

    const product = AI_CREDIT_PACKS[productKey];
    setPendingProductKey(productKey);
    setLocalError(null);
    onError("");

    try {
      if (!isPortOneReady || !storeId || !channelKey) {
        console.debug("[ai-credit-payment] missing public payment config", {
          hasStoreId: Boolean(storeId),
          hasChannelKey: Boolean(channelKey),
          productKey,
          amount: product.amount,
        });
        throw new Error("결제 설정을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.");
      }

      const paymentId = createPaymentId();
      console.debug("[ai-credit-payment] request payment", {
        hasStoreId: Boolean(storeId),
        hasChannelKey: Boolean(channelKey),
        productKey,
        amount: product.amount,
      });
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
          productKey: product.productKey,
          credits: product.credits,
          payment_type: product.paymentType,
          menu_site_id: menuSiteId,
        },
      } as unknown as Parameters<typeof PortOne.requestPayment>[0]);

      if (!payment) {
        throw new Error("AI 크레딧 결제창을 열지 못했습니다.");
      }

      if (payment.code) {
        throw new Error(payment.message ?? "결제가 취소되었거나 실패했습니다.");
      }

      await completePurchase(payment.paymentId, productKey);
    } catch (error) {
      const message = getPaymentErrorMessage(error);
      setLocalError(message);
      onError(message);
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
              충전한 AI 크레딧은 내 계정의 모든 메뉴판에서 사용할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
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
                disabled={Boolean(pendingProductKey) || !refundPolicyAgreed}
                onClick={() => startPurchase(product.productKey)}
                className="rounded-2xl border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="block text-base font-black text-zinc-950">{product.name}</span>
                <span className="mt-3 block text-2xl font-black text-zinc-950">{product.amount.toLocaleString("ko-KR")}원</span>
                <span className="mt-4 inline-flex rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {isPending ? "결제 진행 중" : refundPolicyAgreed ? "선택하기" : "동의 후 선택"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="break-keep text-sm font-bold leading-relaxed text-amber-800">
            AI 크레딧은 결제 완료 즉시 계정에 지급되는 디지털 소모성 상품입니다. 크레딧 지급 후에는 단순 변심에 따른 취소/환불이 불가합니다. 중복 결제 또는 크레딧 미지급이 발생한 경우 고객지원으로 문의해주세요.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-white/70 p-3 text-sm font-black text-amber-950">
            <input
              type="checkbox"
              checked={refundPolicyAgreed}
              disabled={Boolean(pendingProductKey)}
              onChange={(event) => setRefundPolicyAgreed(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-zinc-950"
            />
            <span>[필수] AI 크레딧 충전 후 취소/환불 제한 정책에 동의합니다.</span>
          </label>
        </div>

        {localError ? (
          <p className="mt-5 break-keep rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-700">
            {localError}
          </p>
        ) : null}

        <p className="mt-5 break-keep rounded-2xl bg-zinc-50 p-4 text-xs font-bold leading-relaxed text-zinc-500">
          AI 설명 작성 1크레딧 · 부분 자동 번역 1크레딧 · AI 메뉴 정리 3크레딧 · 전체 자동 번역 5크레딧. 충전한 AI 크레딧은 내 계정의 모든 메뉴판에서 사용할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
