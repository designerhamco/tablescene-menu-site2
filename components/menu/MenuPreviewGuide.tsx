"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronUp, CircleUserRound, Minus, MoreVertical, Plus } from "lucide-react";

import {
  MENU_PREVIEW_DEVICES,
  type MenuPreviewDevice,
} from "@/lib/menu-preview-devices";

import PreviewDeviceIcon from "./PreviewDeviceIcon";

const PREVIEW_GUIDE_DATE_KEY = "artimenu:menu-preview-guide-v4-hidden-date";
const PREVIEW_GUIDE_SESSION_KEY = "artimenu:menu-preview-guide-v4-closed";

type MenuPreviewGuideProps = {
  device?: MenuPreviewDevice;
  variant?: "device" | "display";
};

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function shouldShowPreviewGuide() {
  return window.localStorage.getItem(PREVIEW_GUIDE_DATE_KEY) !== getTodayKey()
    && window.sessionStorage.getItem(PREVIEW_GUIDE_SESSION_KEY) !== "1";
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
        <div className="h-8 min-w-0 flex-1 rounded-full border border-zinc-200 bg-white shadow-inner" />
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-300 text-zinc-600">
          <CircleUserRound className="h-5 w-5 fill-zinc-500 text-zinc-500" strokeWidth={1.7} />
        </div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-200">
          <MoreVertical className="h-4 w-4" />
        </div>
      </div>
      <div className="space-y-1 p-3 text-xs font-semibold text-zinc-600">
        <div className="rounded-lg px-3 py-2">새 탭</div>
        <div className="rounded-lg px-3 py-2">다운로드</div>
        <div className="rounded-lg border-2 border-[#42E6C4] bg-[#42E6C4]/10 px-3 py-2 text-zinc-950 ring-2 ring-[#42E6C4]/15">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold">확대/축소</span>
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
  children: ReactNode;
  pointer: "top" | "right";
  className?: string;
}) {
  return (
    <div className={`relative rounded-[1.5rem] border border-zinc-200 bg-white px-6 py-5 text-center text-base font-bold leading-relaxed tracking-[-0.025em] text-zinc-950 shadow-[0_14px_45px_rgba(0,0,0,0.18)] ${className}`}>
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

export default function MenuPreviewGuide({ device = "pc", variant = "device" }: MenuPreviewGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hideTodayChecked, setHideTodayChecked] = useState(false);
  const isDisplayGuide = variant === "display";

  useEffect(() => {
    function syncGuideVisibility() {
      setIsOpen(shouldShowPreviewGuide());
    }

    const initialCheck = window.setTimeout(syncGuideVisibility, 0);
    window.addEventListener("storage", syncGuideVisibility);

    return () => {
      window.clearTimeout(initialCheck);
      window.removeEventListener("storage", syncGuideVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      window.sessionStorage.setItem(PREVIEW_GUIDE_SESSION_KEY, "1");
      setIsOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  function closeGuide() {
    if (hideTodayChecked) {
      window.localStorage.setItem(PREVIEW_GUIDE_DATE_KEY, getTodayKey());
    }
    window.sessionStorage.setItem(PREVIEW_GUIDE_SESSION_KEY, "1");
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-zinc-950/60 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-guide-title"
      aria-describedby="preview-guide-description"
      data-preview-guide-variant={variant}
    >
      <h1 id="preview-guide-title" className="type-page-title sr-only">메뉴판 미리보기 사용 안내</h1>
      <p id="preview-guide-description" className="sr-only">
        {isDisplayGuide
          ? "브라우저 확대 축소 기능을 안내합니다."
          : "기기별 미리보기 버튼과 브라우저 확대 축소 기능을 안내합니다."}
      </p>

      <div className="hidden lg:block" aria-hidden="true">
        {!isDisplayGuide ? (
          <>
            <div className="absolute left-1/2 top-5 -translate-x-1/2">
              <GuideDeviceSelector device={device} />
            </div>
            <GuideCallout pointer="top" className="absolute left-1/2 top-[7.75rem] w-[27rem] -translate-x-1/2">
              PC·태블릿·모바일 버튼을 눌러<br />기기별 메뉴판을 확인할 수 있어요.
            </GuideCallout>
          </>
        ) : null}

        <div className="absolute right-5 top-5 w-[17.5rem]">
          <BrowserZoomGuide />
        </div>
        <div className="absolute" style={{ right: "18.25rem", top: "17.25rem", width: "26rem" }}>
          <GuideCallout pointer="right">
            브라우저의 더보기(···)에서<br />확대·축소로 비율을 조절해 보세요.
          </GuideCallout>
        </div>
      </div>

      <div className="h-full overflow-y-auto px-4 pb-36 pt-4 lg:hidden" aria-hidden="true">
        {!isDisplayGuide ? (
          <>
            <div className="mx-auto flex w-fit max-w-full scale-[0.92] justify-center sm:scale-100">
              <GuideDeviceSelector device={device} />
            </div>
            <GuideCallout pointer="top" className="mx-auto mt-5 max-w-md">
              PC·태블릿·모바일 버튼을 눌러<br className="hidden sm:block" /> 기기별 메뉴판을 확인할 수 있어요.
            </GuideCallout>
          </>
        ) : null}
        <div className="mx-auto mt-8 w-full max-w-[18rem]">
          <BrowserZoomGuide />
        </div>
        <GuideCallout pointer="top" className="mx-auto mt-5 max-w-md">
          브라우저의 더보기(···)에서<br className="hidden sm:block" /> 확대·축소로 비율을 조절해 보세요.
        </GuideCallout>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-zinc-950/85 via-zinc-950/65 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-12">
        <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 px-2 py-3 text-sm font-bold text-white">
            <input
              type="checkbox"
              checked={hideTodayChecked}
              onChange={(event) => setHideTodayChecked(event.target.checked)}
              className="h-4 w-4 accent-[#F8E731]"
            />
            오늘 하루 보지 않기
          </label>
          <button type="button" onClick={closeGuide} autoFocus className="rounded-xl bg-[#F8E731] px-8 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-[#ffef55]">닫기</button>
        </div>
      </div>
    </div>
  );
}
