"use client";

import PortOne from "@portone/browser-sdk/v2";
import { useMemo, useState } from "react";

import { formatKrw, menuCreationProduct } from "@/lib/payments";
import type { TemplateKey } from "@/lib/templates";

type TemplateOption = {
  key: TemplateKey;
  name: string;
  description: string;
  badge: string;
  categoryLabels: readonly string[];
};

type PricingPaymentClientProps = {
  templates: TemplateOption[];
  userEmail: string | null;
  userId: string;
  storeId: string | null;
  channelKey: string | null;
};

type PaymentUiState =
  | { type: "idle"; message: string | null }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function createPaymentId() {
  const randomId = crypto.randomUUID().replaceAll("-", "").slice(0, 18);
  return `tablescene-${Date.now()}-${randomId}`;
}

function getStateClassName(type: PaymentUiState["type"]) {
  if (type === "success") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (type === "error") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  if (type === "loading") {
    return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }

  return "border-zinc-200 bg-white text-zinc-500";
}

export default function PricingPaymentClient({
  templates,
  userEmail,
  userId,
  storeId,
  channelKey,
}: PricingPaymentClientProps) {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey>(templates[0]?.key ?? "design_a");
  const [uiState, setUiState] = useState<PaymentUiState>({
    type: "idle",
    message: null,
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.key === selectedTemplateKey) ?? templates[0],
    [selectedTemplateKey, templates]
  );
  const isConfigReady = Boolean(storeId && channelKey);
  const isLoading = uiState.type === "loading";

  async function handlePayment() {
    if (!storeId || !channelKey) {
      setUiState({
        type: "error",
        message: "PortOne 공개 환경변수가 설정되어 있지 않습니다. NEXT_PUBLIC_PORTONE_STORE_ID와 NEXT_PUBLIC_PORTONE_CHANNEL_KEY를 확인해주세요.",
      });
      return;
    }

    const paymentId = createPaymentId();

    setUiState({
      type: "loading",
      message: "결제창을 준비하고 있습니다.",
    });

    try {
      const paymentRequest = {
        storeId,
        channelKey,
        paymentId,
        orderName: menuCreationProduct.name,
        totalAmount: menuCreationProduct.amount,
        currency: menuCreationProduct.currency,
        payMethod: "CARD",
        customer: {
          customerId: userId,
          email: userEmail ?? undefined,
        },
        customData: {
          product_key: menuCreationProduct.key,
          template_key: selectedTemplateKey,
        },
      } as unknown as Parameters<typeof PortOne.requestPayment>[0];

      const payment = await PortOne.requestPayment(paymentRequest);

      if (!payment) {
        setUiState({
          type: "error",
          message: "결제가 완료되지 않았습니다. 결제창이 닫혔거나 리디렉션 방식으로 진행 중일 수 있습니다.",
        });
        return;
      }

      if (payment.code) {
        setUiState({
          type: "error",
          message: payment.message ?? "결제가 취소되었거나 실패했습니다.",
        });
        return;
      }

      setUiState({
        type: "loading",
        message: "결제 결과를 서버에서 검증하고 있습니다.",
      });

      const completeResponse = await fetch("/api/payment/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: payment.paymentId,
          template_key: selectedTemplateKey,
        }),
      });
      const completeResult = (await completeResponse.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!completeResponse.ok || !completeResult.ok) {
        setUiState({
          type: "error",
          message: completeResult.message ?? "결제 검증 또는 저장에 실패했습니다.",
        });
        return;
      }

      setUiState({
        type: "success",
        message: completeResult.message ?? "결제 기록이 저장되었습니다.",
      });
    } catch (error) {
      setUiState({
        type: "error",
        message: error instanceof Error ? error.message : "결제 처리 중 알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl bg-white p-7 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Templates</p>
        <h2 className="text-2xl font-bold tracking-tight">템플릿 선택</h2>
        <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
          결제 요청 시 선택한 템플릿 값이 함께 저장됩니다. 실제 메뉴판 자동 생성은 다음 단계에서 연결합니다.
        </p>

        <div className="mt-6 grid gap-3">
          {templates.map((template) => {
            const isSelected = selectedTemplateKey === template.key;

            return (
              <button
                key={template.key}
                type="button"
                onClick={() => setSelectedTemplateKey(template.key)}
                className={`rounded-2xl border p-5 text-left transition-colors ${
                  isSelected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                }`}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold">{template.name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isSelected ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600"}`}>
                        {template.badge}
                      </span>
                    </div>
                    <p className={`font-mono text-xs font-bold ${isSelected ? "text-white/60" : "text-zinc-400"}`}>{template.key}</p>
                    <p className={`mt-3 break-keep text-sm font-medium leading-relaxed ${isSelected ? "text-white/70" : "text-zinc-500"}`}>
                      {template.description}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${isSelected ? "bg-[#F8E731] text-zinc-950" : "bg-zinc-100 text-zinc-500"}`}>
                    {isSelected ? "선택됨" : "선택"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.categoryLabels.map((label) => (
                    <span
                      key={label}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isSelected ? "bg-white/10 text-white/70" : "bg-zinc-50 text-zinc-400"}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-3xl bg-white p-7 shadow-sm lg:sticky lg:top-8 lg:self-start">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Payment</p>
        <h2 className="text-2xl font-bold tracking-tight">{menuCreationProduct.name}</h2>
        <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">{menuCreationProduct.description}</p>

        <dl className="mt-6 space-y-4 text-sm font-medium">
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
            <dt className="text-zinc-400">선택 템플릿</dt>
            <dd className="font-bold text-zinc-950">{selectedTemplate?.name}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
            <dt className="text-zinc-400">template_key</dt>
            <dd className="font-mono text-xs font-bold text-zinc-700">{selectedTemplateKey}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
            <dt className="text-zinc-400">결제 금액</dt>
            <dd className="text-xl font-black text-zinc-950">{formatKrw(menuCreationProduct.amount)}</dd>
          </div>
        </dl>

        {!isConfigReady && (
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
            PortOne 공개 환경변수를 먼저 설정해야 결제창을 열 수 있습니다.
          </div>
        )}

        {uiState.message && (
          <div className={`mt-6 rounded-2xl border p-4 text-sm font-bold leading-relaxed ${getStateClassName(uiState.type)}`}>{uiState.message}</div>
        )}

        <button
          type="button"
          onClick={handlePayment}
          disabled={isLoading || !isConfigReady}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isLoading ? "처리 중..." : "결제하기"}
        </button>
      </aside>
    </div>
  );
}
