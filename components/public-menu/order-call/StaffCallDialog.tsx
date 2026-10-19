"use client";

import {
  Check,
  Loader2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import ui from "./MenuInteractionUI.module.css";
import styles from "./StaffCallDialog.module.css";
import {
  getDefaultStaffCallItems,
  orderStaffCallItemsForGuest,
  type StaffCallItem,
} from "@/lib/call-items";

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
  interactionStyle,
}: {
  open: boolean;
  onClose: () => void;
  menuSiteId: string;
  tableLabel?: string;
  previewOnly?: boolean;
  callItems?: StaffCallItem[];
  presentation?: "default" | "aube";
  interactionStyle?: CSSProperties;
}) {
  const [call, setCall] = useState<StaffCall | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const availableItems = useMemo(
    () => orderStaffCallItemsForGuest(
      (callItems?.length ? callItems : getDefaultStaffCallItems()).filter((item) => item.active),
    ),
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
          className={styles.backdrop}
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
            className={`${styles.dialog} ${ui.typography}`}
            style={interactionStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-call-title"
            data-smart-call-dialog=""
            initial={prefersReducedMotion ? false : { opacity: isAube ? 0.58 : 0, y: isAube ? "100%" : 72, scale: isAube ? 0.996 : 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isAube ? "60%" : 44, scale: isAube ? 0.998 : 0.99 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : isAube ? 0.78 : 0.56, ease: isAube ? [0.25, 0.1, 0.25, 1] : [0.16, 1, 0.3, 1] }}
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
              <button type="button" onClick={closeDialog} className={styles.handleControl} aria-label="직원 호출 닫기">
                <span className={ui.handle} aria-hidden="true" />
              </button>
            ) : <div className={`${ui.handle} ${styles.handle}`} aria-hidden="true" />}
            <div className={styles.header}>
              <div>
                <p className={styles.table}>{tableLabel || "현재 테이블"}</p>
                <h2 id="staff-call-title">무엇을 도와드릴까요?</h2>
              </div>
              <button type="button" onClick={closeDialog} className={ui.close} aria-label="직원 호출 닫기">
                <X aria-hidden="true" />
              </button>
            </div>
            {call ? (
              <div className={styles.status} data-call-status>
                <p className={styles.statusTitle}>{STATUS_COPY[call.status]}</p>
                <p className={styles.request}>{call.requestLabel} · 호출 #{call.callNumber}</p>
                {call.status === "pending" ? (
                  <button type="button" onClick={cancelCall} disabled={pending} className={`${styles.cancel} ${ui.secondary}`}>
                    호출 취소
                  </button>
                ) : <p className={styles.help}>직원이 확인한 뒤에는 손님이 취소할 수 없습니다.</p>}
                <p className={styles.help}>처리 완료 또는 취소 후 2분 뒤 다시 호출할 수 있습니다.</p>
              </div>
            ) : (
              <div className={styles.content}>
                <div className={styles.items} role="group" aria-label="직원 호출 항목">
                  {availableItems.map(item => {
                    const selected = item.key === selectedItem?.key;
                    return <button key={item.key} type="button" aria-pressed={selected}
                      onClick={() => setSelectedItemKey(item.key)}>
                      <span>{item.label}</span>
                      {selected ? <Check size={18} aria-hidden="true" /> : null}
                    </button>;
                  })}
                </div>
                <button type="button" onClick={requestCall} disabled={pending || !selectedItem}
                  className={`${styles.submit} ${ui.primary}`} data-smart-call-submit>
                  {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
                  {selectedItem ? `${selectedItem.label} 보내기` : "호출 항목 없음"}
                </button>
              </div>
            )}
            {previewOnly ? <p className={styles.preview}>미리보기 화면입니다. 버튼을 눌러도 실제 직원 호출은 전송되지 않습니다.</p> : null}
            {message ? <p className={styles.message} role="status">{message}</p> : null}

          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
