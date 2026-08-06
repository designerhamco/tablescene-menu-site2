"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import type { CallDashboardPageData } from "@/lib/server/call-management-service";

import { initialCallManagementActionState, mutateCallAction } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "대기 중",
  acknowledged: "확인됨",
  completed: "완료",
  cancelled: "손님 취소",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-rose-50 text-rose-800",
  acknowledged: "bg-amber-50 text-amber-800",
  completed: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-zinc-100 text-zinc-600",
};

export default function CallDashboard({
  menuSiteId,
  calls,
}: {
  menuSiteId: string;
  calls: CallDashboardPageData["calls"];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(mutateCallAction, initialCallManagementActionState);
  const unresolvedCount = calls.filter((call) => call.status === "pending" || call.status === "acknowledged").length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !pending) router.refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [pending, router]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-black text-zinc-900">처리할 호출 {unresolvedCount.toLocaleString("ko-KR")}건 · 최근 이력 {calls.length.toLocaleString("ko-KR")}건</p>
          <p className="mt-1 text-xs font-bold text-zinc-500">15초마다 자동 갱신하며, 상태 변경은 서버에서 권한과 현재 상태를 다시 확인합니다.</p>
        </div>
        <button type="button" onClick={() => router.refresh()} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-black hover:bg-zinc-100">
          지금 새로고침
        </button>
      </div>

      {state.status !== "idle" && state.message ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm font-bold ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {state.message}
        </p>
      ) : null}

      {calls.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm font-bold text-zinc-500">아직 접수된 직원 호출이 없습니다.</p>
      ) : calls.map((call) => (
        <article key={call.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black">호출 #{call.callNumber}</h2>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">{call.tableLabel}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_STYLES[call.status] ?? "bg-zinc-100 text-zinc-700"}`}>{STATUS_LABELS[call.status] ?? call.status}</span>
              </div>
              <p className="mt-2 text-xs font-bold text-zinc-400">{new Date(call.createdAt).toLocaleString("ko-KR")} · 직원 호출</p>
            </div>
            {call.nextStatus ? (
              <form action={action}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="callId" value={call.id} />
                <input type="hidden" name="nextStatus" value={call.nextStatus} />
                <button disabled={pending} className={`min-w-32 rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-60 ${call.nextStatus === "completed" ? "bg-emerald-800" : "bg-zinc-950"}`}>
                  {call.nextStatus === "completed" ? "처리 완료" : "호출 확인"}
                </button>
              </form>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
