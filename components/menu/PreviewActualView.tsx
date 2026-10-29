"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { Maximize2, X } from "lucide-react";
import styles from "./PreviewActualView.module.css";

/** Request fullscreen in the original click, before navigation can lose activation. */
export default function PreviewActualView({ href, tabIndex }: { href: string; tabIndex?: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const wasFullscreen = useRef(false);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(true);

  const close = async () => {
    if (document.fullscreenElement === screenRef.current) {
      try { await document.exitFullscreen(); } catch { /* Native exit may already be in progress. */ }
    }
    dialogRef.current?.close();
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement === screenRef.current) wasFullscreen.current = true;
      else if (wasFullscreen.current) dialogRef.current?.close();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const showActualView = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    wasFullscreen.current = false;
    flushSync(() => { setOpen(true); setNotice(true); });
    dialogRef.current?.showModal();
    const screen = screenRef.current;
    if (document.fullscreenEnabled && screen?.requestFullscreen) {
      // Do not await iframe load: fullscreen requires this same user activation.
      void screen.requestFullscreen().catch(() => { /* Actual view and guide remain available. */ });
    }
  };

  return <>
    <a ref={linkRef} href={href} target="_blank" rel="noopener noreferrer" onClick={showActualView}
      aria-label="실제 화면 보기" title="실제 화면 보기" data-preview-detached-link=""
      tabIndex={tabIndex} className="site-preview-control">
      <Maximize2 className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      <span className="hidden min-[430px]:inline">실제 화면 보기</span>
    </a>
    <dialog ref={dialogRef} aria-label="메뉴판 실제 화면" className={styles.dialog}
      onCancel={(event) => { event.preventDefault(); void close(); }}
      onClose={() => {
        setOpen(false);
        wasFullscreen.current = false;
        // The browser releases the fullscreen/modal top layer after the close event.
        requestAnimationFrame(() => linkRef.current?.focus());
      }}>
      <div ref={screenRef} className={styles.screen} data-preview-actual-screen="">
        {open ? <iframe src={href} title="목업 없는 메뉴판 실제 화면" allowFullScreen className={styles.menu} /> : null}
        {open ? <>
          <button type="button" className={`site-button site-button-primary ${styles.close}`} onClick={close} aria-label="실제 화면 닫기" autoFocus>
            <X className="h-4 w-4" aria-hidden="true" /><span className="sr-only">실제 화면 닫기</span>
          </button>
          {notice ? <aside className={styles.notice} aria-label="전체화면 이용 안내">
            <p className="type-body-sm">목업 없이 현재 기기의 화면 크기로 보여드립니다. 주소창이 가려지지 않으면 이용 가이드를 참고해 주세요.</p>
            <div className={styles.actions}>
              <a href="/guides" target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">이용 가이드</a>
              <button type="button" onClick={() => setNotice(false)} className="site-button site-button-primary">확인</button>
            </div>
          </aside> : null}
        </> : null}
      </div>
    </dialog>
  </>;
}
