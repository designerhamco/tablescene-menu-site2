"use client";

import { useActionState } from "react";

import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import type { PickupQueueEntry } from "@/lib/server/pickup-queue-service";

import {
  createPickupQueueAction,
  transitionPickupQueueAction,
  type PickupQueueActionState,
} from "./actions";
import { Badge } from "@/app/components/ui/badge";

const initialPickupQueueActionState: PickupQueueActionState = {
  status: "idle",
  message: "",
};

const STATUS_LABELS = {
  waiting: "준비 중",
  ready: "픽업 요청",
  completed: "수령 완료",
  cancelled: "취소",
} as const;

export default function PickupQueueDashboard({
  menuSiteId,
  slug,
  businessDate,
  entries,
}: {
  menuSiteId: string;
  slug: string;
  businessDate: string;
  entries: PickupQueueEntry[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createPickupQueueAction,
    initialPickupQueueActionState,
  );
  const activeEntries = entries.filter((entry) => entry.status === "waiting" || entry.status === "ready");
  const completedEntries = entries.filter((entry) => entry.status === "completed" || entry.status === "cancelled");

  return (
    <div className="space-y-6">
      <ActionFeedbackToast
        message={createState.message}
        tone={createState.status === "success" ? "success" : "error"}
        eventKey={createState}
      />
      <section className="site-section p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="type-content-title">수동 대기번호 등록</h3>
            <p className="mt-2 text-copy font-medium leading-relaxed text-zinc-500">
              POS 연동 없이 번호만 등록합니다. 결제·주문 데이터와는 연결되지 않습니다.
            </p>
          </div>
          <a
            href={`/pickup/${encodeURIComponent(slug)}`}
            target="_blank"
            rel="noreferrer"
            className="text-copy font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
          >
            고객 대기판 열기
          </a>
        </div>
        <form action={createAction} className="mt-5 flex max-w-md gap-2">
          <input type="hidden" name="menuSiteId" value={menuSiteId} />
          <label className="sr-only" htmlFor="queueNumber">대기번호</label>
          <input
            id="queueNumber"
            name="queueNumber"
            type="number"
            inputMode="numeric"
            min={1}
            max={9999}
            required
            placeholder="대기번호 입력"
            className="site-field min-w-0 flex-1 border-zinc-200 px-4 py-3 transition-colors"
          />
          <button
            type="submit"
            disabled={createPending}
            className="site-button site-button-primary"
          >
            {createPending ? "등록 중" : "등록"}
          </button>
        </form>
        {createState.message ? (
          <p className={createState.status === "error" ? "site-notice site-notice-error mt-3 p-3" : "site-notice site-notice-success mt-3 p-3"} role="status">
            {createState.message}
          </p>
        ) : null}
      </section>

      <section className="site-section">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 md:px-6">
          <div>
            <h3 className="type-content-title">오늘 운영 현황</h3>
            <p className="mt-1 text-support font-medium text-zinc-400">{businessDate} · 활성 {activeEntries.length}건</p>
          </div>
        </div>
        {activeEntries.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {activeEntries.map((entry) => <QueueEntryRow key={entry.id} menuSiteId={menuSiteId} entry={entry} />)}
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-copy font-medium text-zinc-400">진행 중인 대기번호가 없습니다.</p>
        )}
      </section>

      <section className="site-section">
        <div className="border-b border-zinc-100 px-5 py-4 md:px-6">
          <h3 className="type-content-title">오늘 처리 이력</h3>
        </div>
        {completedEntries.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {completedEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                <span className="type-content-title">{entry.queueNumber}</span>
                <span className="text-support font-medium text-zinc-400">{STATUS_LABELS[entry.status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-copy font-medium text-zinc-400">처리 이력이 없습니다.</p>
        )}
      </section>
    </div>
  );
}

function QueueEntryRow({ menuSiteId, entry }: { menuSiteId: string; entry: PickupQueueEntry }) {
  const [state, action, pending] = useActionState(transitionPickupQueueAction, initialPickupQueueActionState);
  const nextStatus = entry.status === "waiting" ? "ready" : "completed";
  const nextLabel = entry.status === "waiting" ? "픽업 요청" : "수령 완료";
  return (
    <li className="px-5 py-4 md:px-6">
      <ActionFeedbackToast
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
        eventKey={state}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="min-w-14 type-metric">{entry.queueNumber}</span>
          <Badge
          >
            {STATUS_LABELS[entry.status]}
          </Badge>
        </div>
        <form action={action} className="flex gap-2">
          <input type="hidden" name="menuSiteId" value={menuSiteId} />
          <input type="hidden" name="entryId" value={entry.id} />
          <button
            type="submit"
            name="nextStatus"
            value="cancelled"
            disabled={pending}
            className="site-button site-button-outline"
          >
            취소
          </button>
          <button
            type="submit"
            name="nextStatus"
            value={nextStatus}
            disabled={pending}
            className="site-button site-button-primary"
          >
            {pending ? "처리 중" : nextLabel}
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={state.status === "error" ? "site-notice site-notice-error mt-2 p-3" : "site-notice site-notice-success mt-2 p-3"} role="status">
          {state.message}
        </p>
      ) : null}
    </li>
  );
}
