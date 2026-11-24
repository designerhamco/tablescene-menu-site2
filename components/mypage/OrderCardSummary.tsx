import { formatElapsedMinutes, formatKoreanClockTime, formatKoreanDateTime } from "@/lib/korean-date-time";
import type { OperationHistoryRecord } from "@/lib/operations-history";
import { formatAmount } from "./OrderReceipt";
import OrderStage from "./OrderStage";

export const ORDER_CARD_FIELDS = [
  { id: "time", label: "주문시각" },
  { id: "elapsed", label: "경과시간" },
  { id: "orders", label: "주문수량" },
  { id: "items", label: "메뉴수량" },
  { id: "status", label: "상태" },
  { id: "number", label: "주문번호" },
  { id: "total", label: "합계" },
] as const;

export type OrderCardField = (typeof ORDER_CARD_FIELDS)[number]["id"];
export const DEFAULT_ORDER_CARD_FIELDS: readonly OrderCardField[] = ["elapsed", "orders", "items", "status"];

export default function OrderCardSummary({ pointLabel, order, records, fields, now }: {
  pointLabel: string;
  order: OperationHistoryRecord;
  records: readonly OperationHistoryRecord[];
  fields: ReadonlySet<OrderCardField>;
  now: number | null;
}) {
  const time = formatKoreanClockTime(order.createdAt);
  const elapsed = order.processing ? formatElapsedMinutes(order.createdAt, now) : null;
  return <>
    {fields.has("number") && <span data-order-card="number" className="site-copy-muted">#{order.orderNumber}</span>}
    <div className="site-order-card-heading">
      <strong className="type-label">{pointLabel}</strong>
      {fields.has("status") && order.orderStatus && (
        <span data-order-card="status">
          <OrderStage status={order.orderStatus} />
          {order.orderStatus === "served" && order.unpaid && <span className="site-copy-muted"> · 미결제</span>}
        </span>
      )}
    </div>
    {fields.has("time") && <span data-order-card="time">주문시각 {time
      ? <time dateTime={order.createdAt} title={formatKoreanDateTime(order.createdAt)}>{time}</time>
      : "–"}</span>}
    {fields.has("elapsed") && elapsed && <span data-order-card="elapsed">주문 후 {elapsed}</span>}
    {fields.has("orders") && <span data-order-card="orders">주문 총 {records.length}건</span>}
    {fields.has("items") && <span data-order-card="items">메뉴 총 {records.reduce((sum, record) => sum + (record.itemCount ?? 0), 0)}개</span>}
    {fields.has("total") && <span data-order-card="total"><strong className="type-label">합계 {formatAmount(records.reduce((sum, record) => sum + (record.totalAmount ?? 0), 0))}</strong></span>}
    <span data-order-card="detail" className="type-label">열기</span>
  </>;
}
