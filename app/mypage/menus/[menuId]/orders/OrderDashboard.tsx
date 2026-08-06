"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import type { OrderDashboardPageData } from "@/lib/server/order-management-service";

import {
  initialOrderManagementActionState,
  mutateOrderAction,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  received: "접수",
  accepted: "조리 전",
  cooking: "조리 중",
  ready: "조리 완료",
  served: "제공 완료",
  cancelled: "취소",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "미결제",
  manual_paid: "외부 결제 완료",
  paid: "PG 결제 완료",
  cancelled: "결제 취소",
  refunded: "환불 완료",
};

function formatAmount(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function OrderReceipt({
  order,
  menuSiteName,
}: {
  order: OrderDashboardPageData["orders"][number];
  menuSiteName: string;
}) {
  return (
    <section className="mx-auto max-w-[80mm] bg-white p-6 font-mono text-black">
      <h1 className="text-center text-xl font-black">{menuSiteName}</h1>
      <p className="mt-1 text-center text-sm">주문 #{order.orderNumber} · {order.tableLabel}</p>
      <p className="mt-1 text-center text-xs">{new Date(order.createdAt).toLocaleString("ko-KR")}</p>
      <div className="my-4 border-t border-dashed border-black" />
      {order.items.map((item) => (
        <div key={item.id} className="mb-3 text-sm">
          <div className="flex justify-between gap-3">
            <span>{item.name} × {item.quantity}</span>
            <span>{formatAmount(item.lineTotal)}</span>
          </div>
          {item.options.map((option) => (
            <p key={`${item.id}-${option.groupName}-${option.valueName}`} className="text-xs">
              + {option.groupName}: {option.valueName}
            </p>
          ))}
        </div>
      ))}
      <div className="my-4 border-t border-dashed border-black" />
      <p className="flex justify-between text-base font-black"><span>합계</span><span>{formatAmount(order.totalAmount)}</span></p>
      <p className="mt-3 text-xs">주문: {STATUS_LABELS[order.status] ?? order.status} / 결제: {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</p>
      {order.requestText ? <p className="mt-2 text-xs">요청: {order.requestText}</p> : null}
    </section>
  );
}

export default function OrderDashboard({
  menuSiteId,
  menuSiteName,
  orders,
  permissions,
}: {
  menuSiteId: string;
  menuSiteName: string;
  orders: OrderDashboardPageData["orders"];
  permissions: OrderDashboardPageData["permissions"];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(mutateOrderAction, initialOrderManagementActionState);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const printOrder = orders.find((order) => order.id === printOrderId) ?? null;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !pending) router.refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [pending, router]);

  useEffect(() => {
    if (!printOrder) return;
    const clear = () => setPrintOrderId(null);
    window.addEventListener("afterprint", clear, { once: true });
    const timer = window.setTimeout(() => window.print(), 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", clear);
    };
  }, [printOrder]);

  return (
    <>
      {printOrder ? (
        <div className="hidden print:block">
          <OrderReceipt order={printOrder} menuSiteName={menuSiteName} />
        </div>
      ) : null}
      <div className="space-y-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-black text-zinc-900">최근 주문 {orders.length.toLocaleString("ko-KR")}건</p>
            <p className="mt-1 text-xs font-bold text-zinc-500">15초마다 자동 갱신하며, 상태 변경은 서버가 현재 값을 다시 확인합니다.</p>
          </div>
          <button type="button" onClick={() => router.refresh()} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-black hover:bg-zinc-100">
            지금 새로고침
          </button>
        </div>

        {state.status !== "idle" && state.message ? (
          <p className={`rounded-2xl border px-4 py-3 text-sm font-bold ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {state.message}
          </p>
        ) : null}

        {orders.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm font-bold text-zinc-500">
            아직 접수된 주문이 없습니다.
          </p>
        ) : orders.map((order) => (
          <article key={order.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black">#{order.orderNumber}</h2>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">{order.tableLabel}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{STATUS_LABELS[order.status] ?? order.status}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${order.paymentStatus === "unpaid" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-700"}`}>
                    {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-zinc-400">{new Date(order.createdAt).toLocaleString("ko-KR")}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-2xl font-black">{formatAmount(order.totalAmount)}</p>
                <button type="button" onClick={() => setPrintOrderId(order.id)} className="mt-2 text-xs font-black text-zinc-500 underline underline-offset-4">
                  브라우저 영수증 인쇄
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-y border-zinc-100 py-5">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 text-sm">
                  <div>
                    <p className="font-black">{item.name} × {item.quantity}</p>
                    {item.options.map((option) => (
                      <p key={`${item.id}-${option.groupName}-${option.valueName}`} className="mt-1 text-xs font-bold text-zinc-500">
                        {option.groupName}: {option.valueName}{option.priceDelta > 0 ? ` (+${formatAmount(option.priceDelta)})` : ""}
                      </p>
                    ))}
                  </div>
                  <p className="font-black">{formatAmount(item.lineTotal)}</p>
                </div>
              ))}
              {order.requestText ? <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700">요청사항: {order.requestText}</p> : null}
              {order.cancellationReason ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">취소 사유: {order.cancellationReason}</p> : null}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {permissions.canManage && order.nextStatus ? (
                <form action={action} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <input type="hidden" name="menuSiteId" value={menuSiteId} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="nextStatus" value={order.nextStatus} />
                  <p className="text-xs font-black text-emerald-900">다음 단계: {STATUS_LABELS[order.nextStatus]}</p>
                  <button name="intent" value="transition" disabled={pending} className="mt-3 w-full rounded-full bg-emerald-800 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60">
                    상태 변경
                  </button>
                </form>
              ) : null}

              {permissions.canMarkManualPayment && order.canMarkManualPayment ? (
                <form action={action} className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                  <input type="hidden" name="menuSiteId" value={menuSiteId} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <label className="text-xs font-black text-sky-900">
                    외부 결제 완료
                    <select name="method" className="mt-2 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold">
                      <option value="manual_card">기존 카드 단말기</option>
                      <option value="manual_cash">현금</option>
                    </select>
                  </label>
                  <button name="intent" value="manual-payment" disabled={pending} className="mt-3 w-full rounded-full bg-sky-800 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60">
                    결제 완료 기록
                  </button>
                </form>
              ) : null}

              {permissions.canCancelUnpaid && order.canCancelUnpaid ? (
                <form action={action} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <input type="hidden" name="menuSiteId" value={menuSiteId} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <label className="text-xs font-black text-rose-900">
                    미결제 주문 취소
                    <textarea name="reason" required maxLength={500} rows={2} placeholder="취소 사유" className="mt-2 w-full resize-none rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold" />
                  </label>
                  <button name="intent" value="cancel" disabled={pending} className="mt-3 w-full rounded-full bg-rose-800 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60">
                    주문 취소
                  </button>
                </form>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
