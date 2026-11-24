import { CUSTOMER_ORDER_STATUS_LABELS } from "@/lib/customer-order-history";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import type { OrderDashboardItem, OrderDashboardOrder } from "@/lib/server/order-management-service";

export const STATUS_LABELS: Record<string, string> = { ...CUSTOMER_ORDER_STATUS_LABELS, ready: "조리완료", served: "픽업·서빙 완료" };
export const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "미결제",
  manual_paid: "외부 결제 완료",
  paid: "PG 결제 완료",
  cancelled: "결제 취소",
  refunded: "환불 완료",
};
export const formatAmount = (value: number) => `${value.toLocaleString("ko-KR")}원`;
export default function OrderReceipt({
  order,
  menuSiteName,
}: {
  order: Pick<OrderDashboardOrder, "orderNumber" | "tableLabel" | "createdAt" | "status" | "paymentStatus" | "totalAmount" | "requestText"> & {
    items: (Pick<OrderDashboardItem, "id" | "name" | "quantity" | "lineTotal"> & {
      options: Pick<OrderDashboardItem["options"][number], "groupName" | "valueName">[];
    })[];
  };
  menuSiteName: string;
}) {
  return (
    <section data-order-receipt className="mx-auto max-w-[80mm] bg-white p-6 font-mono text-black">
      <h2 className="type-content-title text-center">{menuSiteName}</h2>
      <p className="mt-1 text-center text-copy">
        주문 #{order.orderNumber} · {order.tableLabel}
      </p>
      <p className="mt-1 text-center text-support">
        {formatKoreanDateTime(order.createdAt)}
      </p>
      <div className="my-4 border-t border-dashed border-black" />
      {order.items.map((item) => (
        <div key={item.id} className="mb-3 text-copy">
          <div className="flex justify-between gap-3">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatAmount(item.lineTotal)}</span>
          </div>
          {item.options.map((option) => (
            <p
              key={`${item.id}-${option.groupName}-${option.valueName}`}
              className="text-support"
            >
              + {option.groupName}: {option.valueName}
            </p>
          ))}
        </div>
      ))}
      <div className="my-4 border-t border-dashed border-black" />
      <p className="flex justify-between text-copy font-medium">
        <span>합계</span>
        <span>{formatAmount(order.totalAmount)}</span>
      </p>
      <p className="mt-3 text-support">
        주문: {STATUS_LABELS[order.status] ?? order.status} / 결제:{" "}
        {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
      </p>
      {order.requestText ? (
        <p className="mt-2 text-support">요청: {order.requestText}</p>
      ) : null}
    </section>
  );
}
