/* eslint-disable @next/next/no-img-element */
"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";
import type { MenuPopupSettings } from "@/lib/menu-popup";
import styles from "./MenuAdvertisementPopup.module.css";

const SLIDE_DURATION_MS = 5000;
const CIRCUMFERENCE = 2 * Math.PI * 5;

export default function MenuAdvertisementPopup({ settings }: { settings: MenuPopupSettings }) {
  const t = useMenuText();
  const [open, setOpen] = useState(false), [active, setActive] = useState(0), [drag, setDrag] = useState(0);
  const [progress, setProgress] = useState(0), [reset, setReset] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null);
  const hovered = useRef(false), keyboardFocus = useRef(false);
  const count = settings.images.length;
  const signature = JSON.stringify(settings);
  useEffect(() => {
    const id = requestAnimationFrame(() => { hovered.current = false; keyboardFocus.current = false; pointer.current = null; setActive(0); setProgress(0); setDrag(0); setOpen(settings.enabled && count > 0); });
    return () => cancelAnimationFrame(id);
  }, [signature, settings.enabled, count]);
  const go = useCallback((index: number) => {
    if (!count) return;
    setActive((index + count) % count); setProgress(0); setReset(value => value + 1);
  }, [count]);
  useEffect(() => {
    if (!open || count < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0, elapsed = 0, last = performance.now(), painted = last;
    const tick = (now: number) => {
      if (!hovered.current && !keyboardFocus.current && !pointer.current && document.visibilityState === "visible") elapsed += Math.min(100, now - last);
      last = now;
      if (elapsed >= SLIDE_DURATION_MS) { go(active + 1); return; }
      if (now - painted >= 50) { setProgress(elapsed / SLIDE_DURATION_MS); painted = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, active, reset, count, go, signature]);
  function close() { setOpen(false); }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current; pointer.current = null; setDrag(0);
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2) go(active + (dx < 0 ? 1 : -1));
  }
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) close(); }}>
    <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content ref={popupRef} className={styles.popup} data-menu-advertisement-popup data-popup-active={active} data-popup-progress={progress.toFixed(2)}
      onPointerEnter={event => { if (event.pointerType === "mouse") hovered.current = true; }} onPointerLeave={() => { hovered.current = false; }}
      onFocusCapture={event => { keyboardFocus.current = event.target !== event.currentTarget && event.target.matches(":focus-visible"); }} onBlurCapture={() => { keyboardFocus.current = false; }}
      onOpenAutoFocus={event => { event.preventDefault(); popupRef.current?.focus(); }}>
      <Dialog.Title className={styles.srOnly}>{t("매장 소식")}</Dialog.Title>
      <Dialog.Description className={styles.srOnly}>{t("매장의 안내와 혜택을 확인하세요.")}</Dialog.Description>
      <button type="button" className={styles.x} onClick={close} aria-label={t("닫기")}><X size={22} strokeWidth={1.6} /></button>
      <div className={styles.viewport} role="region" aria-label={t("매장 소식")} tabIndex={0}
        onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); event.stopPropagation(); go(active + (event.key === "ArrowRight" ? 1 : -1)); } }}
        onPointerDown={event => { if (event.button !== 0 || count < 2) return; pointer.current = { x: event.clientX, y: event.clientY, id: event.pointerId }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => { const start = pointer.current; if (start?.id === event.pointerId) setDrag(Math.max(-90, Math.min(90, event.clientX - start.x))); }}
        onPointerUp={endDrag} onPointerCancel={() => { pointer.current = null; setDrag(0); }}>
        <div className={styles.slides} style={{ transform: `translateX(calc(${-active * 100}% + ${drag}px))`, transition: drag !== 0 ? "none" : undefined }}>
          {settings.images.map((image, index) => <div className={styles.slide} key={image.imageUrl + index} aria-hidden={index !== active}><img src={image.imageUrl} alt={t("매장 소식 {0}", index + 1)} draggable={false} /></div>)}
        </div>
        {count > 1 ? <>
          <button type="button" className={`${styles.arrow} ${styles.previous}`} data-popup-prev aria-label={t("이전 광고")} onPointerDown={event => event.stopPropagation()} onClick={() => go(active - 1)}><ChevronLeft size={24} strokeWidth={1.6} /></button>
          <button type="button" className={`${styles.arrow} ${styles.next}`} data-popup-next aria-label={t("다음 광고")} onPointerDown={event => event.stopPropagation()} onClick={() => go(active + 1)}><ChevronRight size={24} strokeWidth={1.6} /></button>
          <div className={styles.dots} data-popup-dots aria-label={t("광고 이미지 선택")}>{settings.images.map((_, index) => <button type="button" key={index} data-active={index === active} aria-label={t("이미지 {0}", index + 1)} aria-current={index === active ? "true" : undefined} onPointerDown={event => event.stopPropagation()} onClick={() => go(index)}>
            <span />{index === active ? <svg viewBox="0 0 14 14" aria-hidden="true" className={styles.progress}><circle cx="7" cy="7" r="5" className={styles.progressTrack} /><circle cx="7" cy="7" r="5" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - progress)} /></svg> : null}
          </button>)}</div>
        </> : null}
      </div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
