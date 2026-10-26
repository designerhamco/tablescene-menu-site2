"use client";

import { useState, useSyncExternalStore } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

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

  const toggleFullscreen = async () => {
    setErrorMessage(null);

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

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
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-[1600] flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2"
      data-preview-fullscreen-control=""
    >
      {errorMessage ? (
        <p className="rounded-lg bg-zinc-950/90 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur" role="status">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "전체화면 종료" : "전체화면으로 보기"}
        title={isFullscreen ? "전체화면 종료" : "전체화면으로 보기"}
        className="site-button site-button-primary inline-flex items-center justify-center backdrop-blur"
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        <span className={isFullscreen ? "sr-only" : "hidden sm:inline"}>
          {isFullscreen ? "전체화면 종료" : "전체화면"}
        </span>
      </button>
    </div>
  );
}
