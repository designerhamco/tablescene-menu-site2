"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Maximize2 } from "lucide-react";
import BrowserZoomGuide from "./MenuPreviewGuide";
import styles from "./PreviewFullscreenControl.module.css";

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}
const getFullscreenSnapshot = () => Boolean(document.fullscreenElement);
const getServerFullscreenSnapshot = () => false;

export default function PreviewFullscreenControl() {
  const isFullscreen = useSyncExternalStore(subscribeFullscreen, getFullscreenSnapshot, getServerFullscreenSnapshot);
  const [guideOpen, setGuideOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (guideOpen && !isFullscreen) {
      if (dialog && !dialog.open) {
        dialog.showModal();
        titleRef.current?.focus({ preventScroll: true });
        dialog.scrollTop = 0;
      }
    } else if (dialog?.open) dialog.close();
  }, [guideOpen, isFullscreen]);

  useEffect(() => {
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => { /* Native exit may already be in progress. */ });
      }
    };
    document.addEventListener("keydown", exitOnEscape);
    return () => document.removeEventListener("keydown", exitOnEscape);
  }, []);

  const enterFullscreen = async () => {
    setErrorMessage(null);
    if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) {
      setErrorMessage("이 브라우저에서는 전체화면을 사용할 수 없습니다. 이용 가이드를 참고해 주세요.");
      setGuideOpen(true);
      return;
    }
    // Close the guide before requesting fullscreen in the same user gesture.
    dialogRef.current?.close();
    setGuideOpen(false);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setErrorMessage("브라우저의 전체화면 권한을 확인해 주세요.");
      setGuideOpen(true);
    }
  };

  if (isFullscreen) return null;

  return <>
    <div className={styles.dock} data-preview-fullscreen-control="">
      <button type="button" onClick={enterFullscreen} className="site-button site-button-primary">
        <Maximize2 className="h-4 w-4" aria-hidden="true" />전체화면 보기
      </button>
      <button type="button" onClick={() => setGuideOpen(true)} className="site-button site-button-outline">화면 보기 안내</button>
    </div>
    <dialog ref={dialogRef} aria-labelledby="actual-preview-guide-title" aria-describedby="actual-preview-guide-description"
      className={styles.dialog} data-preview-actual-guide=""
      onCancel={(event) => { event.preventDefault(); setGuideOpen(false); }}>
      <div className={styles.content}>
        <h2 ref={titleRef} tabIndex={-1} className="type-content-title outline-none" id="actual-preview-guide-title">실제 화면 보기 안내</h2>
        <p className="type-body" id="actual-preview-guide-description">브라우저 오른쪽 상단의 더보기(⋮) 버튼을 누른 뒤, 확대·축소로 메뉴판의 표시 비율을 시험해 보세요.</p>
        <div className={styles.browser}><BrowserZoomGuide /></div>
        <p className="type-body-sm">전체화면에서 나가려면 <strong>ESC</strong>를 눌러주세요. 주소창이 가려지지 않으면 이용 가이드를 참고해 주세요.</p>
        {errorMessage ? <p className="type-body-sm text-red-700" role="status">{errorMessage}</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={enterFullscreen} className="site-button site-button-primary">전체화면 보기</button>
          <a href="/guides" target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">이용 가이드</a>
          <button type="button" onClick={() => setGuideOpen(false)} className="site-button site-button-outline">닫기</button>
        </div>
      </div>
    </dialog>
  </>;
}
