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
          className={`pointer-events-auto flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-zinc-950/72 p-2 text-white backdrop-blur-xl transition-all duration-300 ease-out ${
            showToolbar ? "translate-y-2 opacity-100" : "-translate-y-[calc(100%+1.25rem)] opacity-0"
          }`}
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
        className={`fixed left-1/2 top-0 z-[79] grid h-7 w-[min(10rem,calc(100vw-2rem))] -translate-x-1/2 place-items-center rounded-b-xl border border-t-0 border-white/15 bg-zinc-950/72 text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-opacity ${showToolbar ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
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

      <MenuPreviewGuide device={device} />
    </main>
  );
}
