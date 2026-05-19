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
};

type ApiResult = {
  ok?: boolean;
  message?: string;
};

async function parseApiResult(response: Response) {
  const result = (await response.json().catch(() => ({}))) as ApiResult;

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "요청 처리에 실패했습니다.");
  }

  return result;
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
}: SubscriptionManagementModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setIsOpen(false);
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
      setIsOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "해지 예약 취소에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Subscription</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">구독 관리</h2>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-black text-zinc-600">
                닫기
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
              구독을 해지해도 이미 결제된 이용 기간이 끝날 때까지 메뉴판을 사용할 수 있습니다. 다음 결제일부터 자동 갱신되지 않습니다.
            </div>

            <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">상품명</dt>
                <dd className="mt-2 font-bold text-zinc-900">{productName}</dd>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">상태</dt>
                <dd className="mt-2 font-bold text-zinc-900">{cancelAtPeriodEnd ? "해지 예약됨" : statusLabel}</dd>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">연결된 메뉴판</dt>
                <dd className="mt-2 break-keep font-bold text-zinc-900">{menuName}</dd>
                <p className="mt-1 text-xs font-bold text-zinc-400">{menuStatus}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">결제 금액</dt>
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
                  구독 해지 예약
                </button>
              ) : null}
              {status === "active" && cancelAtPeriodEnd && canManage ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={resumeCancellation}
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
                >
                  {isSubmitting ? "처리 중..." : "해지 예약 취소"}
                </button>
              ) : null}
              {status === "expired" || status === "failed" ? (
                <a href="/mypage/inquiries" className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700">
                  고객지원 문의
                </a>
              ) : null}
            </div>
          </section>
        </div>
      )}

      {isConfirmingCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 px-4 py-8">
          <form onSubmit={submitCancellation} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">구독 해지 예약</h2>
            <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
              구독을 해지해도 이미 결제된 기간이 끝날 때까지 메뉴판을 사용할 수 있습니다. 다음 결제일부터 자동 갱신되지 않습니다.
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
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                {isSubmitting ? "처리 중..." : "해지 예약하기"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
