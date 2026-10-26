"use client";

import { useState } from "react";
import { Badge } from "@/app/components/ui/badge";

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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</dt>
      <dd className="mt-2 break-keep text-sm font-bold text-zinc-900">{value || "-"}</dd>
    </div>
  );
}

export default function PaymentDetailModal({
  productName,
  statusLabel,
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
        className="site-button site-button-rounded site-button-outline inline-flex items-center justify-center"
      >
        결제 상세
      </button>

      {isOpen ? (
        <div className="site-dialog-overlay fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-detail-title"
            className="site-dialog site-dialog-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="payment-detail-title" className="type-subsection-title text-zinc-950">
                  결제 상세
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="site-button site-button-rounded site-button-outline"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge>
                {statusLabel}
              </Badge>
              {isAiCreditPurchase ? (
                <Badge>
                  계정 공용 AI 크레딧
                </Badge>
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
              <div className="site-notice site-notice-warning mt-5 break-keep p-4 text-sm font-bold leading-relaxed">
                {AI_CREDIT_REFUND_NOTICE}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              {receiptUrl ? (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-button site-button-rounded site-button-outline inline-flex items-center justify-center"
                >
                  영수증 보기
                </a>
              ) : (
                <Badge>
                  영수증 준비 중
                </Badge>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
