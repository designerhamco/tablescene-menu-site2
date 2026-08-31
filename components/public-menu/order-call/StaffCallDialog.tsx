"use client";

import {
  Loader2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect, useMemo, useState } from "react";

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
  presentation = "default",
}: {
  open: boolean;
  onClose: () => void;
  menuSiteId: string;
  tableLabel?: string;
  previewOnly?: boolean;
  callItems?: StaffCallItem[];
  presentation?: "default" | "aube";
}) {
  const [call, setCall] = useState<StaffCall | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const availableItems = useMemo(
    () => (callItems?.length ? callItems : getDefaultStaffCallItems()).filter((item) => item.active),
    [callItems],
  );
  const [selectedItemKey, setSelectedItemKey] = useState(availableItems[0]?.key ?? "staff");
  const selectedItem = availableItems.find((item) => item.key === selectedItemKey) ?? availableItems[0];

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

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
      setMessage("화면 미리보기에서 호출을 취소했습니다. 실제 메뉴판에서는 2분 뒤 다시 호출할 수 있습니다.");
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

  const isAube = presentation === "aube";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-end justify-center bg-[#07101f]/55 px-0 pt-10 backdrop-blur-[5px] sm:px-5"
          role="presentation"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.36, ease: [0.16, 1, 0.3, 1] }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <motion.section
            className={`max-h-[min(760px,calc(100dvh-40px))] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 pb-[max(24px,env(safe-area-inset-bottom))] text-zinc-950 shadow-[0_-24px_70px_rgba(3,9,20,0.22)] sm:max-w-[500px] sm:px-8 ${isAube ? "font-[Pretendard]" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-call-title"
            data-smart-call-dialog=""
            initial={prefersReducedMotion ? false : isAube ? { opacity: 0, y: -34, scale: 0.992 } : { opacity: 0, y: 72, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={isAube ? { opacity: 0, y: -18, scale: 0.996 } : { opacity: 0, y: 44, scale: 0.99 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : isAube ? 0.72 : 0.56, ease: [0.16, 1, 0.3, 1] }}
            drag={isAube && !prefersReducedMotion ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.32 }}
            dragMomentum={false}
            onDragEnd={(_event, info: PanInfo) => {
              if (isAube && (info.offset.y > 90 || info.velocity.y > 620)) closeDialog();
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
        {isAube ? (
          <button type="button" onClick={closeDialog} className="mx-auto mb-6 flex h-4 w-16 items-center justify-center" aria-label="직원 호출 닫기">
            <span className="block h-[3px] w-12 rounded-full bg-zinc-300" aria-hidden="true" />
          </button>
        ) : <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" aria-hidden="true" />}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-medium uppercase tracking-[0.2em] ${isAube ? "text-[#c5a165]" : "text-emerald-700"}`}>{tableLabel || "현재 테이블"}</p>
            <h2 id="staff-call-title" className={`mt-2 tracking-[-0.035em] ${isAube ? "text-[1.55rem] font-medium" : "text-[1.7rem] font-semibold"}`}>무엇을 도와드릴까요?</h2>
          </div>
          {!isAube ? (
            <button type="button" onClick={closeDialog} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200" aria-label="직원 호출 닫기">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {call ? (
          <div className={`mt-6 p-6 text-center ${isAube ? "border-y border-[#c5a165] bg-white" : "rounded-[1.6rem] border border-zinc-200 bg-zinc-50"}`}>
            <p className="text-lg font-medium">{STATUS_COPY[call.status]}</p>
            <p className={`mt-1 text-sm font-medium ${isAube ? "text-[#c5a165]" : "text-zinc-600"}`}>
              {call.requestLabel} · 호출 #{call.callNumber}
            </p>
            {call.status === "pending" ? (
              <button type="button" onClick={cancelCall} disabled={pending} className={`mt-5 rounded-full border bg-white px-5 py-2.5 text-sm font-medium disabled:opacity-60 ${isAube ? "border-[#c5a165] text-[#c5a165]" : "border-zinc-300 text-zinc-700"}`}>
                호출 취소
              </button>
            ) : (
              <p className="mt-4 text-xs font-medium text-zinc-500">직원이 확인한 뒤에는 손님이 취소할 수 없습니다.</p>
            )}
            <p className="mt-4 text-xs font-medium text-zinc-500">처리 완료 또는 취소 후 2분 뒤 다시 호출할 수 있습니다.</p>
          </div>
        ) : (
          <div className="mt-6">
            <div className={isAube ? "border-y border-zinc-200" : "grid gap-2.5"} role="group" aria-label="직원 호출 항목">
                {availableItems.map((item) => {
                  const selected = item.key === selectedItem?.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={selected}
                      className={isAube
                        ? `flex min-h-14 w-full items-center justify-between border-b border-zinc-200 px-1 py-4 text-left text-[15px] font-medium transition-colors last:border-b-0 ${selected ? "text-[#c5a165]" : "text-zinc-800 hover:text-[#c5a165]"}`
                        : `flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition-colors ${selected ? "border-zinc-900 text-zinc-950" : "border-zinc-200 text-zinc-700 hover:border-zinc-400"}`}
                      onClick={() => setSelectedItemKey(item.key)}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            <button type="button" onClick={requestCall} disabled={pending || !selectedItem} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-[15px] font-medium text-white transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 ${isAube ? "bg-[#c5a165]" : "bg-zinc-950"}`}>
              {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
              {selectedItem ? `${selectedItem.label} 보내기` : "호출 항목 없음"}
            </button>
          </div>
        )}

        {previewOnly ? (
          <p className="mt-4 text-center text-[11px] font-medium leading-relaxed text-zinc-400">
            미리보기 화면입니다. 버튼을 눌러도 실제 직원 호출은 전송되지 않습니다.
          </p>
        ) : null}

        {message ? <p className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700" role="status">{message}</p> : null}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
