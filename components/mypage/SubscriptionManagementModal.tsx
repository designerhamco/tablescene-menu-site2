"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export type SubscriptionManagementModalProps = {
  subscriptionId: string;
  productName: string;
  menuName: string;
  menuStatus: string;
  amountLabel: string;
  billingCycleLabel: string;
  nextBillingLabel: string;
  periodEndLabel: string;
  status: string;
  statusLabel: string;
  cancelAtPeriodEnd: boolean;
  cancelRequestedLabel: string;
  pgLabel: string;
  serviceEntitlementLabel: string;
  canManage: boolean;
  defaultOpen?: boolean;
  billingMethod?: "monthly" | "yearly" | "unknown";
  refundConfirmEnabled?: boolean;
};

type ApiResult = {
  ok?: boolean;
  message?: string;
  status?: string;
  finalRefundAmount?: number | null;
  refundRequestId?: string;
};

type RefundQuote = {
  paidAmount: number;
  annualPrice: number;
  monthlyListPrice: number;
  billingStartedAt: string;
  nextBillingAt: string;
  refundBasisDate: string;
  usedDays: number;
  totalDays: number;
  remainingDays: number;
  monthlyBasisUsedAmount: number;
  annualBasisUsedAmount: number;
  discountClawbackAmount: number;
  estimatedRefundAmount: number;
  canAutoRefundLater: boolean;
  reasonIfNotRefundable: string | null;
  customerNotice: string;
};

type RefundQuoteState =
  | { status: "idle"; quote: null; message: null }
  | { status: "loading"; quote: null; message: null }
  | { status: "success"; quote: RefundQuote; message: null }
  | { status: "error"; quote: null; message: string };

type RefundConfirmState =
  | { status: "idle"; message: null; finalRefundAmount: null }
  | { status: "processing"; message: null; finalRefundAmount: null }
  | { status: "completed"; message: string; finalRefundAmount: number | null }
  | { status: "needs_review"; message: string; finalRefundAmount: number | null }
  | { status: "error"; message: string; finalRefundAmount: null };

const initialRefundQuoteState: RefundQuoteState = { status: "idle", quote: null, message: null };
const initialRefundConfirmState: RefundConfirmState = { status: "idle", message: null, finalRefundAmount: null };

async function parseApiResult(response: Response) {
  const result = (await response.json().catch(() => ({}))) as ApiResult;

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "요청 처리에 실패했습니다.");
  }

  return result;
}

function formatKrwLabel(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function SubscriptionManagementModal({
  subscriptionId,
  productName,
  menuName,
  menuStatus,
  amountLabel,
  billingCycleLabel,
  nextBillingLabel,
  periodEndLabel,
  status,
  statusLabel,
  cancelAtPeriodEnd,
  cancelRequestedLabel,
  pgLabel,
  serviceEntitlementLabel,
  canManage,
  defaultOpen = false,
  billingMethod = "unknown",
  refundConfirmEnabled = false,
}: SubscriptionManagementModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isViewingRefundGuide, setIsViewingRefundGuide] = useState(false);
  const [refundQuoteState, setRefundQuoteState] = useState<RefundQuoteState>(initialRefundQuoteState);
  const [refundConfirmState, setRefundConfirmState] = useState<RefundConfirmState>(initialRefundConfirmState);
  const [refundReason, setRefundReason] = useState("");
  const isYearlyBilling = billingMethod === "yearly";

  function closeModal() {
    setIsOpen(false);
    setIsViewingRefundGuide(false);
    setRefundQuoteState(initialRefundQuoteState);
    setRefundConfirmState(initialRefundConfirmState);
    setRefundReason("");
    if (defaultOpen) {
      router.replace("/mypage?tab=payments&billingTab=active", { scroll: false });
    }
  }

  async function loadRefundQuote() {
    setRefundQuoteState({ status: "loading", quote: null, message: null });
    setRefundConfirmState(initialRefundConfirmState);

    try {
      const response = await fetch("/api/business-subscriptions/refund/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const result = (await response.json().catch(() => ({}))) as ApiResult & { quote?: RefundQuote };

      if (!response.ok || !result.ok || !result.quote) {
        throw new Error(result.message || "예상 환불금액을 계산하지 못했습니다.");
      }

      setRefundQuoteState({ status: "success", quote: result.quote, message: null });
    } catch (quoteError) {
      setRefundQuoteState({
        status: "error",
        quote: null,
        message: quoteError instanceof Error ? quoteError.message : "예상 환불금액을 계산하지 못했습니다.",
      });
    }
  }

  async function submitCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/business-subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      await parseApiResult(response);
      setIsConfirmingCancel(false);
      closeModal();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "구독 해지 예약에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resumeCancellation() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/business-subscriptions/${encodeURIComponent(subscriptionId)}/resume`, {
        method: "POST",
      });
      await parseApiResult(response);
      closeModal();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "해지 예약 취소에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRefundConfirm() {
    if (refundQuoteState.status !== "success" || !refundQuoteState.quote.canAutoRefundLater) return;
    if (!refundConfirmEnabled) {
      setRefundConfirmState({
        status: "error",
        message: "연결제 자동 환불 기능은 현재 QA 준비 중입니다.",
        finalRefundAmount: null,
      });
      return;
    }

    const ok = window.confirm(
      `예상 환불금액 ${formatKrwLabel(refundQuoteState.quote.estimatedRefundAmount)}으로 환불을 진행합니다.\n\n환불이 완료되면 메뉴판은 보관 상태로 전환되고, 실제 카드 취소 반영은 결제수단에 따라 영업일 기준 3~7일이 걸릴 수 있습니다.`
    );

    if (!ok) return;

    setRefundConfirmState({ status: "processing", message: null, finalRefundAmount: null });
    setError(null);

    try {
      const response = await fetch("/api/business-subscriptions/refund/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId,
          customerReason: refundReason,
          acceptedRefundQuote: true,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as ApiResult;

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "환불 처리에 실패했습니다.");
      }

      if (result.status === "completed") {
        setRefundConfirmState({
          status: "completed",
          message: result.message || "환불 처리가 접수되었습니다.",
          finalRefundAmount: typeof result.finalRefundAmount === "number" ? result.finalRefundAmount : refundQuoteState.quote.estimatedRefundAmount,
        });
        router.refresh();
        return;
      }

      setRefundConfirmState({
        status: "needs_review",
        message: result.message || "자동 환불 처리 확인이 필요합니다.",
        finalRefundAmount: typeof result.finalRefundAmount === "number" ? result.finalRefundAmount : null,
      });
      router.refresh();
    } catch (confirmError) {
      setRefundConfirmState({
        status: "error",
        message: confirmError instanceof Error ? confirmError.message : "환불 처리에 실패했습니다.",
        finalRefundAmount: null,
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsViewingRefundGuide(false);
          setRefundQuoteState(initialRefundQuoteState);
          setRefundConfirmState(initialRefundConfirmState);
          setRefundReason("");
          setIsOpen(true);
        }}
        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        구독 관리
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-950">구독 관리</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-black text-zinc-600">
                닫기
              </button>
            </div>

            {isViewingRefundGuide ? (
              <div className="mt-5">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-900">
                  <h3 className="text-lg font-black text-amber-950">중도해지/환불 요청 안내</h3>
                  <p className="mt-3">
                    연결제는 매년 자동결제되는 연 정기결제 상품입니다. 중도해지/환불을 요청하면 환불금액은 요청일을 기준으로 산정됩니다.
                  </p>
                  <p className="mt-3">
                    사용한 기간은 월결제 기준 금액으로 재정산되며, 이미 적용받은 연간 할인 혜택 중 사용 기간에 해당하는 금액이 환불금에서 공제될 수 있습니다.
                  </p>
                  <p className="mt-3">
                    환불 요청 후 처리 전까지는 요청을 취소할 수 있으며, 환불 처리가 시작되면 고객지원 확인이 필요합니다.
                  </p>
                  <p className="mt-3">
                    다음 단계에서는 고객 최종 확인 후 자동 환불 처리를 목표로 합니다. 카드사 또는 결제수단에 따라 실제 취소 반영까지 영업일 기준 3~7일이 걸릴 수 있습니다.
                    환불 완료 후 메뉴판은 비공개 또는 보관 상태로 전환되며, 보관 기간 내 재결제하면 기존 메뉴판을 복구할 수 있습니다.
                  </p>
                </div>

                {refundQuoteState.status === "loading" ? (
                  <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-600">
                    예상 환불금액을 계산하고 있습니다.
                  </div>
                ) : null}

                {refundQuoteState.status === "error" ? (
                  <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-700">
                    <h4 className="text-base font-black text-red-800">자동 계산이 어렵습니다</h4>
                    <p className="mt-2">{refundQuoteState.message}</p>
                    <p className="mt-2 text-red-600">
                      실제 환불은 실행되지 않았습니다. 결제번호와 메뉴판명을 고객지원 채널로 알려주시면 확인을 도와드릴 수 있습니다.
                    </p>
                  </div>
                ) : null}

                {refundQuoteState.status === "success" ? (
                  <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h4 className="text-base font-black text-zinc-950">예상 환불금액</h4>
                        <p className="mt-1 text-sm font-bold leading-relaxed text-zinc-500">{refundQuoteState.quote.customerNotice}</p>
                      </div>
                      <p className="text-2xl font-black text-zinc-950">
                        {formatKrwLabel(refundQuoteState.quote.estimatedRefundAmount)}
                      </p>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <dt className="text-xs font-black text-zinc-400">결제금액</dt>
                        <dd className="mt-1 font-bold text-zinc-900">{formatKrwLabel(refundQuoteState.quote.paidAmount)}</dd>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <dt className="text-xs font-black text-zinc-400">월결제 기준 금액</dt>
                        <dd className="mt-1 font-bold text-zinc-900">{formatKrwLabel(refundQuoteState.quote.monthlyListPrice)} / 월</dd>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <dt className="text-xs font-black text-zinc-400">결제일</dt>
                        <dd className="mt-1 font-bold text-zinc-900">{formatDateLabel(refundQuoteState.quote.billingStartedAt)}</dd>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <dt className="text-xs font-black text-zinc-400">다음 결제 예정일</dt>
                        <dd className="mt-1 font-bold text-zinc-900">{formatDateLabel(refundQuoteState.quote.nextBillingAt)}</dd>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <dt className="text-xs font-black text-zinc-400">사용일수 / 전체 이용일수</dt>
                        <dd className="mt-1 font-bold text-zinc-900">
                          {refundQuoteState.quote.usedDays}일 / {refundQuoteState.quote.totalDays}일
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <dt className="text-xs font-black text-zinc-400">남은 일수</dt>
                        <dd className="mt-1 font-bold text-zinc-900">{refundQuoteState.quote.remainingDays}일</dd>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <dt className="text-xs font-black text-zinc-400">월결제 기준 사용료</dt>
                        <dd className="mt-1 font-bold text-zinc-900">{formatKrwLabel(refundQuoteState.quote.monthlyBasisUsedAmount)}</dd>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <dt className="text-xs font-black text-zinc-400">연간 할인 혜택 재정산</dt>
                        <dd className="mt-1 font-bold text-zinc-900">{formatKrwLabel(refundQuoteState.quote.discountClawbackAmount)}</dd>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4 md:col-span-2">
                        <dt className="text-xs font-black text-zinc-400">환불 기준일</dt>
                        <dd className="mt-1 font-bold text-zinc-900">{formatDateLabel(refundQuoteState.quote.refundBasisDate)}</dd>
                      </div>
                    </dl>

                    {refundQuoteState.quote.reasonIfNotRefundable ? (
                      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
                        {refundQuoteState.quote.reasonIfNotRefundable}
                      </p>
                    ) : null}

                    {!refundConfirmEnabled ? (
                      <p className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm font-bold text-zinc-500">
                        연결제 자동 환불 기능은 현재 QA 준비 중입니다. 예상 환불금액만 확인할 수 있습니다.
                      </p>
                    ) : null}

                    <label className="mt-4 block">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">요청 사유</span>
                      <textarea
                        value={refundReason}
                        onChange={(event) => setRefundReason(event.target.value)}
                        maxLength={500}
                        placeholder="중도해지/환불 사유를 남겨주세요. 선택 사항입니다."
                        className="mt-2 min-h-24 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-900 outline-none focus:border-zinc-950"
                      />
                    </label>
                  </div>
                ) : null}

                {refundConfirmState.status === "processing" ? (
                  <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-600">
                    환불 처리를 진행하고 있습니다. 창을 닫지 말고 잠시만 기다려주세요.
                  </div>
                ) : null}

                {refundConfirmState.status === "completed" ? (
                  <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-relaxed text-emerald-800">
                    <h4 className="text-base font-black text-emerald-950">환불 처리가 접수되었습니다</h4>
                    <p className="mt-2">{refundConfirmState.message}</p>
                    {typeof refundConfirmState.finalRefundAmount === "number" ? (
                      <p className="mt-2">환불금액: {formatKrwLabel(refundConfirmState.finalRefundAmount)}</p>
                    ) : null}
                  </div>
                ) : null}

                {refundConfirmState.status === "needs_review" ? (
                  <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-900">
                    <h4 className="text-base font-black text-amber-950">고객지원 확인이 필요합니다</h4>
                    <p className="mt-2">{refundConfirmState.message}</p>
                    <p className="mt-2">추가 결제나 재요청 없이 메뉴링크 고객지원 안내를 기다려주세요.</p>
                  </div>
                ) : null}

                {refundConfirmState.status === "error" ? (
                  <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-700">
                    <h4 className="text-base font-black text-red-800">환불 처리에 실패했습니다</h4>
                    <p className="mt-2">{refundConfirmState.message}</p>
                    <p className="mt-2">추가 결제나 재요청 없이 고객지원으로 문의해주세요.</p>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsViewingRefundGuide(false)}
                    className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    뒤로
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    disabled={
                      refundQuoteState.status !== "success" ||
                      !refundQuoteState.quote.canAutoRefundLater ||
                      !refundConfirmEnabled ||
                      refundConfirmState.status === "processing" ||
                      refundConfirmState.status === "completed"
                    }
                    onClick={submitRefundConfirm}
                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                  >
                    {refundConfirmState.status === "processing"
                      ? "환불 처리 중..."
                      : refundConfirmEnabled
                        ? "환불 진행"
                        : "환불 진행 - 준비 중"}
                  </button>
                </div>
              </div>
            ) : (
              <>
            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
              {isYearlyBilling
                ? "연결제는 매년 자동결제되는 연 정기결제 상품입니다. 해지 예약 시 다음 연 결제일부터 자동결제가 중단되며, 이미 결제된 이용 기간까지 계속 사용할 수 있습니다."
                : "구독을 해지하면 다음 결제일부터 결제가 중단됩니다. 이미 결제된 이용기간은 종료일까지 계속 이용할 수 있습니다. 이용기간 종료 후 메뉴판은 비공개 처리되며, 종료 후 90일이 지나면 메뉴판 데이터와 업로드 이미지가 삭제될 수 있습니다."}
            </div>

            {isYearlyBilling ? (
              <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-600">
                <p>
                  중도해지 및 환불이 필요한 경우 별도로 요청할 수 있습니다. 사용한 기간은 월결제 기준 금액으로 재정산되며, 이미 적용받은 연간 할인 혜택 중 사용 기간에 해당하는 금액이 환불금에서 공제될 수 있습니다.
                </p>
                <p className="mt-2">
                  환불 요청 후 검토 또는 처리 전까지는 요청 취소가 가능할 수 있으며, 환불 처리가 시작되면 고객지원 확인이 필요합니다. 실제 환불 처리는 관리자 검토 후 안내됩니다.
                </p>
              </div>
            ) : null}

            <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">현재 요금제</dt>
                <dd className="mt-2 font-bold text-zinc-900">{productName} {billingCycleLabel}</dd>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">구독 상태</dt>
                <dd className="mt-2 font-bold text-zinc-900">{cancelAtPeriodEnd ? "해지 예약됨" : statusLabel}</dd>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">연결된 메뉴판</dt>
                <dd className="mt-2 break-keep font-bold text-zinc-900">{menuName}</dd>
                <p className="mt-1 text-xs font-bold text-zinc-400">{menuStatus}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">다음 결제 예정 금액</dt>
                <dd className="mt-2 font-bold text-zinc-900">{amountLabel}</dd>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">결제 주기</dt>
                <dd className="mt-2 font-bold text-zinc-900">{billingCycleLabel}</dd>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{cancelAtPeriodEnd ? "이용 종료 예정일" : "다음 결제 예정일"}</dt>
                <dd className="mt-2 font-bold text-zinc-900">{cancelAtPeriodEnd ? periodEndLabel : nextBillingLabel}</dd>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">결제수단 / PG</dt>
                <dd className="mt-2 font-bold text-zinc-900">{pgLabel}</dd>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">서비스 권한</dt>
                <dd className="mt-2 font-bold text-zinc-900">{serviceEntitlementLabel}</dd>
              </div>
              {cancelAtPeriodEnd && (
                <div className="rounded-2xl bg-amber-50 p-4 md:col-span-2">
                  <dt className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">해지 예약일</dt>
                  <dd className="mt-2 font-bold text-amber-900">{cancelRequestedLabel}</dd>
                </div>
              )}
            </dl>

            {error && <p className="mt-4 break-keep rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {status === "active" && !cancelAtPeriodEnd && canManage ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIsConfirmingCancel(true);
                  }}
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800"
                >
                  {isYearlyBilling ? "다음 연 결제일부터 해지 예약" : "구독 해지 예약"}
                </button>
              ) : null}
              {status === "active" && cancelAtPeriodEnd && canManage ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={resumeCancellation}
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
                >
                  {isSubmitting ? "처리 중..." : "구독 유지하기 / 해지 예약 취소"}
                </button>
              ) : null}
              {status === "expired" || status === "failed" ? (
                <a href="/mypage/inquiries" className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700">
                  고객지원 문의
                </a>
              ) : null}
              {isYearlyBilling && status === "active" && canManage ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIsViewingRefundGuide(true);
                    void loadRefundQuote();
                  }}
                  className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  중도해지/환불 요청
                </button>
              ) : null}
            </div>
              </>
            )}
          </section>
        </div>
      )}

      {isConfirmingCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 px-4 py-8">
          <form onSubmit={submitCancellation} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">정말 구독을 해지하시겠어요?</h2>
            <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
              해지해도 이미 결제된 이용기간은 종료일까지 사용할 수 있습니다. {isYearlyBilling ? "다음 연 결제일부터 결제는 중단됩니다." : "다음 결제일부터 결제는 중단됩니다."}
            </p>
            <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
              이용기간 종료 후 메뉴판은 비공개 처리되며, 종료 후 90일 이내 다시 구독하면 기존 데이터를 계속 사용할 수 있습니다. 90일이 지나면 메뉴판 데이터와 업로드 이미지가 삭제될 수 있습니다.
            </p>
            <label className="mt-5 block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">해지 사유</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                placeholder="해지 사유를 남겨주세요. 선택 사항입니다."
                className="mt-2 min-h-28 w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-900 outline-none focus:border-zinc-950"
              />
            </label>
            {error && <p className="mt-4 break-keep rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setIsConfirmingCancel(false)} className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700">
                계속 이용하기
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                {isSubmitting ? "처리 중..." : isYearlyBilling ? "다음 연 결제일부터 해지하기" : "다음 결제일부터 해지하기"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
