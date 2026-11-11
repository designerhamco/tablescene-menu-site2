"use client";

import { ContentPanel } from "@/app/components/ui/content-panel";
import { TableCell } from "@/app/components/ui/table";
import OperationsHistoryTable from "@/components/mypage/OperationsHistoryTable";
import OperationsHistoryViews from "@/components/mypage/OperationsHistoryViews";
import type { OperationsFloorPlan } from "@/lib/operations-history";
import { SearchField } from "@/app/components/ui/search-field";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
} from "react";

import OperationalArrivalAlert from "@/components/mypage/OperationalArrivalAlert";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { shouldRefreshArrivalDashboard } from "@/lib/dashboard-arrival-alerts";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import type { CallDashboardPageData } from "@/lib/server/call-management-service";

import { initialCallManagementActionState } from "./action-state";
import { mutateCallAction } from "./actions";
import { Badge } from "@/app/components/ui/badge";

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

export default function CallDashboard({
  menuSiteId,
  calls,
  floorPlan,
}: {
  menuSiteId: string;
  calls: CallDashboardPageData["calls"];
  floorPlan: OperationsFloorPlan;
}) {
  const router = useRouter();
  const queryId = useId();
  const [refreshing, refresh] = useTransition();
  const [state, action, pending] = useActionState(
    mutateCallAction,
    initialCallManagementActionState,
  );
  const [backgroundPollingEnabled, setBackgroundPollingEnabled] =
    useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [handlerFilter, setHandlerFilter] = useState("");
  const unresolvedCount = calls.filter(
    (call) => call.status === "pending" || call.status === "acknowledged",
  ).length;

  const handlerOptions = useMemo(
    () =>
      [
        ...new Set(
          calls
            .flatMap((call) => [
              call.completedByLabel,
              call.acknowledgedByLabel,
            ])
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((left, right) => left.localeCompare(right, "ko-KR")),
    [calls],
  );

  const filteredCalls = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    return calls.filter((call) => {
      if (
        statusFilter === "unresolved" &&
        call.status !== "pending" &&
        call.status !== "acknowledged"
      )
        return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "unresolved" &&
        call.status !== statusFilter
      )
        return false;
      if (dateFilter && getKoreanDateKey(call.createdAt) !== dateFilter)
        return false;
      const handlers = [call.acknowledgedByLabel, call.completedByLabel].filter(
        (value): value is string => Boolean(value),
      );
      if (handlerFilter && !handlers.includes(handlerFilter)) return false;
      if (!normalizedQuery) return true;
      return [
        call.tableLabel,
        call.requestLabel,
        String(call.callNumber),
        ...handlers,
      ].some((value) =>
        value.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
      );
    });
  }, [calls, dateFilter, handlerFilter, query, statusFilter]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (
        shouldRefreshArrivalDashboard({
          pageVisible: document.visibilityState === "visible",
          browserNotificationsEnabled: backgroundPollingEnabled,
          mutationPending: pending,
        })
      )
        router.refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [backgroundPollingEnabled, pending, router]);

  function callAction(call: CallDashboardPageData["calls"][number]) {
    return call.nextStatus ? (
      <form action={action}>
        <input type="hidden" name="menuSiteId" value={menuSiteId} />
        <input type="hidden" name="callId" value={call.id} />
        <input type="hidden" name="nextStatus" value={call.nextStatus} />
        <button
          disabled={pending}
          className="site-button site-button-outline site-button-compact"
        >
          {call.nextStatus === "completed" ? "처리 완료" : "호출 확인"}
        </button>
      </form>
    ) : (
      <span className="type-body-sm site-copy-muted">처리 종료</span>
    );
  }
  return (
    <div className="site-stack-group">
      <OperationalArrivalAlert
        menuSiteId={menuSiteId}
        kind="calls"
        arrivalIds={calls
          .filter((call) => call.status === "pending")
          .map((call) => call.id)}
        onBackgroundPollingChange={setBackgroundPollingEnabled}
      />
      <ActionFeedbackToast
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
        eventKey={state}
      />
      <ContentPanel>
        <div className="site-content-heading-row">
          <div className="site-stack-title">
            <p className="type-label">
              처리할 호출 {unresolvedCount.toLocaleString("ko-KR")}건 · 최근
              이력 {calls.length.toLocaleString("ko-KR")}건
            </p>
          </div>
          <RefreshButton
            loading={refreshing}
            onClick={() => refresh(() => router.refresh())}
          />
        </div>
        <div className="site-form-row">
          <div className="site-field-stack">
            <label htmlFor={queryId} className="type-label">호출 내역 검색</label>
            <SearchField id={queryId} label="호출 내역 검색" value={query} onValueChange={setQuery} placeholder="테이블·요청·처리자 검색" />
          </div>
          <label className="site-field-stack">
            <span className="type-label">상태</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="site-field w-full"
            >
              <option value="unresolved">미처리만</option>
              <option value="all">전체 상태</option>
              <option value="pending">접수 대기</option>
              <option value="acknowledged">확인됨</option>
              <option value="completed">처리 완료</option>
              <option value="cancelled">손님 취소</option>
            </select>
          </label>
          <label className="site-field-stack">
            <span className="type-label">호출 날짜</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="site-field w-full"
            />
          </label>
          <label className="site-field-stack">
            <span className="type-label">처리자</span>
            <select
              value={handlerFilter}
              onChange={(event) => setHandlerFilter(event.target.value)}
              className="site-field w-full"
            >
              <option value="">모든 처리자</option>
              {handlerOptions.map((handler) => (
                <option key={handler} value={handler}>
                  {handler}
                </option>
              ))}
            </select>
          </label>
        </div>
      </ContentPanel>
      {state.message ? (
        <ContentPanel as="aside" surface="notice" density="compact">
          <p role="status" className="type-body-sm">
            {state.message}
          </p>
        </ContentPanel>
      ) : null}
      <OperationsHistoryViews
        noun="호출"
        floorPlan={floorPlan}
        records={filteredCalls.map((call) => ({
          id: call.id,
          pointId: call.tableId,
          pointLabel: call.tableLabel,
          summary: call.requestLabel,
          time: formatKoreanDateTime(call.createdAt),
          status: STATUS_LABELS[call.status] ?? call.status,
          attention:
            call.status === "pending" || call.status === "acknowledged",
        }))}
        renderList={(open) => <OperationsHistoryTable noun="호출" floorPlan={floorPlan} records={filteredCalls} renderRecord={call => <>
                      <TableCell>#{call.callNumber}</TableCell>
                      <TableCell>{call.requestLabel}</TableCell>
                      <TableCell>
                        {formatKoreanDateTime(call.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="site-stack-copy">
                          <Badge>
                            {STATUS_LABELS[call.status] ?? call.status}
                          </Badge>
                          {call.completedByLabel ?? call.acknowledgedByLabel}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="site-action-row">
                          {callAction(call)}
                          <button
                            type="button"
                            className="site-button site-button-outline site-button-compact"
                            onClick={() => open(call.id)}
                            aria-label={`호출 #${call.callNumber} 상세`}
                          >
                            상세
                          </button>
                        </div>
                      </TableCell>
        </>} />}
        renderDetail={(ids) => (
          <div className="site-stack-group">
            {filteredCalls
              .filter((call) => ids.includes(call.id))
              .map((call) => (
                <ContentPanel
                  as="article"
                  key={call.id}
                  aria-label={`호출 #${call.callNumber}`}
                >
                  <div className="site-content-heading-row">
                    <h3 className="type-content-title">{call.requestLabel}</h3>
                    <Badge>{STATUS_LABELS[call.status] ?? call.status}</Badge>
                  </div>
                  <p className="type-body-sm">
                    {call.tableLabel} · 호출 #{call.callNumber}
                  </p>
                  <p className="type-caption site-copy-muted">
                    접수 {formatKoreanDateTime(call.createdAt)}
                  </p>
                  {call.acknowledgedAt ? (
                    <p className="type-caption site-copy-muted">
                      확인 {call.acknowledgedByLabel ?? "직원"} ·{" "}
                      {formatKoreanDateTime(call.acknowledgedAt)}
                    </p>
                  ) : null}
                  {call.completedAt ? (
                    <p className="type-caption site-copy-muted">
                      완료 {call.completedByLabel ?? "직원"} ·{" "}
                      {formatKoreanDateTime(call.completedAt)}
                    </p>
                  ) : null}
                  {call.cancelledAt ? (
                    <p className="type-caption site-copy-muted">
                      손님 취소 {formatKoreanDateTime(call.cancelledAt)}
                    </p>
                  ) : null}
                  <div className="site-action-row">{callAction(call)}</div>
                </ContentPanel>
              ))}
          </div>
        )}
      />
    </div>
  );
}
