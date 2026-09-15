"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import OperationalArrivalAlert from "@/components/mypage/OperationalArrivalAlert";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { shouldRefreshArrivalDashboard } from "@/lib/dashboard-arrival-alerts";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import type { CallDashboardPageData } from "@/lib/server/call-management-service";

import { initialCallManagementActionState } from "./action-state";
import { mutateCallAction } from "./actions";
import CallItemManager from "./CallItemManager";

const STATUS_LABELS: Record<string, string> = {
  pending: "미처리",
  acknowledged: "확인됨",
  completed: "처리 완료",
  cancelled: "손님 취소",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-rose-50 text-rose-800",
  acknowledged: "bg-amber-50 text-amber-800",
  completed: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-zinc-100 text-zinc-600",
};

function getKoreanDateKey(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function CallDashboard({ menuSiteId, calls, callItems }: {
  menuSiteId: string;
  calls: CallDashboardPageData["calls"];
  callItems: CallDashboardPageData["callItems"];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(mutateCallAction, initialCallManagementActionState);
  const [activeTab, setActiveTab] = useState<"history" | "settings">("history");
  const [backgroundPollingEnabled, setBackgroundPollingEnabled] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [handlerFilter, setHandlerFilter] = useState("");
  const unresolvedCount = calls.filter((call) => call.status === "pending" || call.status === "acknowledged").length;

  const handlerOptions = useMemo(() => [...new Set(calls.flatMap((call) => [
    call.completedByLabel,
    call.acknowledgedByLabel,
  ]).filter((value): value is string => Boolean(value)))].sort((left, right) => left.localeCompare(right, "ko-KR")), [calls]);

  const filteredCalls = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    return calls.filter((call) => {
      if (statusFilter === "unresolved" && call.status !== "pending" && call.status !== "acknowledged") return false;
      if (statusFilter !== "all" && statusFilter !== "unresolved" && call.status !== statusFilter) return false;
      if (dateFilter && getKoreanDateKey(call.createdAt) !== dateFilter) return false;
      const handlers = [call.acknowledgedByLabel, call.completedByLabel].filter((value): value is string => Boolean(value));
      if (handlerFilter && !handlers.includes(handlerFilter)) return false;
      if (!normalizedQuery) return true;
      return [call.tableLabel, call.requestLabel, String(call.callNumber), ...handlers]
        .some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
    });
  }, [calls, dateFilter, handlerFilter, query, statusFilter]);

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

  return (
    <div className="space-y-5">
      <OperationalArrivalAlert
        menuSiteId={menuSiteId}
        kind="calls"
        arrivalIds={calls.filter((call) => call.status === "pending").map((call) => call.id)}
        onBackgroundPollingChange={setBackgroundPollingEnabled}
      />
      <ActionFeedbackToast message={state.message} tone={state.status === "success" ? "success" : "error"} eventKey={state} />

      <div className="flex gap-1 rounded-2xl border border-zinc-200 bg-zinc-100 p-1" role="tablist" aria-label="호출관리 화면">
        <button type="button" role="tab" aria-selected={activeTab === "history"} onClick={() => setActiveTab("history")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${activeTab === "history" ? "bg-white text-zinc-950" : "text-zinc-500 hover:text-zinc-800"}`}>
          호출 내역{unresolvedCount > 0 ? ` · 미처리 ${unresolvedCount}` : ""}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "settings"} onClick={() => setActiveTab("settings")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${activeTab === "settings" ? "bg-white text-zinc-950" : "text-zinc-500 hover:text-zinc-800"}`}>
          호출 관리
        </button>
      </div>

      {activeTab === "settings" ? (
        <CallItemManager key={callItems.map((item) => `${item.key}:${item.label}:${item.sortOrder}:${item.active}`).join("|")} menuSiteId={menuSiteId} items={callItems} />
      ) : (
        <div className="space-y-4" role="tabpanel">
          <section className="rounded-3xl border border-zinc-200 bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-zinc-900">처리할 호출 {unresolvedCount.toLocaleString("ko-KR")}건 · 최근 이력 {calls.length.toLocaleString("ko-KR")}건</p>
                <p className="mt-1 text-xs font-bold text-zinc-500">최신 호출부터 표시하며 15초마다 자동으로 갱신합니다.</p>
              </div>
              <button type="button" onClick={() => router.refresh()} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold hover:bg-zinc-100">지금 새로고침</button>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-[minmax(12rem,1fr)_auto_auto_auto]">
              <label className="relative block">
                <span className="sr-only">호출 내역 검색</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="테이블·요청·처리자 검색" className="h-11 w-full rounded-xl border border-zinc-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-zinc-500" />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="상태 필터" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700">
                <option value="unresolved">미처리만</option>
                <option value="all">전체 상태</option>
                <option value="pending">접수 대기</option>
                <option value="acknowledged">확인됨</option>
                <option value="completed">처리 완료</option>
                <option value="cancelled">손님 취소</option>
              </select>
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="호출 날짜" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700" />
              <select value={handlerFilter} onChange={(event) => setHandlerFilter(event.target.value)} aria-label="처리자 필터" className="h-11 min-w-36 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700">
                <option value="">모든 처리자</option>
                {handlerOptions.map((handler) => <option key={handler} value={handler}>{handler}</option>)}
              </select>
            </div>
          </section>

          {state.status !== "idle" && state.message ? <p className={`rounded-2xl border px-4 py-3 text-sm font-bold ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{state.message}</p> : null}

          {calls.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm font-bold text-zinc-500">아직 접수된 직원 호출이 없습니다.</p>
          ) : filteredCalls.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm font-bold text-zinc-500">조건에 맞는 호출 내역이 없습니다.</p>
          ) : filteredCalls.map((call) => (
            <article key={call.id} className="rounded-3xl border border-zinc-200 bg-white p-5 md:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="type-subsection-title">{call.requestLabel}</h2>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">{call.tableLabel}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[call.status] ?? "bg-zinc-100 text-zinc-700"}`}>{STATUS_LABELS[call.status] ?? call.status}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-zinc-400">호출 #{call.callNumber} · 접수 {formatKoreanDateTime(call.createdAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-zinc-600">
                    {call.acknowledgedAt ? <span>확인 {call.acknowledgedByLabel ?? "직원"} · {formatKoreanDateTime(call.acknowledgedAt)}</span> : null}
                    {call.completedAt ? <span>완료 {call.completedByLabel ?? "직원"} · {formatKoreanDateTime(call.completedAt)}</span> : null}
                  </div>
                </div>
                {call.nextStatus ? (
                  <form action={action}>
                    <input type="hidden" name="menuSiteId" value={menuSiteId} />
                    <input type="hidden" name="callId" value={call.id} />
                    <input type="hidden" name="nextStatus" value={call.nextStatus} />
                    <button disabled={pending} className={`min-w-32 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60 ${call.nextStatus === "completed" ? "bg-emerald-800" : "bg-zinc-950"}`}>{call.nextStatus === "completed" ? "처리 완료" : "호출 확인"}</button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
