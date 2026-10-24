"use client";

import { useEffect, useOptimistic, useRef, useState, useSyncExternalStore, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

import MenuPreviewGuide from "@/components/menu/MenuPreviewGuide";
import PreviewDeviceIcon from "@/components/menu/PreviewDeviceIcon";
import { supportsPcTabletLayoutMode } from "@/lib/menu-layout-modes";
import MenuPreviewOptionsPanel from "./MenuPreviewOptionsPanel";
import styles from "./MenuPreviewDeviceFrame.module.css";
import { readPreviewDesign, serializePreviewDesign, type PreviewDesign, type PreviewDesignDefaults } from "@/lib/menu-preview-design";
import { hasFixedHeaderAlignment } from "@/lib/menu-design-surfaces";
import { getDefaultDesignReview } from "@/lib/menu-design-policy";
import { getTemplatePreviewOptionGroups } from "@/lib/template-preview-options";
import { getDefaultDesignOptions, type DefaultDesignOptionKey, type DefaultDesignOptions } from "@/lib/default-design-options";

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

type MenuPreviewDeviceFrameProps =
  | {
      device: MenuPreviewDevice;
      orientation: MenuPreviewOrientation;
      menuId: string;
      query: MenuPreviewQuery;
      templateKey?: never;
      menuTemplateKey?: string;
      menuDesignId?: string;
    }
  | {
      device: MenuPreviewDevice;
      orientation: MenuPreviewOrientation;
      templateKey: string;
      query: TemplatePreviewQuery;
      menuId?: never;
      menuTemplateKey?: never;
      menuDesignId?: never;
    };

const wideOptionsQuery = "(min-width: 960px)";
function subscribeWideOptions(onChange: () => void) {
  const media = window.matchMedia(wideOptionsQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getWideOptions = () => window.matchMedia(wideOptionsQuery).matches;
const getServerWideOptions = () => false;

function CallPreviewToggle({
  checked,
  disabled,
  onChange,
  order = false,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
  order?: boolean;
}) {
  return (
    <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-2 text-xs font-bold">
      <input
        type="checkbox"
        aria-label={order ? "주문 기능 미리보기" : "호출 기능 미리보기"}
        checked={checked}
        disabled={disabled}
        data-preview-call-toggle={!order ? "" : undefined}
        data-preview-order-toggle={order ? "" : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
      {order ? "주문 기능" : "호출 기능"}
    </label>
  );
}

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
      <path d="M165.43,0c4.52,1.62,8.19,4.89,9.52,9.06,1.69,5.32.25,10.24-3.62,14.11l-37.37,37.39c-5.75,5.75-14.85,5.56-20.06-.83l-13.98-17.15C56.21,65.82,27.55,111.02,26.82,160.91c-.11,7.54-4.24,13.54-11.8,14.61-6.57.94-13.03-3.45-15.02-10.26l.14-12.63.57-4.27C8.13,70.42,70.43,8.16,148.39.71l4.62-.6,12.42-.1Z" />
      <path d="M168.78,354.99c-14.05,14.05-37.66,16.97-50.85,3.78l-93.81-93.83c-5.59-5.59-7.89-13.34-8.05-21.04-.24-11.31,4.54-21.77,12.57-29.8L214.46,28.25c14.15-14.16,37.89-16.73,50.49-4.14l92.73,92.65c14.73,14.72,11.4,37.93-2.68,52.02l-186.21,186.21ZM333.96,132.73c-6.19-6.24-14.38-7.45-21.19-.71-3.92,3.88-12.62,7.2-17.51,2.33l-46.04-45.94c-4.88-4.87-2.41-13.35,1.8-17.63,3.23-3.29,4.74-6.95,4.82-11.18s-2.76-7.19-5.61-10.4c-5.17-5.83-12.53-6.95-19.37-2.15L47.4,230.55c-4.04,4.05-4.98,12.54-.99,16.53l89.77,89.76c3.96,3.96,12.5,3.04,16.54-.99l183.5-183.45c4.95-7.07,3.46-13.94-2.25-19.68Z" />
      <path d="M211.76,360.25l37.94-37.92c5.6-5.6,14.72-4.88,19.64,1.16l14.01,17.2c43.64-23.34,72.36-68.43,73.04-118.36.11-8.16,5.21-14.5,13.2-14.73s14.31,6.45,13.77,14.67l-.72,11.07c-6.65,79-70.26,142.68-149.28,149.29l-11.06.71c-5.76.37-10.9-2.66-13.27-7.44-2.54-5.13-1.81-11.14,2.72-15.66Z" />
    </svg>
  );
}

export default function MenuPreviewDeviceFrame(
  props: MenuPreviewDeviceFrameProps & { supportsCallPreview?: boolean; supportsLayoutPreview?: boolean; previewDisplayOptions?: DefaultDesignOptions; previewDesignDefaults?: PreviewDesignDefaults; supportsTabletOrientation?: boolean },
) {
  const { device, query } = props;
  const templateKey = props.templateKey ?? props.menuTemplateKey;
  const designParam = props.menuId ? props.menuDesignId : (query as TemplatePreviewQuery).design;
  const defaultDesign = templateKey ? getDefaultDesignReview(Array.isArray(designParam) ? designParam[0] : designParam, templateKey) : undefined;
  const supportsTabletOrientation = props.supportsTabletOrientation ?? (templateKey?.startsWith("dining_") === true || defaultDesign?.itemLayout === "album");
  const orientation = supportsTabletOrientation ? props.orientation : "landscape";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const wideOptions = useSyncExternalStore(subscribeWideOptions, getWideOptions, getServerWideOptions);
  const [displayOptionsOpenOverride, setDisplayOptionsOpenOverride] = useState<boolean>();
  const areDisplayOptionsOpen = displayOptionsOpenOverride ?? wideOptions;
  const [optionsTab, setOptionsTab] = useState((query as TemplatePreviewQuery).previewOptions === "design" ? "design" : "features");
  const initialDesign = readPreviewDesign((query as TemplatePreviewQuery).designPreview);
  const legacyRatio = readPreviewDesign({albumImageRatio:(query as TemplatePreviewQuery).albumImageRatio}).albumImageRatio;
  if (legacyRatio && !initialDesign.albumImageRatio) initialDesign.albumImageRatio = legacyRatio;
  const [designOptions, setDesignOptions] = useOptimistic(initialDesign);
  const templateQuery = { ...query, previewOptions: optionsTab, designPreview: serializePreviewDesign(designOptions) };
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(128);
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const measure = () => setToolbarHeight(toolbar.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);
  const supportsCallPreview =
    props.supportsCallPreview ?? templateKey !== "display_menu_a";
  const supportsOrderPreview =
    props.supportsCallPreview !== false &&
    templateKey !== "display_menu_a";
  const orderPreview =
    (Array.isArray(query.orderPreview)
      ? query.orderPreview[0]
      : query.orderPreview) === "on";
  const callPreview =
    (Array.isArray(query.callPreview)
      ? query.callPreview[0]
      : query.callPreview) === "on";
  const [features, setFeatures] = useOptimistic({
    call: callPreview,
    order: orderPreview,
  });
  const supportsLayoutPreview = props.supportsLayoutPreview ?? supportsPcTabletLayoutMode(templateKey);
  const [displayOptions, setDisplayOptions] = useOptimistic(props.previewDisplayOptions ?? getDefaultDesignOptions(query as TemplatePreviewQuery));
  const displayGroups = templateKey ? getTemplatePreviewOptionGroups(templateKey, defaultDesign) : [];
  const hasDisplayOptions = displayGroups.length > 0;
  const changeDisplayOption = (key: DefaultDesignOptionKey, enabled: boolean) => {
    if (!hasDisplayOptions) return;
    startTransition(() => {
      setDisplayOptions({ ...displayOptions, [key]: enabled });
      router.push(buildPreviewUrl({ device, orientation }, { ...templateQuery, [key]: enabled ? "on" : "off" }), { scroll: false });
    });
  };
  const layoutMode = (Array.isArray(query.layoutMode) ? query.layoutMode[0] : query.layoutMode) === "orderedFit" ? "orderedFit" : "orderedBalancedFit";
  const frame = getMenuPreviewFrame(device, orientation);
  const orientationLabel =
    device === "tablet" ? MENU_PREVIEW_ORIENTATIONS[orientation] : null;
  const nextTabletOrientation: MenuPreviewOrientation =
    orientation === "landscape" ? "portrait" : "landscape";
  const buildPreviewUrl = (options: {
    device?: MenuPreviewDevice;
    orientation?: MenuPreviewOrientation;
    embedded?: boolean;
    detached?: boolean;
    actual?: boolean;
    callPreview?: boolean;
    orderPreview?: boolean;
    layoutMode?: string;
  }, nextQuery: TemplatePreviewQuery = templateQuery) => {
    if (typeof props.templateKey === "string") {
      return buildTemplatePreviewUrl(
        props.templateKey,
        nextQuery as TemplatePreviewQuery,
        {
          callPreview: features.call,
          orderPreview: features.order,
          ...options,
        },
      );
    }

    if (typeof props.menuId === "string") {
      return buildMenuPreviewUrl(props.menuId, nextQuery as MenuPreviewQuery, {
        callPreview: features.call,
        orderPreview: features.order,
        ...options,
      });
    }

    throw new Error("미리보기 대상을 확인할 수 없습니다.");
  };
  const changeFeature = (kind: "call" | "order", enabled: boolean) => {
    const next = { ...features, [kind]: enabled };
    startTransition(() => {
      setFeatures(next);
      router.push(
        buildPreviewUrl({
          device,
          orientation,
          callPreview: next.call,
          orderPreview: next.order,
        }),
        { scroll: false },
      );
    });
  };
  const embeddedUrl = buildPreviewUrl({
    actual: true,
    embedded: true,
    device,
    orientation,
  });
  const detachedUrl = buildPreviewUrl({
    device,
    orientation,
    actual: true,
    embedded: true,
    detached: true,
  });
  const showToolbar = isToolbarOpen;
  const changeDesign = (next: PreviewDesign) => {
    if (!hasDisplayOptions) return;
    if (serializePreviewDesign(next) === serializePreviewDesign(designOptions)) return;
    startTransition(() => {
      setDesignOptions(next);
      router.replace(buildPreviewUrl({ device, orientation }, { ...templateQuery, designPreview: serializePreviewDesign(next), appearanceQa: undefined, albumImageRatio: undefined }), {scroll:false});
    });
  };
  const changeOptionsTab = (tab: string) => {
    setOptionsTab(tab);
    const url = new URL(window.location.href); url.searchParams.set("previewOptions",tab);
    window.history.replaceState(null,"",url);
  };

  return (
    <main className={`${styles.workspace} h-screen overflow-hidden bg-zinc-100 text-zinc-950`} data-has-options={hasDisplayOptions ? "true" : "false"} data-options-open={areDisplayOptionsOpen ? "true" : "false"} data-toolbar-open={showToolbar ? "true" : "false"}
      style={{ "--preview-options-top": `${showToolbar ? toolbarHeight + 24 : 12}px` } as CSSProperties}>
      <div ref={toolbarRef} className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center">
        <header
          data-preview-device-toolbar=""
          data-toolbar-open={showToolbar ? "true" : "false"}
          className={`${styles.toolbar} pointer-events-auto relative min-w-0 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/90 p-2 text-white backdrop-blur-[2px] transition-[width,transform] duration-300 ease-out ${
            showToolbar
              ? supportsLayoutPreview
                ? "w-[min(53rem,calc(100vw-1.5rem))]"
                : supportsOrderPreview
                ? "w-[min(43rem,calc(100vw-1.5rem))]"
                : "w-[min(27rem,calc(100vw-1.5rem))]"
              : "w-20 max-w-20"
          }`}
          style={{
            transform: showToolbar
              ? "translateY(0.5rem)"
              : "translateY(calc(-100% + 1.75rem))",
            width: showToolbar ? undefined : "5rem",
            maxWidth: showToolbar ? "calc(100% - 1.5rem)" : "5rem",
          }}
        >
          <div
            data-preview-device-toolbar-content=""
            aria-hidden={!showToolbar}
            className={`${styles.toolbarContent} flex w-full items-center gap-1.5 pl-1 pr-10 transition-opacity duration-150 ${supportsLayoutPreview ? "max-[850px]:flex-wrap" : supportsCallPreview ? "max-[560px]:flex-wrap" : ""} ${
              showToolbar ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <nav
              aria-label="미리보기 기기 선택"
              className={`${styles.deviceNav} flex min-w-0 flex-1 items-center justify-center gap-0.5 ${supportsLayoutPreview ? "max-[850px]:basis-full" : supportsCallPreview ? "max-[560px]:basis-full" : ""}`}
            >
              {MENU_PREVIEW_DEVICE_ORDER.map((candidate) => {
                const candidateFrame = MENU_PREVIEW_DEVICES[candidate];
                const isSelected = candidate === device;

                return (
                  <Link
                    key={candidate}
                    href={buildPreviewUrl({
                      device: candidate,
                      orientation:
                        candidate === "tablet" ? orientation : undefined,
                    })}
                    scroll={false}
                    tabIndex={showToolbar ? undefined : -1}
                    aria-current={isSelected ? "page" : undefined}
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
                      isSelected
                        ? "bg-white text-zinc-950"
                        : "bg-zinc-950/45 text-white hover:bg-zinc-950/60"
                    }`}
                  >
                    <PreviewDeviceIcon device={candidate} />
                    {candidateFrame.label}
                  </Link>
                );
              })}
            </nav>
            {device === "tablet" && supportsTabletOrientation ? (
              <Link
                aria-label={`태블릿을 ${MENU_PREVIEW_ORIENTATIONS[nextTabletOrientation]}로 회전`}
                title={`태블릿을 ${MENU_PREVIEW_ORIENTATIONS[nextTabletOrientation]}로 회전`}
                data-preview-tablet-orientation-toggle=""
                href={buildPreviewUrl({
                  device,
                  orientation: nextTabletOrientation,
                })}
                scroll={false}
                tabIndex={showToolbar ? undefined : -1}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <PreviewOrientationIcon />
              </Link>
            ) : null}
            {supportsCallPreview ? (
              <CallPreviewToggle
                checked={features.call}
                disabled={!showToolbar || isPending}
                onChange={(enabled) => changeFeature("call", enabled)}
              />
            ) : null}
            {supportsOrderPreview ? (
              <CallPreviewToggle
                order
                checked={features.order}
                disabled={!showToolbar || isPending}
                onChange={(enabled) => changeFeature("order", enabled)}
              />
            ) : null}
            {supportsLayoutPreview && device !== "mobile" ? (
              <div className="flex shrink-0 gap-0.5 rounded-xl bg-white/10 p-0.5" role="group" aria-label="메뉴 배치 방식">
                {([['orderedBalancedFit', '묶음형'], ['orderedFit', '채움형']] as const).map(([mode, label]) => (
                  <Link key={mode} href={buildPreviewUrl({device, orientation, layoutMode: mode})} scroll={false} tabIndex={showToolbar ? undefined : -1}
                    aria-current={layoutMode === mode ? "true" : undefined} data-preview-layout-mode={mode}
                    className={`rounded-lg px-2 py-2 text-xs font-bold ${layoutMode === mode ? "bg-white text-zinc-950" : "text-white/75 hover:bg-white/10"}`}>
                    {label}
                  </Link>
                ))}
              </div>
            ) : null}
            <Link
              href={detachedUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="새 창에서 메뉴판 보기"
              title="새 창에서 메뉴판 보기"
              data-preview-detached-link=""
              tabIndex={showToolbar ? undefined : -1}
              className="site-button site-button-primary inline-flex shrink-0 items-center justify-center gap-1.5 text-[0.7rem]"
            >
              <ExternalLink
                className="h-4 w-4"
                strokeWidth={1.9}
                aria-hidden="true"
              />
              <span className="hidden min-[430px]:inline">새 창에서 보기</span>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setIsToolbarOpen((open) => !open)}
            aria-expanded={showToolbar}
            aria-label={
              showToolbar ? "기기 선택 도구 닫기" : "기기 선택 도구 열기"
            }
            className={`absolute grid place-items-center text-white/70 transition-[top,right,left,width,height,transform,color,background-color] duration-300 hover:bg-white/10 hover:text-white ${
              showToolbar
                ? "right-2 top-2 h-9 w-9 rounded-xl"
                : "bottom-0 left-1/2 h-7 w-12 -translate-x-1/2 rounded-t-xl"
            }`}
          >
            {showToolbar ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </header>
        {hasDisplayOptions && templateKey ? <MenuPreviewOptionsPanel open={areDisplayOptionsOpen} onToggle={() => setDisplayOptionsOpenOverride(!areDisplayOptionsOpen)} tab={optionsTab} onTabChange={changeOptionsTab}
          groups={displayGroups} values={displayOptions} onFeatureChange={changeDisplayOption} pending={isPending} templateKey={templateKey} defaults={props.previewDesignDefaults} design={designOptions} onDesignChange={changeDesign} alignmentDisabled={device !== "mobile" && hasFixedHeaderAlignment(templateKey, { menu_design_id: defaultDesign?.id })} album={defaultDesign?.itemLayout === "album"} /> : null}
      </div>

      <section
        className={
          device === "pc" ? "h-screen w-screen overflow-hidden" : "h-screen overflow-auto px-4 py-16"
        }
        style={device !== "pc" && hasDisplayOptions && showToolbar ? { paddingTop: toolbarHeight + 24 } : undefined}
        tabIndex={device === "pc" ? undefined : 0}
        aria-label={`${frame.label}${orientationLabel ? ` ${orientationLabel}` : ""} 메뉴판 미리보기`}
      >
        <div
          data-preview-frame-shell=""
          className={
            device === "pc"
              ? "h-screen w-screen overflow-hidden bg-white"
              : "mx-auto overflow-hidden rounded-[28px] border-[10px] border-zinc-900 bg-white shadow-2xl"
          }
          style={
            device === "pc" ? undefined : { width: frame.width + 20, height: frame.height + 20 }
          }
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
