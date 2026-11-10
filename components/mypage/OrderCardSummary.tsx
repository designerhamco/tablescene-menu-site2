import type {OperationHistoryRecord} from "@/lib/operations-history";
export default function OrderCardSummary({order,records}:{order:OperationHistoryRecord;records:readonly OperationHistoryRecord[]}){
  const processing=records.filter(record=>record.processing).length,unpaid=records.filter(record=>record.unpaid).length;
  const time=order.createdAt?new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(order.createdAt)):order.time;
  return <>
    <span data-order-card="counts">진행 중 {processing}건 · 미결제 {unpaid}건</span>
    <span data-order-card="metadata">대표 주문 #{order.orderNumber} · {time}</span>
    <span data-order-card="metadata">{order.status}</span>
    <span data-order-card="products">{order.summary}</span>
    {order.options?<span data-order-card="options">옵션: {order.options}</span>:null}
    <span data-order-card="metadata">대표 주문 금액 {order.amount}</span>
    <span data-order-card="detail">자세히 보기</span>
  </>;
}
