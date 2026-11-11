"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Maximize2, X } from "@/app/components/ui/site-icon";
import BrowserZoomGuide from "./MenuPreviewGuide";
import {getMenuPreviewAccessDevice,subscribeMenuPreviewAccess} from "@/lib/menu-preview-access-device";
import styles from "./PreviewFullscreenControl.module.css";

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}
const getFullscreenSnapshot = () => Boolean(document.fullscreenElement);
const getServerFullscreenSnapshot = () => false;

// Detect touch guidance independently of viewport width: landscape iPads can be
// wider than PC windows, and iPad Safari can advertise a desktop user agent.
function subscribeEnvironment(onChange: () => void) {
  const unsubscribe=subscribeMenuPreviewAccess(onChange);
  document.addEventListener("fullscreenchange",onChange);
  return () => {unsubscribe();document.removeEventListener("fullscreenchange",onChange);};
}
function getEnvironmentSnapshot() {
  const fullscreen = Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  return `${getMenuPreviewAccessDevice()}:${fullscreen ? "fullscreen" : "windowed"}`;
}
const getServerEnvironmentSnapshot = () => null;

export default function PreviewFullscreenControl() {
  const isFullscreen = useSyncExternalStore(subscribeFullscreen, getFullscreenSnapshot, getServerFullscreenSnapshot);
  const environment = useSyncExternalStore(subscribeEnvironment, getEnvironmentSnapshot, getServerEnvironmentSnapshot);
  const desktop = environment?.startsWith("desktop:") ?? false;
  const fullscreenSupported = environment?.endsWith(":fullscreen") ?? false;
  const [guideRequested, setGuideOpen] = useState<boolean | null>(null);
  const guideOpen = guideRequested ?? (desktop && fullscreenSupported);
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
  }, [guideOpen, isFullscreen, environment]);

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
  if (environment === null || environment.startsWith("phone:")) return null;

  return <>
    <div className={styles.dock} data-preview-fullscreen-control="">
      {fullscreenSupported ? <button type="button" onClick={enterFullscreen} className="site-button site-button-primary">
        <Maximize2 className="h-4 w-4" aria-hidden="true" />전체화면 보기
      </button> : null}
      <button type="button" onClick={() => setGuideOpen(true)} className="site-button site-button-outline">화면 보기 안내</button>
    </div>
    <dialog ref={dialogRef} aria-labelledby="actual-preview-guide-title"
      className={styles.dialog} data-preview-actual-guide=""
      onCancel={(event) => { event.preventDefault(); setGuideOpen(false); }}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 ref={titleRef} tabIndex={-1} className="type-content-title outline-none" id="actual-preview-guide-title">실제 화면 보기 안내</h2>
          <button type="button" onClick={() => setGuideOpen(false)} className="site-button site-button-ghost site-button-icon" aria-label="안내 닫기">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className={styles.sections} data-columns={desktop ? "two" : "one"}>
          {desktop ? <section className={styles.section} aria-labelledby="actual-preview-zoom-title">
            <h3 className="type-item-title" id="actual-preview-zoom-title">브라우저 확대·축소</h3>
            <p className="type-body-sm">브라우저 오른쪽 상단의 더보기(⋮) 버튼을 누른 뒤, 확대·축소로 메뉴판 크기를 조절해 보세요.</p>
            <div className={styles.browser}><BrowserZoomGuide /></div>
          </section> : null}
          <section className={styles.section} aria-labelledby="actual-preview-fullscreen-title">
            <h3 className="type-item-title" id="actual-preview-fullscreen-title">전체화면 보기</h3>
            {fullscreenSupported ? <>
            <p className="type-body-sm">아래 버튼을 누르면 주소창을 숨기고 메뉴판만 화면 가득 보여줍니다.</p>
            <button type="button" onClick={enterFullscreen} className="site-button site-button-primary">전체화면 보기</button>
            <p className="type-body-sm">{desktop ? <>일반 화면으로 돌아오려면 <strong>ESC</strong>를 눌러주세요.</> : "일반 화면으로 돌아오려면 브라우저의 전체화면 종료 기능을 사용해 주세요."}</p>
            <div className={styles.help}>
              <p className="type-body-sm text-zinc-600">주소창이 가려지지 않으면 이용 가이드를 참고해 주세요.</p>
              <a href="/guides" target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">이용 가이드</a>
            </div>
            </> : <p className="type-body-sm">현재 브라우저에서는 전체화면을 지원하지 않습니다. 메뉴판은 현재 화면 크기에 맞게 표시됩니다.</p>}
            {errorMessage ? <p className="type-body-sm text-red-700" role="status">{errorMessage}</p> : null}
          </section>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={() => setGuideOpen(false)} className="site-button site-button-outline">닫기</button>
        </div>
      </div>
    </dialog>
  </>;
}
