/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";
import { menuPopupSuppressionKey, nextMenuPopupMidnight, type MenuPopupSettings } from "@/lib/menu-popup";
import styles from "./MenuAdvertisementPopup.module.css";

export default function MenuAdvertisementPopup({ menuId, settings, preview = false }: { menuId: string; settings: MenuPopupSettings; preview?: boolean }) {
  const t = useMenuText();
  const [open, setOpen] = useState(false), [today, setToday] = useState(false), [active, setActive] = useState(0), [drag, setDrag] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null);
  const signature = JSON.stringify(settings);
  useEffect(() => {
    let hiddenUntil = 0;
    if (!preview) { try { hiddenUntil = Number(localStorage.getItem(menuPopupSuppressionKey(menuId))) || 0; } catch { /* Private browsing may deny storage. */ } }
    const id = requestAnimationFrame(() => { setActive(0); setToday(false); setOpen(settings.enabled && settings.images.length > 0 && (preview || hiddenUntil <= Date.now())); });
    return () => cancelAnimationFrame(id);
  }, [menuId, preview, signature, settings.enabled, settings.images.length]);
  function close() {
    if (today && !preview) { try { localStorage.setItem(menuPopupSuppressionKey(menuId), String(nextMenuPopupMidnight(Date.now()))); } catch { /* Closing must still work without storage. */ } }
    setOpen(false);
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current; pointer.current = null; setDrag(0);
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2) setActive(index => Math.max(0, Math.min(settings.images.length - 1, index + (dx < 0 ? 1 : -1))));
  }
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) close(); }}>
    <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content ref={popupRef} className={styles.popup} data-menu-advertisement-popup onOpenAutoFocus={event => { event.preventDefault(); popupRef.current?.focus(); }}>
      <Dialog.Title className={styles.srOnly}>{t("매장 소식")}</Dialog.Title>
      <Dialog.Description className={styles.srOnly}>{t("매장의 안내와 혜택을 확인하세요.")}</Dialog.Description>
      <button type="button" className={styles.x} onClick={close} aria-label={t("닫기")}><X size={22} strokeWidth={1.6} /></button>
      <div className={styles.viewport} role="region" aria-label={t("매장 소식")} tabIndex={0}
        onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); setActive(index => Math.max(0, Math.min(settings.images.length - 1, index + (e.key === "ArrowRight" ? 1 : -1)))); } }}
        onPointerDown={e => { if (e.button !== 0 || settings.images.length < 2) return; pointer.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { const start = pointer.current; if (start?.id === e.pointerId) setDrag(Math.max(-90, Math.min(90, e.clientX - start.x))); }}
        onPointerUp={endDrag} onPointerCancel={() => { pointer.current = null; setDrag(0); }}>
        <div className={styles.slides} style={{ transform: `translateX(calc(${-active * 100}% + ${drag}px))`, transition: drag !== 0 ? "none" : undefined }}>
          {settings.images.map((image, index) => <div className={styles.slide} key={image.imageUrl + index} aria-hidden={index !== active}><img src={image.imageUrl} alt={t("매장 소식 {0}", index + 1)} draggable={false} /></div>)}
        </div>
      </div>
      {settings.images.length > 1 ? <div className={styles.dots} data-popup-dots aria-label={t("광고 이미지 선택")}>{settings.images.map((_, index) => <button type="button" key={index} data-active={index === active} aria-label={t("이미지 {0}", index + 1)} aria-current={index === active ? "true" : undefined} onClick={() => setActive(index)}><span /></button>)}</div> : null}
      <footer className={styles.footer}><label><input type="checkbox" checked={today} onChange={e => setToday(e.target.checked)} />{t("오늘 하루 보지 않기")}</label><button type="button" onClick={close}>{t("닫기")}</button></footer>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
