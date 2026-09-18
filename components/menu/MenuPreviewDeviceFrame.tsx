"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

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

export default function MenuPreviewDeviceFrame(props: MenuPreviewDeviceFrameProps) {
  const { device, orientation, query } = props;
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
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

  return (
    <main className="h-screen overflow-hidden bg-zinc-100 text-zinc-950">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center">
        <header
          data-preview-device-toolbar=""
          data-toolbar-open={showToolbar ? "true" : "false"}
          className="pointer-events-auto relative w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/48 p-2 text-white backdrop-blur-[2px] transition-transform duration-300 ease-out"
          style={{ transform: showToolbar ? "translateY(0.5rem)" : "translateY(calc(-100% + 1.75rem))" }}
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
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors sm:px-2.5 sm:text-sm ${
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
              <nav
                aria-label="태블릿 방향 선택"
                data-preview-tablet-orientation=""
                className="flex shrink-0 items-center justify-center gap-0.5 rounded-xl bg-white/10 p-0.5"
              >
                {(Object.keys(MENU_PREVIEW_ORIENTATIONS) as MenuPreviewOrientation[]).map((candidate) => {
                  const isSelected = candidate === orientation;

                  return (
                    <Link
                      key={candidate}
                      href={buildPreviewUrl({ device, orientation: candidate })}
                      scroll={false}
                      tabIndex={showToolbar ? undefined : -1}
                      aria-current={isSelected ? "page" : undefined}
                      className={`min-w-10 rounded-lg px-1.5 py-2 text-center text-xs font-bold transition-colors sm:min-w-11 sm:px-2 ${
                        isSelected ? "bg-white text-zinc-950" : "bg-zinc-950/45 text-white hover:bg-zinc-950/60"
                      }`}
                    >
                      {MENU_PREVIEW_ORIENTATIONS[candidate]}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
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
