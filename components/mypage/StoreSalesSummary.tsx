import Link from "next/link";
import { CreditCard, ShoppingBag } from "lucide-react";
import { ActivityOverview } from "@/app/components/ui/activity-overview";
import { MetricCard } from "@/app/components/ui/data-display";
import { ContentPanel } from "@/app/components/ui/content-panel";
import type { SalesMonthSummary } from "@/lib/sales-summary";

export const formatSalesAmount = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
export function StoreSalesMetrics({ summary }: { summary: SalesMonthSummary }) {
  return <section className="site-metric-grid" aria-label="매출 요약">
    <MetricCard surface="muted" label="오늘 결제 완료액" value={formatSalesAmount(summary.today.collectedAmount)} detail={`결제 완료 ${summary.today.paidOrderCount.toLocaleString("ko-KR")}건`} icon={<CreditCard />} tone="green" />
    <MetricCard surface="muted" label="오늘 접수 주문" value={`${summary.today.orderCount.toLocaleString("ko-KR")}건`} detail="취소 주문을 포함한 접수 건수" icon={<ShoppingBag />} tone="blue" />
    <MetricCard surface="muted" label={`${summary.month}월 결제 완료액`} value={formatSalesAmount(summary.monthTotals.collectedAmount)} detail={`결제 완료 ${summary.monthTotals.paidOrderCount.toLocaleString("ko-KR")}건`} icon={<CreditCard />} tone="green" />
    <MetricCard surface="muted" label={`${summary.month}월 접수 주문`} value={`${summary.monthTotals.orderCount.toLocaleString("ko-KR")}건`} detail="취소 주문을 포함한 접수 건수" icon={<ShoppingBag />} tone="blue" />
  </section>;
}
export default function StoreSalesSummary({ summary, menuId, ordersAvailable }: { summary: SalesMonthSummary; menuId: string; ordersAvailable: boolean }) {
  const methods = { manual_card: "외부 카드 단말기", manual_cash: "현금", pg: "PG", other: "기타" };
  const visibleDays = summary.days.slice(0, Number(summary.today.date.slice(-2))).reverse();
  return <div className="site-stack-group">
    <StoreSalesMetrics summary={summary} />
    <ActivityOverview days={visibleDays} label={`${summary.year}년 ${summary.month}월`} completion={summary.receivedOrderPayments} />
    <ContentPanel>
      <div className="site-stack-title"><h3 className="type-content-title">{summary.year}년 {summary.month}월 일별 현황</h3><p className="type-body-sm site-copy-muted">주문은 접수일, 결제 완료액은 결제 완료일을 기준으로 집계합니다. 날짜는 한국 시간 기준입니다.</p></div>
      <ul className="site-stack-block">{visibleDays.map(day => <li key={day.date} className="site-content-heading-row site-content-divider">
        <p className="type-label">{day.date}</p><div className="site-stack-copy"><p className="type-body">{formatSalesAmount(day.collectedAmount)}</p><p className="type-caption site-copy-muted">접수 {day.orderCount.toLocaleString("ko-KR")}건 · 결제 완료 {day.paidOrderCount.toLocaleString("ko-KR")}건</p></div>
      </li>)}</ul>
      {ordersAvailable ? <div className="site-action-row"><Link href={`/mypage/menus/${menuId}/orders`} className="site-button site-button-outline">주문 내역 보기</Link></div> : null}
    </ContentPanel>
    <div className="site-card-grid lg:grid-cols-2">
      <ContentPanel><div className="site-stack-title"><h3 className="type-content-title">메뉴별 판매량 Top 10</h3><p className="type-body-sm site-copy-muted">이번 달 결제 완료된 주문의 메뉴명과 가격을 기준으로 집계합니다.</p></div>
        {!summary.topItems.length ? <p className="type-body-sm site-copy-muted">결제 완료된 메뉴가 없습니다.</p> : <ol className="site-stack-block">{summary.topItems.map((item, index) => <li key={item.name} className="site-content-heading-row site-content-divider"><div className="site-stack-copy min-w-0"><p className="type-label break-words">{index + 1}. {item.name}</p><p className="type-caption site-copy-muted">{item.quantity.toLocaleString("ko-KR")}개</p></div><p className="type-body">{formatSalesAmount(item.collectedAmount)}</p></li>)}</ol>}
      </ContentPanel>
      <ContentPanel><h3 className="type-content-title">결제수단별 완료액</h3>{!summary.paymentMethods.length ? <p className="type-body-sm site-copy-muted">결제 완료 내역이 없습니다.</p> : <ul className="site-stack-block">{summary.paymentMethods.map(method => <li key={method.method} className="site-content-heading-row site-content-divider"><div className="site-stack-copy"><p className="type-label">{methods[method.method]}</p><p className="type-caption site-copy-muted">{method.orderCount.toLocaleString("ko-KR")}건</p></div><p className="type-body">{formatSalesAmount(method.collectedAmount)}</p></li>)}</ul>}</ContentPanel>
      <ContentPanel surface="muted"><h3 className="type-content-title">취소 주문</h3><p className="type-metric">{summary.orderStates.cancelledOrderCount.toLocaleString("ko-KR")}건</p><p className="type-body-sm site-copy-muted">주문금액 {formatSalesAmount(summary.orderStates.cancelledOrderAmount)}</p></ContentPanel>
      <ContentPanel surface="muted"><h3 className="type-content-title">현재 미결제 주문</h3><p className="type-metric">{summary.orderStates.unpaidOrderCount.toLocaleString("ko-KR")}건</p><p className="type-body-sm site-copy-muted">주문금액 {formatSalesAmount(summary.orderStates.unpaidOrderAmount)}</p></ContentPanel>
    </div>
    <ContentPanel as="aside" surface="notice" density="compact"><p className="type-body-sm">결제 완료액에는 매장에서 결제 완료 처리한 카드·현금 및 PG 결제 완료 주문을 포함합니다. 취소·환불·미결제는 제외하며, 정산 금액과 수수료는 반영하지 않습니다.</p></ContentPanel>
  </div>;
}
