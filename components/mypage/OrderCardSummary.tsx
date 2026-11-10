import {Badge} from "@/app/components/ui/badge";
import type {OperationHistoryRecord} from "@/lib/operations-history";
/** One representative order; full contents and every order remain in the detail dialog. */
export default function OrderCardSummary({order,records}:{order:OperationHistoryRecord;records:readonly OperationHistoryRecord[]}){
  const processing=records.filter(record=>record.processing).length,unpaid=records.filter(record=>record.unpaid).length;
  const date=order.createdAt?new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(order.createdAt)).replaceAll("-","."):order.time;
  return <>
    <span data-order-card="counts">진행 중 {processing}건 · 미결제 {unpaid}건</span>
    <span data-order-card="metadata">대표 주문 #{order.orderNumber} · <time dateTime={order.createdAt}>{date}</time></span>
    <span data-order-card="statuses">{order.orderStatusLabel&&order.paymentStatusLabel?<><Badge>{order.orderStatusLabel}</Badge><Badge>{order.paymentStatusLabel}</Badge></>:order.status}</span>
    <span data-order-card="products" className="type-body-sm">{order.summary||"상품 정보 없음"}</span>
    {order.options?<span data-order-card="options">옵션: {order.options}</span>:null}
    <span data-order-card="amount">대표 주문 금액 <strong className="type-label">{order.amount}</strong></span>
    <span data-order-card="detail">자세히 보기 · 주문 {records.length}건</span>
  </>;
}
