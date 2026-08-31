"use client";

import {
  Bell,
  CheckCircle2,
  ConciergeBell,
  Droplets,
  Loader2,
  ReceiptText,
  Shirt,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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

function getCallItemPresentation(key: string) {
  switch (key) {
    case "staff":
      return { icon: ConciergeBell, description: "직원을 조용히 불러드려요." };
    case "water":
      return { icon: Droplets, description: "물을 준비해 드려요." };
    case "apron":
      return { icon: Shirt, description: "앞치마를 준비해 드려요." };
    case "tableware":
      return { icon: UtensilsCrossed, description: "필요한 식기를 준비해 드려요." };
    case "table_cleanup":
      return { icon: Sparkles, description: "테이블 정리를 요청해요." };
    case "order_help":
      return { icon: ReceiptText, description: "메뉴 설명과 추가 주문을 도와드려요." };
    default:
      return { icon: Bell, description: "직원에게 요청을 전달해요." };
  }
}

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
            className={`max-h-[min(820px,calc(100dvh-40px))] w-full overflow-y-auto rounded-t-[2rem] p-6 pb-[max(24px,env(safe-area-inset-bottom))] text-zinc-950 shadow-[0_-24px_70px_rgba(3,9,20,0.26)] sm:max-w-[520px] sm:px-7 ${isAube ? "bg-[#fbfaf7]" : "bg-white"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-call-title"
            data-smart-call-dialog=""
            initial={prefersReducedMotion ? false : { opacity: 0, y: 72, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 44, scale: 0.99 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.56, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isAube ? "text-[#9a7338]" : "text-emerald-700"}`}>{tableLabel || "현재 테이블"}</p>
            <h2 id="staff-call-title" className="mt-2 text-[1.7rem] font-semibold tracking-[-0.035em]">무엇을 도와드릴까요?</h2>
          </div>
          <button type="button" onClick={closeDialog} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eeeae2] text-zinc-700 transition-colors hover:bg-[#e3ded4]" aria-label="직원 호출 닫기">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {call ? (
          <div className="mt-6 rounded-[1.6rem] border border-[#ddcfb6] bg-[#f5efe4] p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#9a7338]" strokeWidth={1.6} aria-hidden="true" />
            <p className="mt-3 text-lg font-semibold">{STATUS_COPY[call.status]}</p>
            <p className="mt-1 text-sm font-medium text-[#72552d]">
              {call.requestLabel} · 호출 #{call.callNumber}
            </p>
            {call.status === "pending" ? (
              <button type="button" onClick={cancelCall} disabled={pending} className="mt-5 rounded-full border border-[#cdbb9c] bg-white px-5 py-2.5 text-sm font-semibold text-[#5d4525] disabled:opacity-60">
                호출 취소
              </button>
            ) : (
              <p className="mt-4 text-xs font-medium text-[#72552d]">직원이 확인한 뒤에는 손님이 취소할 수 없습니다.</p>
            )}
            <p className="mt-4 text-xs font-medium text-[#8b7657]">처리 완료 또는 취소 후 2분 뒤 다시 호출할 수 있습니다.</p>
          </div>
        ) : (
          <div className="mt-6">
            <p className="break-keep text-sm font-medium leading-relaxed text-zinc-600">
              필요한 항목을 선택해 주세요. 직접 입력 없이 준비된 요청만 직원에게 전달됩니다.
            </p>
            <div className="mt-4 grid gap-2.5" role="group" aria-label="직원 호출 항목">
                {availableItems.map((item) => {
                  const selected = item.key === selectedItem?.key;
                  const itemPresentation = getCallItemPresentation(item.key);
                  const ItemIcon = itemPresentation.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={selected}
                      className={`flex items-center gap-4 rounded-[1.35rem] border px-4 py-3.5 text-left transition-[border-color,background-color,transform] duration-300 ${selected ? "border-[#b58c4b] bg-[#f3ebdd] text-zinc-950" : "border-[#e5dfd5] bg-white text-zinc-700 hover:-translate-y-0.5 hover:border-[#cdbb9c]"}`}
                      onClick={() => setSelectedItemKey(item.key)}
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[#b58c4b] text-white" : "bg-[#f1eee8] text-[#9a7338]"}`}>
                        <ItemIcon className="h-5 w-5" strokeWidth={1.65} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold tracking-[-0.015em]">{item.label}</span>
                        <span className={`mt-0.5 block text-xs font-medium leading-relaxed ${selected ? "text-[#71542d]" : "text-zinc-500"}`}>{itemPresentation.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            <button type="button" onClick={requestCall} disabled={pending || !selectedItem} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#101b2d] px-5 py-4 text-base font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0">
              {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Bell className="h-5 w-5" aria-hidden="true" />}
              {selectedItem ? `${selectedItem.label} 보내기` : "호출 항목 없음"}
            </button>
          </div>
        )}

        {previewOnly ? (
          <p className="mt-4 rounded-2xl bg-[#edf3f6] px-4 py-3 text-xs font-medium leading-relaxed text-[#385164]">
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
