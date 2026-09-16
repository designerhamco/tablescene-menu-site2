"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Minus, Monitor, MoreVertical, Plus, Smartphone, Tablet } from "lucide-react";

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

const PREVIEW_GUIDE_DATE_KEY = "artimenu:menu-preview-guide-v3-hidden-date";
const PREVIEW_GUIDE_SESSION_KEY = "artimenu:menu-preview-guide-v3-closed";

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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

function GuideDeviceSelector({ device }: { device: MenuPreviewDevice }) {
  return (
    <div
      className="flex items-center gap-1 rounded-2xl border-2 border-[#42E6C4] bg-zinc-950/86 p-2 text-white ring-4 ring-[#42E6C4]/20 backdrop-blur-xl"
      aria-hidden="true"
    >
      {(Object.keys(MENU_PREVIEW_DEVICES) as MenuPreviewDevice[]).map((candidate) => {
        const candidateFrame = MENU_PREVIEW_DEVICES[candidate];
        const isSelected = candidate === device;

        return (
          <div
            key={candidate}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
              isSelected ? "bg-white text-zinc-950" : "text-white/75"
            }`}
          >
            <PreviewDeviceIcon device={candidate} />
            {candidateFrame.label}
          </div>
        );
      })}
      <ChevronUp className="mx-1 h-4 w-4 text-white/65" strokeWidth={1.8} />
    </div>
  );
}

function BrowserZoomGuide() {
  return (
    <div
      className="w-full overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white text-zinc-950 shadow-[0_18px_60px_rgba(0,0,0,0.2)]"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-3 py-3">
        <div className="h-7 flex-1 rounded-full border border-zinc-300 bg-white" />
        <div className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-bold text-zinc-600">게스트</div>
        <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-200">
          <MoreVertical className="h-4 w-4" />
        </div>
      </div>
      <div className="space-y-1 p-3 text-xs font-semibold text-zinc-600">
        <div className="rounded-lg px-3 py-2">새 탭</div>
        <div className="rounded-lg px-3 py-2">다운로드</div>
        <div className="rounded-lg border-2 border-[#42E6C4] bg-[#42E6C4]/10 px-3 py-2 text-zinc-950 ring-2 ring-[#42E6C4]/15">
          <div className="flex items-center justify-between gap-2">
            <span className="font-black">확대/축소</span>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white"><Minus className="h-3.5 w-3.5" /></span>
              <span className="tabular-nums">100%</span>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white"><Plus className="h-3.5 w-3.5" /></span>
            </div>
          </div>
        </div>
        <div className="rounded-lg px-3 py-2">인쇄</div>
        <div className="rounded-lg px-3 py-2">설정</div>
      </div>
    </div>
  );
}

function GuideCallout({
  children,
  pointer,
  className = "",
}: {
  children: React.ReactNode;
  pointer: "top" | "right";
  className?: string;
}) {
  return (
    <div className={`relative rounded-[1.5rem] border border-zinc-200 bg-white px-6 py-5 text-center text-base font-black leading-relaxed tracking-[-0.025em] text-zinc-950 shadow-[0_14px_45px_rgba(0,0,0,0.18)] ${className}`}>
      <span
        aria-hidden="true"
        className={pointer === "top"
          ? "absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rotate-45 border-l border-t border-zinc-200 bg-white"
          : "absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rotate-45 border-r border-t border-zinc-200 bg-white"}
      />
      <p className="relative">{children}</p>
    </div>
  );
}

export default function MenuPreviewDeviceFrame(props: MenuPreviewDeviceFrameProps) {
  const { device, orientation, query } = props;
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isGuideDismissed, setIsGuideDismissed] = useState(false);
  const [shouldShowGuide, setShouldShowGuide] = useState(false);
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
  const showToolbar = isToolbarOpen;

  useEffect(() => {
    function syncGuideVisibility() {
      setShouldShowGuide(shouldShowPreviewGuide());
    }

    const initialCheck = window.setTimeout(syncGuideVisibility, 0);
    window.addEventListener("storage", syncGuideVisibility);

    return () => {
      window.clearTimeout(initialCheck);
      window.removeEventListener("storage", syncGuideVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isGuideOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      window.sessionStorage.setItem(PREVIEW_GUIDE_SESSION_KEY, "1");
      setIsGuideDismissed(true);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isGuideOpen]);

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
        <div
          className="fixed inset-0 z-[100] overflow-hidden bg-zinc-950/60 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-guide-title"
          aria-describedby="preview-guide-description"
        >
          <h1 id="preview-guide-title" className="sr-only">메뉴판 미리보기 사용 안내</h1>
          <p id="preview-guide-description" className="sr-only">기기별 미리보기 버튼과 브라우저 확대 축소 기능을 안내합니다.</p>

          <div className="hidden lg:block" aria-hidden="true">
            <div className="absolute left-1/2 top-5 -translate-x-1/2">
              <GuideDeviceSelector device={device} />
            </div>
            <GuideCallout pointer="top" className="absolute left-1/2 top-[7.75rem] w-[27rem] -translate-x-1/2">
              PC·태블릿·모바일 버튼을 눌러<br />기기별 메뉴판을 확인할 수 있어요.
            </GuideCallout>

            <div className="absolute right-5 top-5 w-[17.5rem]">
              <BrowserZoomGuide />
            </div>
            <div className="absolute" style={{ right: "18.25rem", top: "17.25rem", width: "26rem" }}>
              <GuideCallout pointer="right">
                브라우저의 더보기(···)에서<br />확대·축소로 비율을 조절해 보세요.
              </GuideCallout>
            </div>
          </div>

          <div className="h-full overflow-y-auto px-4 pb-32 pt-4 lg:hidden" aria-hidden="true">
            <div className="mx-auto flex w-fit max-w-full scale-[0.92] justify-center sm:scale-100">
              <GuideDeviceSelector device={device} />
            </div>
            <GuideCallout pointer="top" className="mx-auto mt-5 max-w-md">
              PC·태블릿·모바일 버튼을 눌러<br className="hidden sm:block" /> 기기별 메뉴판을 확인할 수 있어요.
            </GuideCallout>
            <div className="mx-auto mt-8 w-full max-w-[18rem]">
              <BrowserZoomGuide />
            </div>
            <GuideCallout pointer="top" className="mx-auto mt-5 max-w-md">
              브라우저의 더보기(···)에서<br className="hidden sm:block" /> 확대·축소로 비율을 조절해 보세요.
            </GuideCallout>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-zinc-950/85 via-zinc-950/65 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-12">
            <div className="flex w-full max-w-md flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <button type="button" onClick={hideGuideToday} className="rounded-xl border border-white/30 bg-zinc-950/35 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">오늘 하루 보지 않기</button>
              <button type="button" onClick={closeGuide} autoFocus className="rounded-xl bg-[#F8E731] px-6 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-[#ffef55]">미리보기 시작</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
