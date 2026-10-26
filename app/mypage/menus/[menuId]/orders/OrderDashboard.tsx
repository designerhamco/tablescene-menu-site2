"use client";

import { RecordCard } from "@/app/components/ui/data-display";
import { useRouter } from "next/navigation";
import { CUSTOMER_ORDER_STATUS_LABELS } from "@/lib/customer-order-history";
import { useActionState, useEffect, useState } from "react";

import OperationalArrivalAlert from "@/components/mypage/OperationalArrivalAlert";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { shouldRefreshArrivalDashboard } from "@/lib/dashboard-arrival-alerts";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import type { OrderDashboardPageData } from "@/lib/server/order-management-service";

import { initialOrderManagementActionState } from "./action-state";
import { mutateOrderAction } from "./actions";
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ShoppingBag } from "lucide-react";

const STATUS_LABELS: Record<string, string> = CUSTOMER_ORDER_STATUS_LABELS;

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
      <h1 className="type-content-title text-center">{menuSiteName}</h1>
      <p className="mt-1 text-center text-copy">주문 #{order.orderNumber} · {order.tableLabel}</p>
      <p className="mt-1 text-center text-support">{formatKoreanDateTime(order.createdAt)}</p>
      <div className="my-4 border-t border-dashed border-black" />
      {order.items.map((item) => (
        <div key={item.id} className="mb-3 text-copy">
          <div className="flex justify-between gap-3">
            <span>{item.name} × {item.quantity}</span>
            <span>{formatAmount(item.lineTotal)}</span>
          </div>
          {item.options.map((option) => (
            <p key={`${item.id}-${option.groupName}-${option.valueName}`} className="text-support">
              + {option.groupName}: {option.valueName}
            </p>
          ))}
        </div>
      ))}
      <div className="my-4 border-t border-dashed border-black" />
      <p className="flex justify-between text-copy font-medium"><span>합계</span><span>{formatAmount(order.totalAmount)}</span></p>
      <p className="mt-3 text-support">주문: {STATUS_LABELS[order.status] ?? order.status} / 결제: {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</p>
      {order.requestText ? <p className="mt-2 text-support">요청: {order.requestText}</p> : null}
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
  const [backgroundPollingEnabled, setBackgroundPollingEnabled] = useState(false);
  const printOrder = orders.find((order) => order.id === printOrderId) ?? null;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (shouldRefreshArrivalDashboard({
        pageVisible: document.visibilityState === "visible",
        browserNotificationsEnabled: backgroundPollingEnabled,
        mutationPending: pending,
      })) router.refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [backgroundPollingEnabled, pending, router]);

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
        <ActionFeedbackToast
          message={state.message}
          tone={state.status === "success" ? "success" : "error"}
          eventKey={state}
        />
        <OperationalArrivalAlert
          menuSiteId={menuSiteId}
          kind="orders"
          arrivalIds={orders.filter((order) => order.status !== "cancelled").map((order) => order.id)}
          onBackgroundPollingChange={setBackgroundPollingEnabled}
        />
        <div className="site-section flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-copy font-medium text-zinc-900">최근 주문 {orders.length.toLocaleString("ko-KR")}건</p>
            <p className="mt-1 text-support font-medium text-zinc-500">15초마다 자동 갱신하며, 상태 변경은 서버가 현재 값을 다시 확인합니다.</p>
          </div>
          <button type="button" onClick={() => router.refresh()} className="site-button site-button-rounded site-button-secondary">
            지금 새로고침
          </button>
        </div>

        {state.status !== "idle" && state.message ? (
          <p className={`site-notice   px-4 py-3 text-copy font-medium ${state.status === "success" ? "site-notice-success" : "site-notice-error"}`}>
            {state.message}
          </p>
        ) : null}

        {orders.length === 0 ? (
          <EmptyState headingLevel={3} icon={<ShoppingBag />} title="아직 접수된 주문이 없습니다." description="새 주문이 접수되면 이곳에 표시됩니다." />
        ) : orders.map((order) => (
          <RecordCard key={order.id}>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="type-subsection-title">#{order.orderNumber}</h2>
                  <Badge>{order.tableLabel}</Badge>
                  <Badge>{STATUS_LABELS[order.status] ?? order.status}</Badge>
                  <Badge>
                    {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </Badge>
                </div>
                <p className="mt-2 text-support font-medium text-zinc-400">{formatKoreanDateTime(order.createdAt)}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="type-metric">{formatAmount(order.totalAmount)}</p>
                <button type="button" onClick={() => setPrintOrderId(order.id)} className="site-button site-button-link mt-2">
                  브라우저 영수증 인쇄
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-y border-zinc-100 py-5">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 text-copy">
                  <div>
                    <p className="font-bold">{item.name} × {item.quantity}</p>
                    {item.options.map((option) => (
                      <p key={`${item.id}-${option.groupName}-${option.valueName}`} className="mt-1 text-support font-medium text-zinc-500">
                        {option.groupName}: {option.valueName}{option.priceDelta > 0 ? ` (+${formatAmount(option.priceDelta)})` : ""}
                      </p>
                    ))}
                  </div>
                  <p className="font-bold">{formatAmount(item.lineTotal)}</p>
                </div>
              ))}
              {order.requestText ? <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-copy font-medium text-zinc-700">요청사항: {order.requestText}</p> : null}
              {order.cancellationReason ? <p className="site-notice site-notice-error px-4 py-3 text-copy font-medium">취소 사유: {order.cancellationReason}</p> : null}
            </div>

            {(permissions.canManage && order.nextStatus || permissions.canMarkManualPayment && order.canMarkManualPayment || permissions.canCancelUnpaid && order.canCancelUnpaid) ? <div className="site-record-card-actions">
              {permissions.canManage && order.nextStatus ? (
                <form action={action} className="site-record-action-form">
                  <input type="hidden" name="menuSiteId" value={menuSiteId} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="nextStatus" value={order.nextStatus} />
                  <p className="text-support font-medium text-emerald-900">다음 단계: {STATUS_LABELS[order.nextStatus]}</p>
                  <button name="intent" value="transition" disabled={pending} className="site-button site-button-rounded site-button-outline mt-3 w-full">
                    상태 변경
                  </button>
                </form>
              ) : null}

              {permissions.canMarkManualPayment && order.canMarkManualPayment ? (
                <form action={action} className="site-record-action-form">
                  <input type="hidden" name="menuSiteId" value={menuSiteId} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <label className="text-support font-medium text-sky-900">
                    외부 결제 완료
                    <select name="method" className="site-field mt-2 w-full border-sky-200 px-3 py-2">
                      <option value="manual_card">기존 카드 단말기</option>
                      <option value="manual_cash">현금</option>
                    </select>
                  </label>
                  <button name="intent" value="manual-payment" disabled={pending} className="site-button site-button-rounded site-button-outline mt-3 w-full">
                    결제 완료 기록
                  </button>
                </form>
              ) : null}

              {permissions.canCancelUnpaid && order.canCancelUnpaid ? (
                <form action={action} className="site-record-action-form">
                  <input type="hidden" name="menuSiteId" value={menuSiteId} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <label className="text-support font-medium text-rose-900">
                    미결제 주문 취소
                    <textarea name="reason" required maxLength={500} rows={2} placeholder="취소 사유" className="site-field mt-2 w-full resize-none border-rose-200 px-3 py-2" />
                  </label>
                  <button name="intent" value="cancel" disabled={pending} className="site-button site-button-rounded site-button-outline mt-3 w-full">
                    주문 취소
                  </button>
                </form>
              ) : null}
            </div> : null}
          </RecordCard>
        ))}
      </div>
    </>
  );
}
