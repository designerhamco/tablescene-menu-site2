"use client";

import { useState } from "react";

export type PaymentDetailModalProps = {
  productName: string;
  statusLabel: string;
  statusTone?: "success" | "warning" | "danger" | "neutral";
  paidAtLabel: string;
  amountLabel: string;
  pgLabel: string;
  paymentIdLabel: string;
  receiptUrl?: string | null;
  menuName?: string | null;
  isAiCreditPurchase?: boolean;
};

const AI_CREDIT_REFUND_NOTICE =
  "이 결제는 AI 크레딧 충전 상품입니다. 충전된 크레딧은 계정의 모든 메뉴판에서 사용할 수 있으며, 지급 후 단순 변심에 따른 취소/환불이 불가합니다. 중복 결제 또는 크레딧 미지급이 발생한 경우 고객지원으로 문의해주세요.";

function getStatusClassName(tone: PaymentDetailModalProps["statusTone"]) {
  if (tone === "success") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (tone === "danger") return "bg-red-50 text-red-700 ring-red-100";
  if (tone === "warning") return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-zinc-100 text-zinc-600 ring-zinc-200";
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{label}</dt>
      <dd className="mt-2 break-keep text-sm font-bold text-zinc-900">{value || "-"}</dd>
    </div>
  );
}

export default function PaymentDetailModal({
  productName,
  statusLabel,
  statusTone = "neutral",
  paidAtLabel,
  amountLabel,
  pgLabel,
  paymentIdLabel,
  receiptUrl,
  menuName,
  isAiCreditPurchase = false,
}: PaymentDetailModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        결제 상세
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-detail-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Payment</p>
                <h2 id="payment-detail-title" className="mt-2 text-2xl font-black tracking-tight text-zinc-950">
                  결제 상세
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-black text-zinc-600 transition-colors hover:bg-zinc-100"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getStatusClassName(statusTone)}`}>
                {statusLabel}
              </span>
              {isAiCreditPurchase ? (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600 ring-1 ring-zinc-200">
                  계정 공용 AI 크레딧
                </span>
              ) : null}
            </div>

            <dl className="mt-5 grid gap-3 md:grid-cols-2">
              <DetailItem label="상품명" value={productName} />
              <DetailItem label="결제 상태" value={statusLabel} />
              <DetailItem label="결제일" value={paidAtLabel} />
              <DetailItem label="금액" value={amountLabel} />
              <DetailItem label="결제수단 / PG" value={pgLabel} />
              <DetailItem label="고객사 거래번호" value={paymentIdLabel} />
              {menuName ? <DetailItem label="연결 메뉴판" value={menuName} /> : null}
            </dl>

            {isAiCreditPurchase ? (
              <div className="mt-5 break-keep rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
                {AI_CREDIT_REFUND_NOTICE}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              {receiptUrl ? (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-zinc-800"
                >
                  영수증 보기
                </a>
              ) : (
                <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 px-4 py-2.5 text-xs font-black text-zinc-400">
                  영수증 준비 중
                </span>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
