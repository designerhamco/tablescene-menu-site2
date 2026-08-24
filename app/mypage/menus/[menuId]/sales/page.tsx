import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  getSalesSummaryDashboard,
  SalesSummaryError,
} from "@/lib/server/sales-summary-service";

export const metadata: Metadata = {
  title: "매출 요약 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatAmount(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

const PAYMENT_METHOD_LABELS = {
  manual_card: "외부 카드 단말기",
  manual_cash: "현금",
  pg: "PG",
  other: "기타",
} as const;

export default async function SalesSummaryPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  let data;

  try {
    data = await getSalesSummaryDashboard(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") {
        redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/sales`)}`);
      }
      if (error.status === 404) notFound();
    }
    if (error instanceof SalesSummaryError) {
      if (error.code === "INVALID_INPUT" || error.code === "MENU_SITE_NOT_FOUND") notFound();
      if (error.code === "DASHBOARD_UNAVAILABLE") {
        redirect("/mypage?tab=menus&message=sales-dashboard-locked");
      }
    }
    throw error;
  }

  const { summary } = data;
  const visibleDays = summary.days.slice(0, summary.today.date.endsWith("-01") ? 1 : Number(summary.today.date.slice(-2))).reverse();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950 md:px-8 md:py-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <Link href="/mypage?tab=menus" className="text-sm font-black text-emerald-700 hover:text-emerald-900">
            ← 내 메뉴판으로 돌아가기
          </Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{data.menuSite.name}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">매출 요약</h1>
          <p className="mt-3 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
            한국 시간 기준으로 주문 접수 수와 외부 결제 완료 금액을 확인합니다. 정산·PG 매출 보고서가 아닌 매장 운영용 요약입니다.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black text-zinc-400">오늘 주문</p>
            <p className="mt-3 text-3xl font-black">{summary.today.orderCount.toLocaleString("ko-KR")}건</p>
          </article>
          <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
            <p className="text-xs font-black text-emerald-700">오늘 결제 완료액</p>
            <p className="mt-3 text-3xl font-black text-emerald-950">{formatAmount(summary.today.collectedAmount)}</p>
            <p className="mt-2 text-xs font-bold text-emerald-700">{summary.today.paidOrderCount.toLocaleString("ko-KR")}건</p>
          </article>
          <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black text-zinc-400">{summary.month}월 주문</p>
            <p className="mt-3 text-3xl font-black">{summary.monthTotals.orderCount.toLocaleString("ko-KR")}건</p>
          </article>
          <article className="rounded-3xl border border-sky-100 bg-sky-50 p-6 shadow-sm">
            <p className="text-xs font-black text-sky-700">{summary.month}월 결제 완료액</p>
            <p className="mt-3 text-3xl font-black text-sky-950">{formatAmount(summary.monthTotals.collectedAmount)}</p>
            <p className="mt-2 text-xs font-bold text-sky-700">{summary.monthTotals.paidOrderCount.toLocaleString("ko-KR")}건</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-zinc-100 px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black">{summary.year}년 {summary.month}월 일별 현황</h2>
              <p className="mt-1 text-xs font-bold text-zinc-500">결제 완료 시각과 주문 접수 시각을 각각 한국 시간 날짜로 집계합니다.</p>
            </div>
            <Link href={`/mypage/menus/${data.menuSite.id}/orders`} className="text-xs font-black text-emerald-700 underline underline-offset-4">
              주문관리 보기
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-black text-zinc-500">
                <tr>
                  <th className="px-6 py-3">날짜</th>
                  <th className="px-6 py-3 text-right">주문</th>
                  <th className="px-6 py-3 text-right">결제 완료</th>
                  <th className="px-6 py-3 text-right">결제 완료액</th>
                </tr>
              </thead>
              <tbody>
                {visibleDays.map((day) => (
                  <tr key={day.date} className="border-t border-zinc-100">
                    <td className="px-6 py-4 font-black">{day.date}</td>
                    <td className="px-6 py-4 text-right font-bold">{day.orderCount.toLocaleString("ko-KR")}건</td>
                    <td className="px-6 py-4 text-right font-bold">{day.paidOrderCount.toLocaleString("ko-KR")}건</td>
                    <td className="px-6 py-4 text-right font-black">{formatAmount(day.collectedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">메뉴별 판매량 Top 10</h2>
            <p className="mt-1 text-xs font-bold text-zinc-500">이번 달 결제 완료 주문의 주문 당시 메뉴명 snapshot 기준입니다.</p>
            {summary.topItems.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-zinc-50 px-4 py-8 text-center text-sm font-bold text-zinc-500">결제 완료된 메뉴가 없습니다.</p>
            ) : (
              <ol className="mt-5 space-y-3">
                {summary.topItems.map((item, index) => (
                  <li key={item.name} className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-black">{index + 1}. {item.name}</p>
                      <p className="mt-1 text-xs font-bold text-zinc-500">{item.quantity.toLocaleString("ko-KR")}개</p>
                    </div>
                    <p className="shrink-0 font-black">{formatAmount(item.collectedAmount)}</p>
                  </li>
                ))}
              </ol>
            )}
          </article>

          <div className="space-y-5">
            <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black">결제수단별 완료액</h2>
              <div className="mt-5 space-y-3">
                {summary.paymentMethods.length === 0 ? (
                  <p className="rounded-2xl bg-zinc-50 px-4 py-8 text-center text-sm font-bold text-zinc-500">결제 완료 내역이 없습니다.</p>
                ) : summary.paymentMethods.map((method) => (
                  <div key={method.method} className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 px-4 py-3">
                    <div>
                      <p className="font-black">{PAYMENT_METHOD_LABELS[method.method]}</p>
                      <p className="mt-1 text-xs font-bold text-zinc-500">{method.orderCount.toLocaleString("ko-KR")}건</p>
                    </div>
                    <p className="font-black">{formatAmount(method.collectedAmount)}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black">취소·미결제 현황</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-rose-50 p-4 text-rose-950">
                  <p className="text-xs font-black text-rose-700">취소 주문</p>
                  <p className="mt-2 text-xl font-black">{summary.orderStates.cancelledOrderCount.toLocaleString("ko-KR")}건</p>
                  <p className="mt-1 text-xs font-bold">주문금액 {formatAmount(summary.orderStates.cancelledOrderAmount)}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4 text-amber-950">
                  <p className="text-xs font-black text-amber-700">현재 미결제</p>
                  <p className="mt-2 text-xl font-black">{summary.orderStates.unpaidOrderCount.toLocaleString("ko-KR")}건</p>
                  <p className="mt-1 text-xs font-bold">주문금액 {formatAmount(summary.orderStates.unpaidOrderAmount)}</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <p className="rounded-2xl bg-zinc-100 px-4 py-3 text-xs font-bold leading-relaxed text-zinc-600">
          결제 완료액과 메뉴별 판매량은 현재 상태가 외부 결제 완료 또는 PG 결제 완료인 주문만 포함합니다. 취소·환불 상태는 제외하며 세금계산서, PG 정산, 수수료를 반영하지 않습니다.
        </p>
      </div>
    </main>
  );
}
