"use client";

import { useActionState } from "react";

import type { PickupQueueEntry } from "@/lib/server/pickup-queue-service";

import {
  createPickupQueueAction,
  initialPickupQueueActionState,
  transitionPickupQueueAction,
} from "./actions";

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
      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">MANUAL QUEUE</p>
            <h3 className="mt-2 text-xl font-black">수동 대기번호 등록</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
              POS 연동 없이 번호만 등록합니다. 결제·주문 데이터와는 연결되지 않습니다.
            </p>
          </div>
          <a
            href={`/pickup/${encodeURIComponent(slug)}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-black text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
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
            className="min-w-0 flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-base font-bold outline-none transition-colors focus:border-zinc-950"
          />
          <button
            type="submit"
            disabled={createPending}
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {createPending ? "등록 중" : "등록"}
          </button>
        </form>
        {createState.message ? (
          <p className={createState.status === "error" ? "mt-3 text-sm font-bold text-red-600" : "mt-3 text-sm font-bold text-emerald-700"} role="status">
            {createState.message}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 md:px-6">
          <div>
            <h3 className="text-lg font-black">오늘 운영 현황</h3>
            <p className="mt-1 text-xs font-bold text-zinc-400">{businessDate} · 활성 {activeEntries.length}건</p>
          </div>
        </div>
        {activeEntries.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {activeEntries.map((entry) => <QueueEntryRow key={entry.id} menuSiteId={menuSiteId} entry={entry} />)}
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-sm font-bold text-zinc-400">진행 중인 대기번호가 없습니다.</p>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4 md:px-6">
          <h3 className="text-lg font-black">오늘 처리 이력</h3>
        </div>
        {completedEntries.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {completedEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                <span className="text-lg font-black">{entry.queueNumber}</span>
                <span className="text-xs font-black text-zinc-400">{STATUS_LABELS[entry.status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm font-bold text-zinc-400">처리 이력이 없습니다.</p>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="min-w-14 text-3xl font-black tabular-nums">{entry.queueNumber}</span>
          <span className={entry.status === "ready"
            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800"
            : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600"}
          >
            {STATUS_LABELS[entry.status]}
          </span>
        </div>
        <form action={action} className="flex gap-2">
          <input type="hidden" name="menuSiteId" value={menuSiteId} />
          <input type="hidden" name="entryId" value={entry.id} />
          <button
            type="submit"
            name="nextStatus"
            value="cancelled"
            disabled={pending}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-black text-zinc-500 disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="submit"
            name="nextStatus"
            value={nextStatus}
            disabled={pending}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-black text-white disabled:bg-zinc-300"
          >
            {pending ? "처리 중" : nextLabel}
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={state.status === "error" ? "mt-2 text-xs font-bold text-red-600" : "mt-2 text-xs font-bold text-emerald-700"} role="status">
          {state.message}
        </p>
      ) : null}
    </li>
  );
}
