"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Monitor, MousePointerClick, Smartphone, Tablet, ZoomIn } from "lucide-react";

import {
  buildMenuPreviewUrl,
  buildTemplatePreviewUrl,
  getMenuPreviewFrame,
  MENU_PREVIEW_DEVICES,
  MENU_PREVIEW_ORIENTATIONS,
  type MenuPreviewDevice,
  type MenuPreviewOrientation,
  type MenuPreviewQuery,
  type TemplatePreviewQuery,
} from "@/lib/menu-preview-devices";

type MenuPreviewDeviceFrameProps = {
  device: MenuPreviewDevice;
  orientation: MenuPreviewOrientation;
  menuId: string;
  query: MenuPreviewQuery;
  templateKey?: never;
} | {
  device: MenuPreviewDevice;
  orientation: MenuPreviewOrientation;
  templateKey: string;
  query: TemplatePreviewQuery;
  menuId?: never;
};

const PREVIEW_GUIDE_DATE_KEY = "artimenu:menu-preview-guide-hidden-date";
const PREVIEW_GUIDE_SESSION_KEY = "artimenu:menu-preview-guide-closed";

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function subscribePreviewGuide() {
  return () => undefined;
}

function shouldShowPreviewGuide() {
  return window.localStorage.getItem(PREVIEW_GUIDE_DATE_KEY) !== getTodayKey()
    && window.sessionStorage.getItem(PREVIEW_GUIDE_SESSION_KEY) !== "1";
}

function PreviewDeviceIcon({ device }: { device: MenuPreviewDevice }) {
  if (device === "tablet") return <Tablet aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />;
  if (device === "mobile") return <Smartphone aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />;
  return <Monitor aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />;
}

export default function MenuPreviewDeviceFrame(props: MenuPreviewDeviceFrameProps) {
  const { device, orientation, query } = props;
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isGuideDismissed, setIsGuideDismissed] = useState(false);
  const shouldShowGuide = useSyncExternalStore(subscribePreviewGuide, shouldShowPreviewGuide, () => false);
  const isGuideOpen = shouldShowGuide && !isGuideDismissed;
  const frame = getMenuPreviewFrame(device, orientation);
  const orientationLabel = device === "tablet" ? MENU_PREVIEW_ORIENTATIONS[orientation] : null;
  const buildPreviewUrl = (options: {
    device?: MenuPreviewDevice;
    orientation?: MenuPreviewOrientation;
    embedded?: boolean;
    actual?: boolean;
  }) => {
    if (typeof props.templateKey === "string") {
      return buildTemplatePreviewUrl(props.templateKey, query as TemplatePreviewQuery, options);
    }

    if (typeof props.menuId === "string") {
      return buildMenuPreviewUrl(props.menuId, query as MenuPreviewQuery, options);
    }

    throw new Error("미리보기 대상을 확인할 수 없습니다.");
  };
  const embeddedUrl = buildPreviewUrl({
    actual: true,
    embedded: true,
    device,
    orientation,
  });
  const showToolbar = isToolbarOpen || isGuideOpen;

  function closeGuide() {
    window.sessionStorage.setItem(PREVIEW_GUIDE_SESSION_KEY, "1");
    setIsGuideDismissed(true);
  }

  function hideGuideToday() {
    window.localStorage.setItem(PREVIEW_GUIDE_DATE_KEY, getTodayKey());
    window.sessionStorage.setItem(PREVIEW_GUIDE_SESSION_KEY, "1");
    setIsGuideDismissed(true);
  }

  return (
    <main className="h-screen overflow-hidden bg-zinc-100 text-zinc-950">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center"
        onMouseLeave={() => setIsToolbarOpen(false)}
      >
        <div
          aria-hidden="true"
          className="pointer-events-auto hidden h-5 w-full lg:block"
          onMouseEnter={() => setIsToolbarOpen(true)}
        />
        <header
          className={`pointer-events-auto flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-zinc-950/72 p-2 text-white backdrop-blur-xl transition-all duration-300 ease-out ${
            showToolbar ? "translate-y-0 opacity-100" : "-translate-y-[calc(100%+1.25rem)] opacity-0"
          }`}
          onMouseEnter={() => setIsToolbarOpen(true)}
        >
          <nav aria-label="미리보기 기기 선택" className="flex items-center gap-1">
              {(Object.keys(MENU_PREVIEW_DEVICES) as MenuPreviewDevice[]).map((candidate) => {
                const candidateFrame = MENU_PREVIEW_DEVICES[candidate];
                const isSelected = candidate === device;

                return (
                  <Link
                    key={candidate}
                    href={buildPreviewUrl({
                      device: candidate,
                      orientation: candidate === "tablet" ? orientation : undefined,
                    })}
                    scroll={false}
                    aria-current={isSelected ? "page" : undefined}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                      isSelected ? "bg-white text-zinc-950" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <PreviewDeviceIcon device={candidate} />
                    {candidateFrame.label}
                  </Link>
                );
              })}
          </nav>
            {device === "tablet" ? (
              <nav aria-label="태블릿 방향 선택" className="flex items-center gap-1 border-l border-white/20 pl-2">
                {(Object.keys(MENU_PREVIEW_ORIENTATIONS) as MenuPreviewOrientation[]).map((candidate) => {
                  const isSelected = candidate === orientation;

                  return (
                    <Link
                      key={candidate}
                      href={buildPreviewUrl({ device, orientation: candidate })}
                      scroll={false}
                      aria-current={isSelected ? "page" : undefined}
                      className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                        isSelected ? "bg-white text-zinc-950" : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {MENU_PREVIEW_ORIENTATIONS[candidate]}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          <button
            type="button"
            onClick={() => setIsToolbarOpen(false)}
            aria-label="기기 선택 도구 닫기"
            className="grid h-9 w-9 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
      </div>

      <button
        type="button"
        onClick={() => setIsToolbarOpen((open) => !open)}
        aria-expanded={showToolbar}
        aria-label={showToolbar ? "기기 선택 도구 닫기" : "기기 선택 도구 열기"}
        className={`fixed left-1/2 top-2 z-[79] grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border border-zinc-950/10 bg-white/75 text-zinc-950 backdrop-blur transition-opacity ${showToolbar ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>

      <section
        className={device === "pc" ? "h-screen w-screen overflow-hidden" : "h-screen overflow-auto px-4 py-16"}
        aria-label={`${frame.label}${orientationLabel ? ` ${orientationLabel}` : ""} 메뉴판 미리보기`}
      >
        <div
          className={device === "pc"
            ? "h-screen w-screen overflow-hidden bg-white"
            : "mx-auto overflow-hidden rounded-[28px] border-[10px] border-zinc-900 bg-white shadow-2xl"}
          style={device === "pc" ? undefined : { width: frame.width + 20, height: frame.height + 20 }}
        >
          <iframe
            key={embeddedUrl}
            src={embeddedUrl}
            title={`${frame.label}${orientationLabel ? ` ${orientationLabel}` : ""} 메뉴판 미리보기`}
            className="h-full w-full border-0 bg-white"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>

      {isGuideOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/76 px-5 py-20 text-white backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="preview-guide-title">
          <div className="relative w-full max-w-xl">
            <div className="absolute -top-16 left-1/2 h-12 w-px -translate-x-1/2 bg-white/65" aria-hidden="true">
              <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white bg-zinc-950" />
            </div>
            <div className="rounded-[2rem] border border-white/15 bg-zinc-950/88 p-6 backdrop-blur-xl sm:p-8">
              <p className="text-sm font-bold text-white/55">메뉴판 미리보기 안내</p>
              <h1 id="preview-guide-title" className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">기기별 화면을 간편하게 확인해 보세요.</h1>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
                  <MousePointerClick className="h-5 w-5 text-[#F8E731]" aria-hidden="true" />
                  <p className="mt-4 font-bold leading-relaxed">상단의 PC·태블릿·모바일 버튼으로 기기별 메뉴판 모습을 확인할 수 있어요.</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
                  <ZoomIn className="h-5 w-5 text-[#F8E731]" aria-hidden="true" />
                  <p className="mt-4 font-bold leading-relaxed">브라우저의 더보기 메뉴에서 확대·축소를 조절하면 전체 비율을 더 편하게 볼 수 있어요.</p>
                </div>
              </div>
              <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={hideGuideToday} className="rounded-xl px-4 py-3 text-sm font-bold text-white/65 transition-colors hover:bg-white/10 hover:text-white">오늘 하루 보지 않기</button>
                <button type="button" onClick={closeGuide} className="rounded-xl bg-[#F8E731] px-5 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-[#ffef55]">미리보기 시작</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
