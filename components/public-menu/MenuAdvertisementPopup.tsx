/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";
import type { MenuPopupSettings } from "@/lib/menu-popup";
import styles from "./MenuAdvertisementPopup.module.css";

export default function MenuAdvertisementPopup({ settings }: { settings: MenuPopupSettings }) {
  const t = useMenuText();
  const [open, setOpen] = useState(false), [active, setActive] = useState(0), [drag, setDrag] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null);
  const signature = JSON.stringify(settings);
  useEffect(() => {
    const id = requestAnimationFrame(() => { setActive(0); setDrag(0); setOpen(settings.enabled && settings.images.length > 0); });
    return () => cancelAnimationFrame(id);
  }, [signature, settings.enabled, settings.images.length]);
  function close() { setOpen(false); }
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
        {settings.images.length > 1 ? <div className={styles.dots} data-popup-dots aria-label={t("광고 이미지 선택")}>{settings.images.map((_, index) => <button type="button" key={index} data-active={index === active} aria-label={t("이미지 {0}", index + 1)} aria-current={index === active ? "true" : undefined} onPointerDown={event => event.stopPropagation()} onClick={() => setActive(index)}><span /></button>)}</div> : null}
      </div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
