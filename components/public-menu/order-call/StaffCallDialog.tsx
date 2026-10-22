"use client";
import { useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";

import {
  Check,
  Loader2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

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
  status: "pending" | "acknowledged" | "completed" | "cancelled";
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
  completed: "직원 요청이 처리되었습니다.",
  cancelled: "직원 호출이 취소되었습니다.",
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
  const t = useMenuText();
  const [call, setCall] = useState<StaffCall | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  const listRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [hasMoreItems, setHasMoreItems] = useState(false);
  const availableItems = useMemo(
    () => orderStaffCallItemsForGuest(
      (callItems?.length ? callItems : getDefaultStaffCallItems()).filter((item) => item.active),
    ),
    [callItems],
  );
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([availableItems[0]?.key ?? "staff"]);
  // Preview and live reception share the same single-choice contract.
  const selectedItems = availableItems.filter(item => selectedItemKeys.includes(item.key));
  const selectedItem = selectedItems[0];

  useEffect(() => {
    const list = listRef.current;
    const items = itemsRef.current;
    if (!open || call || !list || !items) return;
    const update = () => setHasMoreItems(list.scrollHeight - list.clientHeight - list.scrollTop > 1);
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(list);
    observer.observe(items);
    list.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      list.removeEventListener("scroll", update);
    };
  }, [open, call, availableItems]);

  function selectItem(key: string) {
    setSelectedItemKeys([key]);
  }

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

  const activeCallId = call && (call.status === "pending" || call.status === "acknowledged") ? call.callId : null;
  useEffect(() => {
    if (!open || previewOnly || !activeCallId || pending) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let terminal = false;
    let failures = 0;
    let sequence = 0;
    async function read() {
      if (disposed || document.visibilityState === "hidden" || terminal) return;
      const requestSequence = ++sequence;
      controller = new AbortController();
      try {
        const result = await fetch(`/api/public-menu/calls?${new URLSearchParams({menuSiteId, callId: activeCallId!})}`,
          {cache: "no-store", credentials: "same-origin", signal: controller.signal});
        const body = await result.json() as {ok?: boolean; call?: {callId: string; status: StaffCall["status"]}};
        if (disposed || requestSequence !== sequence) return;
        terminal = [401, 403, 404].includes(result.status);
        if (terminal) {
          setCall(null);
          setMessage(t("호출 상태를 확인할 수 없습니다. 테이블 방문 상태를 확인해 주세요."));
          return;
        }
        if (!result.ok || !body.ok || body.call?.callId !== activeCallId
          || !Object.hasOwn(STATUS_COPY, body.call.status)) throw new Error("CALL_STATUS_READ_FAILED");
        const status = body.call.status;
        failures = 0;
        setCall(current => current?.callId === activeCallId ? {...current, status} : current);
      } catch (error) {
        if (!disposed && requestSequence === sequence && !(error instanceof Error && error.name === "AbortError")) failures++;
      } finally {
        if (!disposed && requestSequence === sequence && !terminal) timer = setTimeout(read, Math.min(30000, 5000 * 2 ** failures));
      }
    }
    function resume() {
      clearTimeout(timer);
      sequence++;
      controller?.abort();
      if (document.visibilityState !== "hidden") void read();
    }
    queueMicrotask(() => {if (!disposed) void read();});
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => {
      disposed = true;
      clearTimeout(timer);
      sequence++;
      controller?.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, [activeCallId, menuSiteId, open, pending, previewOnly, t]);

  function closeDialog() {
    setMessage(null);
    onClose();
  }

  async function requestCall() {
    if (pending || !selectedItem) return;
    setPending(true);
    setMessage(null);
    if (previewOnly) {
      setCall({
        callId: "preview-call",
        callNumber: 12,
        status: "pending",
        duplicate: false,
        requestKey: selectedItem.key,
        requestLabel: selectedItems.map(item => item.label).join(" · "),
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
        throw new Error(body.message || t("직원 호출을 전송하지 못했습니다."));
      }
      setCall(body.call);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("직원 호출을 전송하지 못했습니다."));
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
      setMessage(t("화면 미리보기에서 호출을 취소했습니다. 실제 메뉴판에서는 2분 뒤 다시 호출할 수 있습니다."));
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
      if (!result.ok || !body.ok) throw new Error(body.message || t("호출을 취소하지 못했습니다."));
      setCall(null);
      setMessage(t("직원 호출을 취소했습니다. 2분 뒤 다시 호출할 수 있습니다."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("호출을 취소하지 못했습니다."));
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
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.32 }}
            dragMomentum={false}
            onDragEnd={(_event, info: PanInfo) => {
              if (isAube && (info.offset.y > 90 || info.velocity.y > 620)) closeDialog();
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {isAube ? (
              <button type="button" onClick={closeDialog} onPointerDown={event => dragControls.start(event)} className={styles.handleControl} aria-label={t("직원 호출 닫기")}>
                <span className={ui.handle} aria-hidden="true" />
              </button>
            ) : <div className={`${ui.handle} ${styles.handle}`} aria-hidden="true" />}
            <div className={styles.header}>
              <div>
                <p className={styles.table}>{tableLabel || t("현재 테이블")}</p>
                <h2 id="staff-call-title">{t("무엇을 도와드릴까요?")}</h2>
              </div>
              <button type="button" onClick={closeDialog} className={ui.close} aria-label={t("직원 호출 닫기")}>
                <X aria-hidden="true" />
              </button>
            </div>
            {call ? (
              <div className={styles.status} data-call-status>
                <p className={styles.statusTitle}>{t(STATUS_COPY[call.status])}</p>
                <p className={styles.request}>{t(call.requestLabel)} {t(" · 호출 #")}{call.callNumber}</p>
                {call.status === "pending" ? (
                  <button type="button" onClick={cancelCall} disabled={pending} className={`${styles.cancel} ${ui.secondary}`}>
                    {t("호출 취소")}</button>
                ) : call.status === "acknowledged" ? <p className={styles.help}>{t("직원이 확인한 뒤에는 손님이 취소할 수 없습니다.")}</p> : (
                  <button type="button" onClick={() => setCall(null)} className={`${styles.cancel} ${ui.secondary}`}>
                    {t("다른 요청 선택")}
                  </button>
                )}
                <p className={styles.help}>{t("처리 완료 또는 취소 후 2분 뒤 다시 호출할 수 있습니다.")}</p>
              </div>
            ) : (
              <div className={styles.content}>
                <p className={styles.selectionHelp} id="staff-call-selection-help">
                  {t("요청할 항목을 하나 선택해 주세요.")}
                </p>
                <div className={styles.listWindow} data-call-more={hasMoreItems}>
                  <div ref={listRef} className={styles.listViewport} data-call-list-scroll>
                    <div ref={itemsRef} className={styles.items} role="group" aria-label={t("직원 호출 항목")} aria-describedby="staff-call-selection-help">
                      {availableItems.map(item => {
                        const selected = selectedItemKeys.includes(item.key);
                        return <button key={item.key} type="button" aria-pressed={selected} disabled={pending}
                          onClick={() => selectItem(item.key)}>
                          <span>{t(item.label)}</span>
                          {selected ? <Check size={18} aria-hidden="true" /> : null}
                        </button>;
                      })}
                    </div>
                  </div>
                  <div className={styles.listFade} aria-hidden="true" data-call-list-fade />
                </div>
                <button type="button" onClick={requestCall} disabled={pending || !selectedItem}
                  className={`${styles.submit} ${ui.primary}`} data-smart-call-submit>
                  {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
                  {selectedItem ? t("{0} 보내기", t(selectedItem.label)) : t("요청할 항목을 선택해 주세요")}
                </button>
              </div>
            )}
            {previewOnly ? <p className={styles.preview}>{t("미리보기 화면입니다. 버튼을 눌러도 실제 직원 호출은 전송되지 않습니다.")}</p> : null}
            {message ? <p className={styles.message} role="status">{message}</p> : null}

          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
