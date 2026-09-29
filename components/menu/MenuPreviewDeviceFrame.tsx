"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

import MenuPreviewGuide from "@/components/menu/MenuPreviewGuide";
import PreviewDeviceIcon from "@/components/menu/PreviewDeviceIcon";

import {
  buildMenuPreviewUrl,
  buildTemplatePreviewUrl,
  getMenuPreviewFrame,
  MENU_PREVIEW_DEVICE_ORDER,
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

function PreviewOrientationIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="currentColor"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 383.39 383.38"
    >
      <path
        d="M165.43,0c4.52,1.62,8.19,4.89,9.52,9.06,1.69,5.32.25,10.24-3.62,14.11l-37.37,37.39c-5.75,5.75-14.85,5.56-20.06-.83l-13.98-17.15C56.21,65.82,27.55,111.02,26.82,160.91c-.11,7.54-4.24,13.54-11.8,14.61-6.57.94-13.03-3.45-15.02-10.26l.14-12.63.57-4.27C8.13,70.42,70.43,8.16,148.39.71l4.62-.6,12.42-.1Z"
      />
      <path
        d="M168.78,354.99c-14.05,14.05-37.66,16.97-50.85,3.78l-93.81-93.83c-5.59-5.59-7.89-13.34-8.05-21.04-.24-11.31,4.54-21.77,12.57-29.8L214.46,28.25c14.15-14.16,37.89-16.73,50.49-4.14l92.73,92.65c14.73,14.72,11.4,37.93-2.68,52.02l-186.21,186.21ZM333.96,132.73c-6.19-6.24-14.38-7.45-21.19-.71-3.92,3.88-12.62,7.2-17.51,2.33l-46.04-45.94c-4.88-4.87-2.41-13.35,1.8-17.63,3.23-3.29,4.74-6.95,4.82-11.18s-2.76-7.19-5.61-10.4c-5.17-5.83-12.53-6.95-19.37-2.15L47.4,230.55c-4.04,4.05-4.98,12.54-.99,16.53l89.77,89.76c3.96,3.96,12.5,3.04,16.54-.99l183.5-183.45c4.95-7.07,3.46-13.94-2.25-19.68Z"
      />
      <path
        d="M211.76,360.25l37.94-37.92c5.6-5.6,14.72-4.88,19.64,1.16l14.01,17.2c43.64-23.34,72.36-68.43,73.04-118.36.11-8.16,5.21-14.5,13.2-14.73s14.31,6.45,13.77,14.67l-.72,11.07c-6.65,79-70.26,142.68-149.28,149.29l-11.06.71c-5.76.37-10.9-2.66-13.27-7.44-2.54-5.13-1.81-11.14,2.72-15.66Z"
      />
    </svg>
  );
}

export default function MenuPreviewDeviceFrame(props: MenuPreviewDeviceFrameProps) {
  const { device, orientation, query } = props;
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const frame = getMenuPreviewFrame(device, orientation);
  const orientationLabel = device === "tablet" ? MENU_PREVIEW_ORIENTATIONS[orientation] : null;
  const nextTabletOrientation: MenuPreviewOrientation = orientation === "landscape" ? "portrait" : "landscape";
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
  const detachedUrl = buildPreviewUrl({
    actual: true,
    embedded: true,
    device,
    orientation,
  });
  const showToolbar = isToolbarOpen;

  return (
    <main className="h-screen overflow-hidden bg-zinc-100 text-zinc-950">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center">
        <header
          data-preview-device-toolbar=""
          data-toolbar-open={showToolbar ? "true" : "false"}
          className={`pointer-events-auto relative min-w-0 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/48 p-2 text-white backdrop-blur-[2px] transition-[width,transform] duration-300 ease-out ${
            showToolbar ? "w-[min(27rem,calc(100vw-1.5rem))]" : "w-20 max-w-20"
          }`}
          style={{
            transform: showToolbar ? "translateY(0.5rem)" : "translateY(calc(-100% + 1.75rem))",
            width: showToolbar ? undefined : "5rem",
            maxWidth: showToolbar ? undefined : "5rem",
          }}
        >
          <div
            data-preview-device-toolbar-content=""
            aria-hidden={!showToolbar}
            className={`flex w-full items-center gap-1.5 pl-1 pr-10 transition-opacity duration-150 ${
              showToolbar ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <nav aria-label="미리보기 기기 선택" className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
              {MENU_PREVIEW_DEVICE_ORDER.map((candidate) => {
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
                    tabIndex={showToolbar ? undefined : -1}
                    aria-current={isSelected ? "page" : undefined}
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
                      isSelected ? "bg-white text-zinc-950" : "bg-zinc-950/45 text-white hover:bg-zinc-950/60"
                    }`}
                  >
                    <PreviewDeviceIcon device={candidate} />
                    {candidateFrame.label}
                  </Link>
                );
              })}
            </nav>
            {device === "tablet" ? (
              <Link
                aria-label={`태블릿을 ${MENU_PREVIEW_ORIENTATIONS[nextTabletOrientation]}로 회전`}
                title={`태블릿을 ${MENU_PREVIEW_ORIENTATIONS[nextTabletOrientation]}로 회전`}
                data-preview-tablet-orientation-toggle=""
                href={buildPreviewUrl({ device, orientation: nextTabletOrientation })}
                scroll={false}
                tabIndex={showToolbar ? undefined : -1}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <PreviewOrientationIcon />
              </Link>
            ) : null}
            <Link
              href={detachedUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="새 창에서 메뉴판 보기"
              title="새 창에서 메뉴판 보기"
              data-preview-detached-link=""
              tabIndex={showToolbar ? undefined : -1}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-zinc-950/45 px-2.5 text-[0.7rem] font-bold text-white transition-colors hover:bg-zinc-950/60"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
              <span className="hidden min-[430px]:inline">새 창에서 보기</span>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setIsToolbarOpen((open) => !open)}
            aria-expanded={showToolbar}
            aria-label={showToolbar ? "기기 선택 도구 닫기" : "기기 선택 도구 열기"}
            className={`absolute grid place-items-center text-white/70 transition-[top,right,left,width,height,transform,color,background-color] duration-300 hover:bg-white/10 hover:text-white ${
              showToolbar
                ? "right-2 top-2 h-9 w-9 rounded-xl"
                : "bottom-0 left-1/2 h-7 w-12 -translate-x-1/2 rounded-t-xl"
            }`}
          >
            {showToolbar ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </header>
      </div>

      <section
        className={device === "pc" ? "h-screen w-screen overflow-hidden" : "h-screen overflow-auto px-4 py-16"}
        tabIndex={device === "pc" ? undefined : 0}
        aria-label={`${frame.label}${orientationLabel ? ` ${orientationLabel}` : ""} 메뉴판 미리보기`}
      >
        <div
          data-preview-frame-shell=""
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

      <MenuPreviewGuide device={device} />
    </main>
  );
}
