"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Maximize2 } from "lucide-react";

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

function getFullscreenSnapshot() {
  return Boolean(document.fullscreenElement);
}

function getServerFullscreenSnapshot() {
  return false;
}

export default function PreviewFullscreenControl() {
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    getFullscreenSnapshot,
    getServerFullscreenSnapshot,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => { /* The browser may already be exiting. */ });
      }
    };
    document.addEventListener("keydown", exitOnEscape);
    return () => document.removeEventListener("keydown", exitOnEscape);
  }, []);

  const enterFullscreen = async () => {
    setErrorMessage(null);

    try {
      if (document.fullscreenElement) return;

      if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) {
        setErrorMessage("이 브라우저에서는 전체화면을 사용할 수 없습니다.");
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch {
      setErrorMessage("브라우저의 전체화면 권한을 확인해 주세요.");
    }
  };

  return (
    <div
      className="fixed bottom-[max(6rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-[1600] flex max-w-[min(24rem,calc(100vw-2rem))] flex-col items-start gap-2 rounded-xl bg-white/95 p-3 text-zinc-950 shadow-lg backdrop-blur sm:bottom-[max(1rem,env(safe-area-inset-bottom))]"
      data-preview-fullscreen-control=""
    >
      {errorMessage ? (
        <p className="rounded-lg bg-zinc-950/90 px-3 py-2 text-support font-medium text-white shadow-lg backdrop-blur" role="status">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
      {!isFullscreen ? <button
        type="button"
        onClick={enterFullscreen}
        aria-label="전체화면 보기"
        title="전체화면 보기"
        className="site-button site-button-primary inline-flex items-center justify-center backdrop-blur"
      >
        <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        <span>전체화면 보기</span>
      </button> : null}
      <a href="/guides" target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">이용 가이드</a>
      </div>
      <p className="type-body-sm">전체화면에서 나가려면 <strong>ESC</strong>를 눌러주세요.</p>
      <p className="type-body-sm">주소창이 가려지지 않으면 이용 가이드를 참고해 주세요.</p>
    </div>
  );
}
