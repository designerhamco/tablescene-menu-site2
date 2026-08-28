"use client";

import { Bell, CheckCircle2, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { getDefaultStaffCallItems, type StaffCallItem } from "@/lib/call-items";

type StaffCall = {
  callId: string;
  callNumber: number;
  status: "pending" | "acknowledged";
  duplicate: boolean;
  requestKey: string;
  requestLabel: string;
};

type ApiResult = {
  ok?: boolean;
  message?: string;
  call?: StaffCall | { callId: string; status: "cancelled" };
};

const STATUS_COPY = {
  pending: "직원에게 호출을 보냈습니다.",
  acknowledged: "직원이 호출을 확인했습니다.",
} as const;

export default function StaffCallDialog({
  open,
  onClose,
  menuSiteId,
  tableLabel,
  previewOnly = false,
  callItems,
}: {
  open: boolean;
  onClose: () => void;
  menuSiteId: string;
  tableLabel?: string;
  previewOnly?: boolean;
  callItems?: StaffCallItem[];
}) {
  const [call, setCall] = useState<StaffCall | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const availableItems = useMemo(
    () => (callItems?.length ? callItems : getDefaultStaffCallItems()).filter((item) => item.active),
    [callItems],
  );
  const [selectedItemKey, setSelectedItemKey] = useState(availableItems[0]?.key ?? "staff");
  const selectedItem = availableItems.find((item) => item.key === selectedItemKey) ?? availableItems[0];

  if (!open) return null;

  function closeDialog() {
    setMessage(null);
    onClose();
  }

  async function requestCall() {
    setPending(true);
    setMessage(null);
    if (previewOnly) {
      setCall({
        callId: "preview-call",
        callNumber: 12,
        status: "pending",
        duplicate: false,
        requestKey: selectedItem?.key ?? "staff",
        requestLabel: selectedItem?.label ?? "직원 호출",
      });
      setPending(false);
      return;
    }
    try {
      const result = await fetch("/api/public-menu/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuSiteId, callItemKey: selectedItem?.key }),
      });
      const body = await result.json() as ApiResult;
      if (!result.ok || !body.ok || !body.call || !("callNumber" in body.call)) {
        throw new Error(body.message || "직원 호출을 전송하지 못했습니다.");
      }
      setCall(body.call);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원 호출을 전송하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function cancelCall() {
    if (!call || call.status !== "pending") return;
    setPending(true);
    setMessage(null);
    if (previewOnly) {
      setCall(null);
      setMessage("화면 미리보기에서 호출을 취소했습니다. 실제 요청은 전송되지 않았습니다.");
      setPending(false);
      return;
    }
    try {
      const result = await fetch("/api/public-menu/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuSiteId, callId: call.callId }),
      });
      const body = await result.json() as ApiResult;
      if (!result.ok || !body.ok) throw new Error(body.message || "호출을 취소하지 못했습니다.");
      setCall(null);
      setMessage("직원 호출을 취소했습니다. 2분 뒤 다시 호출할 수 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "호출을 취소하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeDialog();
    }}>
      <section className="w-full max-w-md rounded-t-[2rem] bg-white p-6 text-zinc-950 shadow-2xl sm:rounded-[2rem]" role="dialog" aria-modal="true" aria-labelledby="staff-call-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{tableLabel || "현재 테이블"}</p>
            <h2 id="staff-call-title" className="mt-2 text-2xl font-black">직원 호출</h2>
          </div>
          <button type="button" onClick={closeDialog} className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100" aria-label="직원 호출 닫기">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {call ? (
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" aria-hidden="true" />
            <p className="mt-3 text-lg font-black">{STATUS_COPY[call.status]}</p>
            <p className="mt-1 text-sm font-bold text-emerald-800">
              {call.requestLabel} · 호출 #{call.callNumber}
            </p>
            {call.status === "pending" ? (
              <button type="button" onClick={cancelCall} disabled={pending} className="mt-5 rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-black text-emerald-900 disabled:opacity-60">
                호출 취소
              </button>
            ) : (
              <p className="mt-4 text-xs font-bold text-emerald-800">직원이 확인한 뒤에는 손님이 취소할 수 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <p className="break-keep text-sm font-bold leading-relaxed text-zinc-600">
              필요한 항목을 선택해 직원에게 요청해 주세요. 처리 중인 호출은 중복 접수되지 않습니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="직원 호출 항목">
                {availableItems.map((item) => {
                  const selected = item.key === selectedItem?.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={selected}
                      className={`rounded-2xl border px-3 py-3 text-sm font-black transition-colors ${selected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600"}`}
                      onClick={() => setSelectedItemKey(item.key)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            <button type="button" onClick={requestCall} disabled={pending || !selectedItem} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-4 text-base font-black text-white disabled:opacity-60">
              {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Bell className="h-5 w-5" aria-hidden="true" />}
              {selectedItem ? `${selectedItem.label} 보내기` : "호출 항목 없음"}
            </button>
          </div>
        )}

        {previewOnly ? (
          <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-bold leading-relaxed text-sky-800">
            미리보기 화면입니다. 버튼을 눌러도 실제 직원 호출은 전송되지 않습니다.
          </p>
        ) : null}

        {message ? <p className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700" role="status">{message}</p> : null}
      </section>
    </div>
  );
}
