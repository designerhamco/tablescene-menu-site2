"use client";

import { useEffect, useOptimistic, useRef, useState, useSyncExternalStore, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "@/app/components/ui/site-arrow";
import PreviewActualView from "./PreviewActualView";
import { usePreviewRenderedDesign } from "./usePreviewRenderedDesign";
import DisplayPreviewGuide from "./DisplayPreviewGuide";
import DisplayPreviewOptions from "./DisplayPreviewOptions";
import { useDisplayPreviewNavigation } from "./useDisplayPreviewNavigation";
import { ChevronLeft, ChevronRight } from "@/app/components/ui/site-arrow";
import type { DisplayPreviewPage } from "@/lib/display-preview";
import { normalizeFontSizeScaleKey } from "@/lib/template-typography-presets";

import { fitMenuPreviewFrame } from "@/lib/menu-preview-fit";
import PreviewDeviceIcon, { PreviewOrientationIcon } from "@/components/menu/PreviewDeviceIcon";
import { normalizePcTabletLayoutMode, supportsPcTabletLayoutMode } from "@/lib/menu-layout-modes";
import MenuPreviewOptionsPanel from "./MenuPreviewOptionsPanel";
import styles from "./MenuPreviewDeviceFrame.module.css";
import { readPreviewDesign, serializePreviewDesign, type PreviewDesign, type PreviewDesignDefaults } from "@/lib/menu-preview-design";
import { hasFixedHeaderAlignment } from "@/lib/menu-design-surfaces";
import { getDefaultDesignReview } from "@/lib/menu-design-policy";
import { getTemplatePreviewOptionGroups } from "@/lib/template-preview-options";
import { DEFAULT_DESIGN_OPTION_KEYS, getDefaultDesignOptions, withoutTemplatePreviewFeatureOverrides, type DefaultDesignOptionKey, type DefaultDesignOptions } from "@/lib/default-design-options";

import {
  buildMenuPreviewUrl,
  buildTemplatePreviewUrl,
  getMenuPreviewFrame,
  shouldUseMenuPreviewDeviceFrame,
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
    <label className="site-preview-control site-preview-choice">
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

export default function MenuPreviewDeviceFrame(
  props: MenuPreviewDeviceFrameProps & { supportsCallPreview?: boolean; supportsLayoutPreview?: boolean; previewDisplayOptions?: DefaultDesignOptions; previewDisplayDefaults?: DefaultDesignOptions; previewDesignDefaults?: PreviewDesignDefaults; savedPatternBandsAvailable?: boolean; displayPages?: DisplayPreviewPage[] },
) {
  const { device, query } = props;
  const isTemplatePreview = typeof props.templateKey === "string";
  const templateKey = props.templateKey ?? props.menuTemplateKey;
  const isDisplayPreview = isTemplatePreview && templateKey === "display_menu_a";
  const designParam = props.menuId ? props.menuDesignId : (query as TemplatePreviewQuery).design;
  const defaultDesign = templateKey ? getDefaultDesignReview(Array.isArray(designParam) ? designParam[0] : designParam, templateKey) : undefined;
  const supportsTabletOrientation = shouldUseMenuPreviewDeviceFrame(templateKey);
  const orientation = supportsTabletOrientation ? props.orientation : "landscape";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const wideOptions = useSyncExternalStore(subscribeWideOptions, getWideOptions, getServerWideOptions);
  const [displayOptionsOpenOverride, setDisplayOptionsOpenOverride] = useState<boolean>();
  const areDisplayOptionsOpen = displayOptionsOpenOverride ?? wideOptions;
  const [optionsTab, setOptionsTab] = useState((query as TemplatePreviewQuery).previewOptions === "design" ? "design" : "features");
  const initialDesign = readPreviewDesign(isTemplatePreview ? (query as TemplatePreviewQuery).designPreview : { hidePatternBands: query.patternBandsPreview === "off" });
  const legacyRatio = readPreviewDesign({albumImageRatio:(query as TemplatePreviewQuery).albumImageRatio}).albumImageRatio;
  if (isTemplatePreview && legacyRatio && !initialDesign.albumImageRatio) initialDesign.albumImageRatio = legacyRatio;
  const [designOptions, setDesignOptions] = useOptimistic(initialDesign);
  const templateQuery: TemplatePreviewQuery = {
    ...query,
    previewOptions: optionsTab,
    designPreview: serializePreviewDesign(designOptions),
    patternBandsPreview: !isTemplatePreview && designOptions.hidePatternBands ? "off" : undefined,
  };
  const toolbarRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const displayNavigation = useDisplayPreviewNavigation(iframeRef, props.displayPages, query as TemplatePreviewQuery);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0, viewportWidth: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height, viewportWidth: window.innerWidth });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
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
    isTemplatePreview && (props.supportsCallPreview ?? templateKey !== "display_menu_a");
  const supportsOrderPreview =
    isTemplatePreview && props.supportsCallPreview !== false &&
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
  const supportsLayoutPreview = isTemplatePreview && (props.supportsLayoutPreview ?? supportsPcTabletLayoutMode(templateKey));
  const [displayOptions, setDisplayOptions] = useOptimistic(props.previewDisplayOptions ?? getDefaultDesignOptions(query as TemplatePreviewQuery));
  const displayGroups = isTemplatePreview && templateKey ? getTemplatePreviewOptionGroups(templateKey, defaultDesign) : [];
  const patternBandsAvailable = props.previewDesignDefaults?.patternBandsAvailable || props.savedPatternBandsAvailable;
  const hasDisplayOptions = displayGroups.length > 0 || Boolean(patternBandsAvailable);
  const changeDisplayOption = (key: DefaultDesignOptionKey, enabled: boolean) => {
    if (!hasDisplayOptions) return;
    startTransition(() => {
      setDisplayOptions({ ...displayOptions, [key]: enabled });
      router.push(buildPreviewUrl({ device, orientation }, { ...templateQuery, [key]: enabled ? "on" : "off" }), { scroll: false });
    });
  };
  const canResetFeatures = DEFAULT_DESIGN_OPTION_KEYS.some(key => templateQuery[key] !== undefined) || (isDisplayPreview && templateQuery.displayImagePosition !== undefined);
  const resetDisplayOptions = () => {
    if (!hasDisplayOptions || !canResetFeatures || isPending) return;
    const nextQuery = withoutTemplatePreviewFeatureOverrides(templateQuery);
    if (isDisplayPreview) delete nextQuery.displayImagePosition;
    startTransition(() => {
      setDisplayOptions(props.previewDisplayDefaults ?? getDefaultDesignOptions(nextQuery));
      router.replace(buildPreviewUrl({ device, orientation }, nextQuery), { scroll: false });
    });
  };
  const layoutMode = normalizePcTabletLayoutMode(Array.isArray(query.layoutMode) ? query.layoutMode[0] : query.layoutMode, templateKey);
  const frame = getMenuPreviewFrame(device, orientation);
  const previewLabel = isDisplayPreview ? "디스플레이" : frame.label;
  const fittedFrame = fitMenuPreviewFrame({ ...canvasSize, device }, frame);
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
        isDisplayPreview && !(options.embedded && !options.detached)
          ? { ...nextQuery, page: String(displayNavigation.page), lang: displayNavigation.lang }
          : nextQuery as TemplatePreviewQuery,
        {
          callPreview: features.call,
          orderPreview: features.order,
          ...options,
        },
      );
    }

    if (typeof props.menuId === "string") {
      return buildMenuPreviewUrl(props.menuId, nextQuery as MenuPreviewQuery, options);
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
  const renderedDesign = usePreviewRenderedDesign(iframeRef, embeddedUrl, hasDisplayOptions && areDisplayOptionsOpen && optionsTab === "design");
  const detachedUrl = buildPreviewUrl({
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
      router.replace(buildPreviewUrl({ device, orientation }, { ...templateQuery, designPreview: serializePreviewDesign(next), patternBandsPreview: !isTemplatePreview && next.hidePatternBands ? "off" : undefined, appearanceQa: undefined, albumImageRatio: undefined }), {scroll:false});
    });
  };
  const changeOptionsTab = (tab: string) => {
    setOptionsTab(tab);
    const url = new URL(window.location.href); url.searchParams.set("previewOptions",tab);
    window.history.replaceState(null,"",url);
  };
  const changeDisplayQuery = (patch: TemplatePreviewQuery) => startTransition(() => {
    router.replace(buildPreviewUrl({ device: "pc" }, { ...templateQuery, ...patch }), { scroll: false });
  });
  const fontSizeScale = normalizeFontSizeScaleKey(Array.isArray(templateQuery.fontSizeScale) ? templateQuery.fontSizeScale[0] : templateQuery.fontSizeScale);

  return (
    <main className={`${styles.workspace} h-screen overflow-hidden bg-zinc-100 text-zinc-950`} data-preview-device={device} data-has-options={hasDisplayOptions ? "true" : "false"} data-options-open={areDisplayOptionsOpen ? "true" : "false"} data-toolbar-open={showToolbar ? "true" : "false"}
      style={{ "--preview-options-top": `${showToolbar ? toolbarHeight + 24 : 44}px` } as CSSProperties}>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center">
        <header ref={toolbarRef}
          data-preview-device-toolbar=""
          data-preview-service-controls={supportsLayoutPreview && device !== "mobile" ? "layout" : supportsCallPreview || supportsOrderPreview ? "services" : undefined}
          data-toolbar-open={showToolbar ? "true" : "false"}
          className={`${styles.toolbar} pointer-events-auto relative min-w-0 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 p-2 text-white backdrop-blur-[2px] transition-[width,transform] duration-300 ease-out`}
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
            className={`${styles.toolbarContent} flex w-full items-center gap-1.5 pl-1 transition-opacity duration-150 ${
              showToolbar ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {isDisplayPreview ? <nav aria-label="디스플레이 페이지 이동" className={`${styles.displayPages} flex min-w-0 flex-1 items-center justify-center`}>
              <button type="button" className="site-preview-control" aria-label="이전 페이지" title="이전 페이지" tabIndex={showToolbar ? undefined : -1} disabled={!displayNavigation.ready || displayNavigation.page <= 1 || isPending} onClick={() => displayNavigation.select(displayNavigation.page - 1)}><ChevronLeft className="h-4 w-4" aria-hidden="true" /><span className="hidden min-[640px]:inline">이전 페이지</span></button>
              <span role="status" aria-live="polite" aria-label={`전체 ${props.displayPages?.length ?? 0}페이지 중 ${displayNavigation.page}페이지`} className="type-caption tabular-nums" data-display-page-count="">{displayNavigation.page} / {props.displayPages?.length ?? 0}</span>
              <button type="button" className="site-preview-control" aria-label="다음 페이지" title="다음 페이지" tabIndex={showToolbar ? undefined : -1} disabled={!displayNavigation.ready || displayNavigation.page >= (props.displayPages?.length ?? 0) || isPending} onClick={() => displayNavigation.select(displayNavigation.page + 1)}><span className="hidden min-[640px]:inline">다음 페이지</span><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            </nav> : <nav
              aria-label="미리보기 기기 선택"
              className={`${styles.deviceNav} site-preview-control-group`}
            >
              <div className={styles.deviceChoices}>
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
                      aria-current={isSelected ? "page" : "false"}
                      className="site-preview-control"
                    >
                      <PreviewDeviceIcon device={candidate} />
                      {candidateFrame.label}
                    </Link>
                  );
                })}
              </div>
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
                  className="site-icon-control site-preview-control site-preview-control-icon" data-icon-appearance="bare"
                >
                  <PreviewOrientationIcon />
                </Link>
              ) : null}
            </nav>}
            {supportsCallPreview || supportsOrderPreview ? <div className="site-preview-control-group" role="group" aria-label="호출·주문 기능 미리보기">
            {supportsCallPreview ? (
              <CallPreviewToggle checked={features.call} disabled={!showToolbar || isPending}
                onChange={(enabled) => changeFeature("call", enabled)} />
            ) : null}
            {supportsOrderPreview ? (
              <CallPreviewToggle order checked={features.order} disabled={!showToolbar || isPending}
                onChange={(enabled) => changeFeature("order", enabled)} />
            ) : null}
            </div> : null}
            {supportsLayoutPreview && device !== "mobile" ? (
              <div className="site-preview-control-group" role="group" aria-label="메뉴 배치 방식">
                {([['orderedBalancedFit', '묶음형'], ['orderedFit', '채움형']] as const).map(([mode, label]) => (
                  <Link key={mode} href={buildPreviewUrl({device, orientation, layoutMode: mode})} scroll={false}
                    tabIndex={showToolbar ? undefined : -1}
                    aria-current={layoutMode === mode ? "true" : "false"} data-preview-layout-mode={mode}
                    className="site-preview-control">{label}</Link>
                ))}
              </div>
            ) : null}
            <PreviewActualView href={detachedUrl} tabIndex={showToolbar ? undefined : -1} />
            {isDisplayPreview ? <DisplayPreviewGuide tabIndex={showToolbar ? undefined : -1} /> : null}
          </div>
          <button
            type="button"
            onClick={() => setIsToolbarOpen((open) => !open)}
            aria-expanded={showToolbar}
            aria-label={
              isDisplayPreview ? (showToolbar ? "디스플레이 도구 닫기" : "디스플레이 도구 열기") : showToolbar ? "기기 선택 도구 닫기" : "기기 선택 도구 열기"
            }
            className="site-icon-control site-preview-control site-preview-toolbar-toggle"
            data-icon-appearance="bare"
          >
            {showToolbar ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </header>
        {hasDisplayOptions && templateKey ? <MenuPreviewOptionsPanel open={areDisplayOptionsOpen} onToggle={() => setDisplayOptionsOpenOverride(!areDisplayOptionsOpen)} tab={optionsTab} onTabChange={changeOptionsTab}
          patternBandsAvailable={patternBandsAvailable} groups={displayGroups} values={displayOptions} onFeatureChange={changeDisplayOption} onFeatureReset={resetDisplayOptions} canResetFeatures={canResetFeatures} pending={isPending} templateKey={templateKey} defaults={props.previewDesignDefaults} renderedDesign={renderedDesign} design={designOptions} onDesignChange={changeDesign} alignmentDisabled={device !== "mobile" && hasFixedHeaderAlignment(templateKey, { menu_design_id: defaultDesign?.id })} album={defaultDesign?.itemLayout === "album"}
          featureContent={isDisplayPreview && props.displayPages?.[displayNavigation.page - 1]?.split ? <label className="site-field-stack type-label"><span>이미지 위치</span><select className="site-field" aria-label="디스플레이 이미지 위치" value={templateQuery.displayImagePosition === "right" ? "right" : "left"} disabled={isPending} onChange={event => changeDisplayQuery({ displayImagePosition: event.target.value })}><option value="left">왼쪽</option><option value="right">오른쪽</option></select></label> : undefined}
          designContent={isDisplayPreview && props.previewDesignDefaults ? <DisplayPreviewOptions value={designOptions} defaults={props.previewDesignDefaults} scale={fontSizeScale} pending={isPending} onChange={changeDesign} onScaleChange={scale => changeDisplayQuery({ fontSizeScale: scale })} onReset={() => changeDisplayQuery({ designPreview: undefined, fontSizeScale: undefined })} /> : undefined} /> : null}
      </div>

      <section className={styles.stage} data-preview-stage=""
        tabIndex={0}
        aria-label={`${previewLabel}${orientationLabel ? ` ${orientationLabel}` : ""} 메뉴판 미리보기`}
      >
        <div ref={canvasRef} className={styles.canvas} data-preview-canvas="">
          <div className={styles.scaledFrame} style={{ width: fittedFrame.displayWidth, height: fittedFrame.displayHeight }}>
            <div data-preview-frame-shell="" className={styles.frame}
              style={{ width: fittedFrame.width, height: fittedFrame.height, transform: `scale(${fittedFrame.scale})`, visibility: fittedFrame.scale ? "visible" : "hidden" }}>
              <iframe ref={iframeRef} key={embeddedUrl} src={embeddedUrl}
                title={`${previewLabel}${orientationLabel ? ` ${orientationLabel}` : ""} 메뉴판 미리보기`}
                className="h-full w-full border-0 bg-white" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
