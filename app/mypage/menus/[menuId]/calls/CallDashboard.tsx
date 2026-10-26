"use client";

import { FilterPanel, RecordCard } from "@/app/components/ui/data-display";
import { Bell, Search } from "lucide-react";
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
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

const STATUS_LABELS: Record<string, string> = {
  pending: "미처리",
  acknowledged: "확인됨",
  completed: "처리 완료",
  cancelled: "손님 취소",
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

export default function CallDashboard({ menuSiteId, calls, callItems, callService = "basic" }: {
  menuSiteId: string;
  calls: CallDashboardPageData["calls"];
  callItems: CallDashboardPageData["callItems"];
  callService?: CallDashboardPageData["callService"];
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
    <Tabs variant="underline" value={activeTab} onValueChange={value => setActiveTab(value as "history" | "settings")} className="gap-4">
      <OperationalArrivalAlert
        menuSiteId={menuSiteId}
        kind="calls"
        arrivalIds={calls.filter((call) => call.status === "pending").map((call) => call.id)}
        onBackgroundPollingChange={setBackgroundPollingEnabled}
      />
      <ActionFeedbackToast message={state.message} tone={state.status === "success" ? "success" : "error"} eventKey={state} />

      <TabsList variant="underline" size="md" aria-label="호출관리 화면">
        <TabsTrigger value="history">호출 내역{unresolvedCount > 0 ? <span className="type-caption"> · 미처리 {unresolvedCount}</span> : null}</TabsTrigger>
        <TabsTrigger value="settings">호출 관리</TabsTrigger>
      </TabsList>

      {activeTab === "settings" ? (
        <TabsContent value="settings"><CallItemManager key={callItems.map((item) => `${item.key}:${item.label}:${item.sortOrder}:${item.active}`).join("|")} menuSiteId={menuSiteId} items={callItems} service={callService} /></TabsContent>
      ) : (
        <TabsContent value="history" className="space-y-4">
          <FilterPanel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-copy font-medium text-zinc-900">처리할 호출 {unresolvedCount.toLocaleString("ko-KR")}건 · 최근 이력 {calls.length.toLocaleString("ko-KR")}건</p>
                <p className="mt-1 text-support font-medium text-zinc-500">최신 호출부터 표시하며 15초마다 자동으로 갱신합니다.</p>
              </div>
              <button type="button" onClick={() => router.refresh()} className="site-button site-button-rounded site-button-secondary">지금 새로고침</button>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-[minmax(12rem,1fr)_auto_auto_auto]">
              <label className="relative block">
                <span className="sr-only">호출 내역 검색</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="테이블·요청·처리자 검색" className="site-field site-field-leading w-full" />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="상태 필터" className="site-field h-11 border-zinc-200 px-3 text-zinc-700">
                <option value="unresolved">미처리만</option>
                <option value="all">전체 상태</option>
                <option value="pending">접수 대기</option>
                <option value="acknowledged">확인됨</option>
                <option value="completed">처리 완료</option>
                <option value="cancelled">손님 취소</option>
              </select>
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="호출 날짜" className="site-field h-11 border-zinc-200 px-3 text-zinc-700" />
              <select value={handlerFilter} onChange={(event) => setHandlerFilter(event.target.value)} aria-label="처리자 필터" className="site-field h-11 min-w-36 border-zinc-200 px-3 text-zinc-700">
                <option value="">모든 처리자</option>
                {handlerOptions.map((handler) => <option key={handler} value={handler}>{handler}</option>)}
              </select>
            </div>
          </FilterPanel>

          {state.status !== "idle" && state.message ? <p className={`site-notice   px-4 py-3 text-copy font-medium ${state.status === "success" ? "site-notice-success" : "site-notice-error"}`}>{state.message}</p> : null}

          {calls.length === 0 ? (
            <EmptyState headingLevel={3} icon={<Bell />} title="아직 접수된 직원 호출이 없습니다." description="호출이 접수되면 이곳에 표시됩니다." />
          ) : filteredCalls.length === 0 ? (
            <EmptyState headingLevel={3} icon={<Bell />} title="조건에 맞는 호출 내역이 없습니다." description="검색·상태·날짜·처리자 조건을 확인해주세요." />
          ) : filteredCalls.map((call) => (
            <RecordCard key={call.id}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="type-subsection-title">{call.requestLabel}</h2>
                    <Badge>{call.tableLabel}</Badge>
                    <Badge>{STATUS_LABELS[call.status] ?? call.status}</Badge>
                  </div>
                  <p className="mt-2 text-support font-medium text-zinc-400">호출 #{call.callNumber} · 접수 {formatKoreanDateTime(call.createdAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-support font-semibold text-zinc-600">
                    {call.acknowledgedAt ? <span>확인 {call.acknowledgedByLabel ?? "직원"} · {formatKoreanDateTime(call.acknowledgedAt)}</span> : null}
                    {call.completedAt ? <span>완료 {call.completedByLabel ?? "직원"} · {formatKoreanDateTime(call.completedAt)}</span> : null}
                  </div>
                </div>
                {call.nextStatus ? (
                  <form action={action}>
                    <input type="hidden" name="menuSiteId" value={menuSiteId} />
                    <input type="hidden" name="callId" value={call.id} />
                    <input type="hidden" name="nextStatus" value={call.nextStatus} />
                    <button disabled={pending} className="site-button site-button-rounded site-button-primary">{call.nextStatus === "completed" ? "처리 완료" : "호출 확인"}</button>
                  </form>
                ) : null}
              </div>
            </RecordCard>
          ))}
        </TabsContent>
      )}
    </Tabs>
  );
}
