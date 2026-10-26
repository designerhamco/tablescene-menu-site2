"use client";

import { useState, useId } from "react";

export type ActivityDay = { date: string; orderCount: number; paidOrderCount: number; collectedAmount: number };
export function ProgressRing({ value, label }: { value: number; label: string }) {
  const safe=Math.min(100,Math.max(0,Number.isFinite(value)?value:0));
  const id=useId();
  return <svg className="site-progress-ring" viewBox="0 0 100 100" role="img" aria-labelledby={id}><title id={id}>{`${label} ${Math.round(safe)}%`}</title><circle cx="50" cy="50" r="42" className="site-progress-track" /><circle cx="50" cy="50" r="42" className="site-progress-value" pathLength="100" strokeDasharray={`${safe} 100`} /><text x="50" y="54" textAnchor="middle" aria-hidden="true">{`${Math.round(safe)}%`}</text></svg>;
}
export function ActivityOverview({ days, label }: { days: ActivityDay[]; label: string }) {
  const ordered=[...days].sort((a,b)=>a.date.localeCompare(b.date));
  const [selectedDate,setSelectedDate]=useState(ordered.at(-1)?.date ?? "");
  const selected=ordered.find(day=>day.date===selectedDate) ?? ordered.at(-1);
  const max=Math.max(1,...ordered.map(day=>day.collectedAmount));
  const totalOrders=ordered.reduce((sum,day)=>sum+day.orderCount,0);
  const totalPaid=ordered.reduce((sum,day)=>sum+day.paidOrderCount,0);
  return <section className="site-activity" aria-label={label}>
    <div className="site-activity-calendar"><p className="type-content-title">{label}</p><div className="site-date-strip" role="group" aria-label="최근 일자 선택">{ordered.slice(-7).map(day=><button type="button" key={day.date} aria-pressed={selected?.date===day.date} onClick={()=>setSelectedDate(day.date)} aria-label={day.date}><span>{new Intl.DateTimeFormat("ko-KR",{weekday:"short",timeZone:"Asia/Seoul"}).format(new Date(`${day.date}T12:00:00+09:00`))}</span><strong>{Number(day.date.slice(-2))}</strong></button>)}</div></div>
    <div className="site-activity-grid"><div className="site-activity-chart"><div className="site-activity-heading"><div><h3 className="type-content-title">일별 결제 완료액</h3><p className="type-caption mt-2 text-zinc-600">{selected ? `${selected.date} · ${selected.orderCount.toLocaleString("ko-KR")}건 주문` : "집계된 내역이 없습니다"}</p><p className="site-metric-value">{(selected?.collectedAmount ?? 0).toLocaleString("ko-KR")}원</p></div></div><ol className="site-activity-bars" aria-label="일별 결제 완료액 차트">{ordered.map(day=><li key={day.date}><button type="button" onClick={()=>setSelectedDate(day.date)} aria-pressed={selected?.date===day.date} aria-label={`${day.date} 결제 완료액 ${day.collectedAmount.toLocaleString("ko-KR")}원`}><span className="site-activity-bar-track"><i style={{height:`${day.collectedAmount / max * 100}%`}} /></span><span aria-hidden="true">{Number(day.date.slice(-2))}</span></button></li>)}</ol></div><div className="site-activity-ratio"><h3 className="type-content-title">결제 완료 비율</h3><p className="type-body-sm mt-2 text-zinc-600">주문 {totalOrders.toLocaleString("ko-KR")}건 중 결제 완료 {totalPaid.toLocaleString("ko-KR")}건</p><ProgressRing value={totalOrders ? totalPaid/totalOrders*100 : 0} label="결제 완료 비율" /><p className="type-caption text-zinc-600">표시한 기간의 실제 주문 건수 기준</p></div></div>
  </section>;
}
