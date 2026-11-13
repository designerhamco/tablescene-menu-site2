"use client";
import headerInformationStyles from "../shared/MenuHeaderInformation.module.css";
import MenuClampedCopy from "../shared/MenuClampedCopy";
import MenuPageScrollSurface from "../shared/MenuPageScrollSurface";
import { getMenuReadingViewportHeight } from "@/lib/menu-page-scroll";
import { measureMenuHeaderContentHeight, MENU_HEADER_CONTENT_SELECTOR } from "@/lib/menu-header-measurement";
import { getRepresentativeRailGeometry } from "@/lib/representative-rail-geometry";
import { getMenuDesignBackgrounds } from "@/lib/template-background-colors";
import { useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";
import {
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ShoppingCart } from "lucide-react";
import { StaffCallIcon } from "@/components/public-menu/order-call/MenuActionIcons";
import type { PublicMenuTemplateProps } from "../types";
import CafeDesignA, {
  CafeATypographyFontAssets,
  CafeACategoryTitle,
  CafeAStoreIdentity,
  CafeAUpperLeftIntro,
  CafeACoverHero,
  CafeLanguageHoverControl,
  CafeMenuImageLightbox,
  CafeATimeSaleClock,
  getFeaturedHeroSlides,
  getTimeSaleByItemId,
  getCategoryPriceRailColumns,
  getCafeAFooterInfo,
} from "../CafeDesignA";
import type { CafeMenuImagePreview } from "../shared/cafe-template-types";
import { OnePageCallPalette, useOnePageCallActions } from "../one-page/OnePageCallControls";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { getPriceDisplayModeFromSettings } from "@/lib/menu-price-format";
import { getCustomBadgeStyles } from "@/lib/template-badge-styles";
import { getResolvedBackgroundColor } from "@/lib/template-background-colors";
import { isMenuCoverVisibleOnDevice } from "@/lib/menu-cover-device-visibility";
import CafeAWidgetBlock, { type CafeAWidgetPreview } from "../CafeAWidgetBlock";
import ScriptAwareText from "../shared/ScriptAwareText";
import PagedMenuItem from "./PagedMenuItem";
import { measureScrollableNames } from "./scroll-name-readability";
import { applyOnePageChipLayouts } from "../one-page-chip-layout";
import { getNextTimeSaleBoundaryMs } from "@/lib/menu-time-sale-schedule";
import {
  useMenuPresentationDevice,
} from "@/components/public-menu/order-call/TableMenuInteractions";
import {
  getCustomTypographySettings,
  getTypographyCssVariables,
  getTypographyCustomColorRoles,
  mergeTypographySettings,
} from "@/lib/template-typography-presets";
import type { MeasuredMenuBlock } from "@/lib/basic-menu-pagination";

import { SCROLL_MIN_COLUMN_WIDTH_REM, layoutScrollableMenu, selectScrollableMenuCandidate, type ScrollableMenuLayout, type ScrollableMenuBlock } from "@/lib/basic-menu-scroll";
import { getCanvasHeaderRatio } from "@/lib/canvas-brand-title-fit";
import { getOnePageItemNameCeilingRem } from "@/lib/one-page-typography-profile";
import { getOrderedFitGapScale } from "../one-page/pc-tablet/cafe-fit-engine";
import { getPcTabletLayoutModeFromPageSettings } from "@/lib/menu-layout-modes";

import { useDefaultAlbum, useDefaultDesignLayout } from "../defaults/DefaultDesignScope";
import type { MenuWidget } from "@/lib/menu-widgets";
import styles from "./RealMatchaPaged.module.css";
const capabilities = getTemplateCapabilities("cafe_design_a");

type Unit = {
  id: string;
  group: string;
  kind: MeasuredMenuBlock["kind"];
  node: ReactNode;
};
function hasSafeCornerIdentity(panel: HTMLElement | null) {
  const intro = panel?.querySelector('[data-upper-left-intro][data-photo="true"]');
  if (!intro) return true;
  const photo = intro.getBoundingClientRect();
  const identity = intro.querySelector('[data-corner-identity]')?.getBoundingClientRect();
  const controls = intro.querySelector('[data-corner-controls]')?.getBoundingClientRect();
  const featured = intro.querySelector('.cafe-a-featured-copy')?.getBoundingClientRect();
  return [identity, controls, featured].every(rect => !rect || rect.left >= photo.left - 1 && rect.right <= photo.right + 1 && rect.top >= photo.top - 1 && rect.bottom <= photo.bottom + 1) &&
    (!identity || !controls || identity.top >= controls.bottom - 1) && (!identity || !featured || identity.bottom <= featured.top - 1);
}
function widgetView(w: MenuWidget): CafeAWidgetPreview {
  const base = {
    id: w.id,
    visible: w.visible,
    placement: w.settings.placement,
  };
  if (w.type === "text")
    return {
      ...base,
      type: "text",
      title: w.title ?? "",
      body: w.description,
      textAlign: w.settings.textAlign ?? "left",
    };
  const media = {
    imageUrl: w.imageUrl,
    altText: w.settings.altText ?? "",
    aspectRatio: w.settings.aspectRatio,
    objectFit: w.settings.objectFit,
    objectPosition: w.settings.objectPosition,
  };
  return w.type === "image"
    ? { ...base, ...media, type: "image" }
    : {
        ...base,
        ...media,
        type: "image_text",
        title: w.title ?? "",
        body: w.description,
        textAlign: w.settings.textAlign ?? "left",
      };
}
export default function RealMatchaPaged(data: PublicMenuTemplateProps) {
  const t = useMenuText();
  const device = useMenuPresentationDevice(data.previewDevice);
  const mobile = device === "mobile";
  const defaultStructure = useDefaultDesignLayout();
  const album = useDefaultAlbum();
  const leftLogo = defaultStructure === "basic-top-row-left-logo";
  const structure = leftLogo ? "basic-top-row" : defaultStructure ?? "basic-first-column";
  const portraitCover = defaultStructure === "basic-first-column" || defaultStructure === "basic-center-column";
  const topRow = structure === "basic-top-row";
  const centerColumn = structure === "basic-center-column";
  const upperLeft = structure === "basic-upper-left";
  const leftColumn = structure === "basic-first-column";
  const layoutMode = data.mode === "preview" && data.previewLayoutMode
    ? data.previewLayoutMode
    : getPcTabletLayoutModeFromPageSettings(data.menuSite.page_settings, "cafe_design_a");
  const area = useRef<HTMLDivElement>(null);
  const brandArea = useRef<HTMLElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const scrollContent = useRef<HTMLDivElement>(null);
  const noticeMeasure = useRef<HTMLDivElement>(null);
  const layoutSignature = useRef("");
  const [layout, setLayout] = useState<ScrollableMenuLayout & {
    capacity: number; ready: boolean; brandOverflow: boolean; columnWidth: number;
  }>({ ...layoutScrollableMenu([], 1, 600), capacity: 600, ready: false, brandOverflow: false, columnWidth: 600 });
  const [moreBelow, setMoreBelow] = useState(false);
  const call = useOnePageCallActions();
  const showCall = call.enabled && call.callEnabled !== false;
  const showOrder = call.enabled && Boolean(call.orderEnabled);
  const updateScrollHint = useCallback(() => {
    const viewport = area.current;
    const content = scrollContent.current?.querySelector<HTMLElement>("[data-scroll-columns], [data-album-sections]");
    // A fill-only bottom safety inset is scrollable, but blank padding alone
    // must not claim that there are more menu items below the viewport.
    setMoreBelow(Boolean(viewport && content && content.getBoundingClientRect().bottom - viewport.getBoundingClientRect().bottom > 2));
  }, []);
  const [imagePreview, setImagePreview] = useState<CafeMenuImagePreview | null>(null);
  const imageTrigger = useRef<HTMLElement | null>(null);
  const openImage = useCallback((preview: CafeMenuImagePreview, trigger: HTMLElement) => {
    imageTrigger.current = trigger;
    setImagePreview(preview);
  }, []);
  const [saleNow, setSaleNow] = useState(data.initialNowMs);
  useEffect(() => {
    const current = Date.now();
    const boundaries = data.timeSales
      .map((s) =>
        getNextTimeSaleBoundaryMs(
          { ...s, active: true, timeZone: "Asia/Seoul" },
          current,
        ),
      )
      .filter((n): n is number => n != null);
    const timer = boundaries.length
      ? window.setTimeout(
          () => setSaleNow(Date.now()),
          Math.max(1, Math.min(...boundaries) - current + 50),
        )
      : null;
    const refresh = () => setSaleNow(Date.now());
    window.addEventListener("focus", refresh);
    return () => {
      if (timer != null) clearTimeout(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [data.timeSales, saleNow]);
  const baseProps = {
    ...data,
    previewDevice: device,
    menuSite: { ...data.menuSite, template_key: "cafe_design_a" },
  };
  const customBadgeStyles = useMemo(() => getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings), [data.menuSite.settings, data.menuSite.page_settings]);
  const priceDisplayMode = getPriceDisplayModeFromSettings(data.menuSite.settings, "cafe_design_a");
  const timeSaleByItemId = useMemo(() => getTimeSaleByItemId(data.timeSales, "cafe_design_a", saleNow), [data.timeSales, saleNow]);
  const featuredSlides = getFeaturedHeroSlides(baseProps, capabilities);
  const showCover = data.pageSettings.menu_cover_enabled && featuredSlides.length > 0 && isMenuCoverVisibleOnDevice(data.pageSettings, device);
  const equalSideRail = leftColumn || (topRow && showCover);
  const typographySettings = mergeTypographySettings(
    "cafe_design_a",
    getCustomTypographySettings(
      data.menuSite.settings,
      data.menuSite.page_settings,
    ),
  );
  const typography = getTypographyCssVariables(
    typographySettings,
    "cafe_design_a",
  );
  const allNotices = getCafeAFooterInfo(baseProps, capabilities);
  const notices = topRow && !leftLogo ? [] : allNotices;

  const units = useMemo(() => {
    const result: Unit[] = [];
    const content = [
      ...data.categories
        .filter((c) => c.visible !== false)
        .map((c) => ({
          kind: "category" as const,
          sort: c.sort_order,
          value: c,
        })),
      ...(data.widgets ?? [])
        .filter((w) => w.visible)
        .map((w) => ({ kind: "widget" as const, sort: w.sortOrder, value: w })),
    ].sort((a, b) => a.sort - b.sort);
    for (const block of content) {
      if (block.kind === "widget") {
        const w = block.value;
        const ratio =
          w.type === "text"
            ? 1
            : Number(w.settings.aspectRatio.split(":")[0]) /
              Number(w.settings.aspectRatio.split(":")[1]);
        result.push({
          id: w.id,
          group: w.id,
          kind: "widget",
          node: (
            <div
              className={styles.widget}
              style={
                w.type === "text"
                  ? undefined
                  : {
                      maxWidth: `min(100%, calc(var(--paged-capacity, 600px) * ${ratio * 0.6}))`,
                    }
              }
            >
              <CafeAWidgetBlock widget={widgetView(w)} />
            </div>
          ),
        });
        continue;
      }
      const category = block.value;
      const items = data.items
        .filter((i) => i.visible !== false && i.category_id === category.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      if (!items.length) continue;
      const priceRailColumns = getCategoryPriceRailColumns({ category, items, timeSaleByItemId, templateKey: "cafe_design_a", priceDisplayMode, nowMs: saleNow });
      result.push({
        id: "heading-" + category.id,
        group: category.id,
        kind: "heading",
        node: (
          <CafeACategoryTitle category={category} density="default" priceRailColumns={priceRailColumns} />
        ),
      });
      for (const item of items) {
        result.push({
          id: item.id,
          group: category.id,
          kind: "item",
          node: (
            <PagedMenuItem
              item={item}
              category={category}
              priceOptions={data.priceOptions}
              traits={data.traits.filter((trait) => trait.menu_item_id === item.id && trait.visible !== false)}
              capabilities={capabilities}
              density="default"
              templateKey="cafe_design_a"
              timeSale={timeSaleByItemId.get(item.id)}
              customBadgeStyles={customBadgeStyles}
              locale={data.locale}
              priceDisplayMode={priceDisplayMode}
              priceRailColumns={priceRailColumns}
              previewDevice={device}
              onOpenImage={openImage}
            />
          ),
        });
      }
    }
    return result;
  // Rebuild measurements for content, role fonts, features and sale boundaries.
  // Countdown ticks stay inside the original sale component.
  }, [data, timeSaleByItemId, device, saleNow, customBadgeStyles, priceDisplayMode, openImage]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  useLayoutEffect(() => {
    if (mobile || album || !area.current || !measure.current) return;
    let disposed = false,
      raf = 0;
    const rejectedRailColumns = new Set<number>();
    const rejectedPhotoColumns = new Set<number>();
    let railFrameKey = "";
    const update = () => {
      if (disposed || !area.current || !measure.current) return;
      const bounds = area.current.getBoundingClientRect();
      if (bounds.width <= 1 || (bounds.height <= 1 && !topRow)) return;
      const menuStyle = getComputedStyle(area.current);
      const regionWidth = Math.min(area.current.clientWidth, bounds.width - (area.current.offsetWidth - area.current.clientWidth)) - parseFloat(menuStyle.paddingLeft) - parseFloat(menuStyle.paddingRight);
      const panelInset = upperLeft ? parseFloat(getComputedStyle(area.current.querySelector<HTMLElement>("[data-paged-column]")!).paddingLeft) || 0 : 0;
      const capacity = getMenuReadingViewportHeight(area.current, bounds.height - parseFloat(menuStyle.paddingTop) - parseFloat(menuStyle.paddingBottom) - 2 * panelInset);
      const gap = parseFloat(menuStyle.columnGap) || 24;
      const brandWidth = brandArea.current?.getBoundingClientRect().width ?? 0;
      const width = centerColumn ? regionWidth - brandWidth - gap : regionWidth;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const root = area.current.closest<HTMLElement>("[data-scroll-template]")!;
      const boardStyle = getComputedStyle(root);
      const brandStyle = brandArea.current ? getComputedStyle(brandArea.current) : null;
      const menuPanelStyle = getComputedStyle(area.current.closest<HTMLElement>("[data-scroll-menu-panel]")!);
      const brandMargin = (parseFloat(brandStyle?.marginLeft ?? "0") || 0) + (parseFloat(brandStyle?.marginRight ?? "0") || 0);
      const boardWidth = root.getBoundingClientRect().width - parseFloat(boardStyle.paddingLeft) - parseFloat(boardStyle.paddingRight)
        - brandMargin - (parseFloat(menuPanelStyle.marginLeft) || 0) - (parseFloat(menuPanelStyle.marginRight) || 0);
      const panelPadding = (parseFloat(brandStyle?.paddingLeft ?? "0") || 0) + (parseFloat(brandStyle?.paddingRight ?? "0") || 0);
      const scrollbar = area.current.offsetWidth - area.current.clientWidth;
      const railGeometry = (count: number) => getRepresentativeRailGeometry(boardWidth, panelPadding, parseFloat(boardStyle.columnGap), count, scrollbar, gap);
      const frameKey = `${boardWidth}|${root.clientHeight}`;
      if (frameKey !== railFrameKey) { rejectedRailColumns.clear(); rejectedPhotoColumns.clear(); railFrameKey = frameKey; }
      if (upperLeft && !hasSafeCornerIdentity(brandArea.current)) {
        rejectedPhotoColumns.add(Number(root.dataset.scrollColumns));
      }
      // The menu region already excludes the fixed brand column and its gutter.
      // Automatic tracks stop at three. Overflow stays on the scroll surface.
      const maxColumns = Math.max(1, Math.min(centerColumn ? 2 : 3, Math.floor((width + gap) / (SCROLL_MIN_COLUMN_WIDTH_REM * rem + gap))));
      if (upperLeft) {
        const boardStyle = getComputedStyle(root);
        const innerHeight = root.clientHeight - parseFloat(boardStyle.paddingTop) - parseFloat(boardStyle.paddingBottom);
        root.style.setProperty("--scroll-corner-height", `${Math.min(30 * rem, innerHeight * .56)}px`);
      }
      root.style.setProperty("--scroll-center-slot", `${brandWidth}px`);
      const grouped = layoutMode !== "orderedFit";
      const collect = (columnCount: number, reference = false) => {
        measure.current!.toggleAttribute("data-cafe-a-three-part-reference", reference);
        // Match fractional CSS grid widths; integer clientWidth can cross a text-wrap boundary.
        const columnWidth = equalSideRail ? railGeometry(columnCount).trackWidth : Math.min(columnCount === 1 && !upperLeft ? 40 * rem : Infinity, (width - (columnCount - 1) * gap) / columnCount) - 2 * panelInset;
        measure.current!.style.width = `${columnWidth}px`;
        applyOnePageChipLayouts(measure.current!);
        const measured = units.map(u => {
          const element = measure.current!.querySelector<HTMLElement>(`[data-measure-id="${u.id}"]`)!;
          const rhythm = Number(element.querySelector<HTMLElement>("[data-cafe-a-item-rhythm]")?.dataset.cafeAItemRhythm ?? 1);
          element.style.setProperty("--scroll-item-rhythm", String(reference && u.kind === "item" ? 1.2 : rhythm));
          const gapAfter = parseFloat(getComputedStyle(element).paddingBottom) || 0;
          return { id: u.id, group: u.group, kind: u.kind,
            height: element.getBoundingClientRect().height,
            gapAfter };
        });
        root.style.setProperty("--scroll-track-width", `${columnWidth}px`);
        const cornerStyle = upperLeft && brandArea.current ? getComputedStyle(brandArea.current) : null;
        const firstColumnInset = upperLeft ? (brandArea.current?.getBoundingClientRect().height ?? 0) + (parseFloat(cornerStyle?.marginTop ?? "0") || 0) + (parseFloat(cornerStyle?.marginBottom ?? "0") || 0) : 0;
        root.style.setProperty("--scroll-first-inset", `${firstColumnInset}px`);
        const footerHeight = noticeMeasure.current?.getBoundingClientRect().height ?? 0;
        const candidate = { columnCount, columnWidth, representativeSafe: !upperLeft || !rejectedPhotoColumns.has(columnCount) && hasSafeCornerIdentity(brandArea.current), layout: layoutScrollableMenu(measured, columnCount, capacity, grouped, { footerHeight, firstColumnInset }) };
        measure.current!.removeAttribute("data-cafe-a-three-part-reference");
        return candidate;
      };
      const setSize = (size: number, readingWidth = width) => {
        root.style.setProperty("--scroll-item-size", `${size}px`);
        // The original shared gap mapper and 0.74 rhythm coefficient remain authoritative.
        const base = Math.min(1.08 * rem, 0.88 * rem + Math.min(innerWidth, innerHeight) * 0.002);
        root.style.setProperty("--fit-menu-gap-scale", String(getOrderedFitGapScale(size / base, readingWidth)));
      };
      // Grouping changes partition boundaries, never the shared reading size.
      const counts = centerColumn ? [2] : equalSideRail ? [1, 2, 3].filter(count => count === 1 || (!rejectedRailColumns.has(count) && railGeometry(count).trackWidth >= SCROLL_MIN_COLUMN_WIDTH_REM * rem)) : Array.from({ length: maxColumns }, (_, index) => index + 1);
      const candidates = counts.map(count => {
        const ceiling = (getOnePageItemNameCeilingRem(device) ?? 1.3) * rem;
        // Compare names at one shared reading size. Shrinking a cramped 3-track
        // candidate must not disguise its width/wrapping cost during selection.
        setSize(ceiling, equalSideRail ? railGeometry(count).menuWidth : width);
        const natural = collect(count);
        const names = measureScrollableNames(measure.current!);
        return { ...natural, itemSize: ceiling, names };
      });
      const photoSafe = candidates.filter(candidate => candidate.representativeSafe);
      const selected = selectScrollableMenuCandidate(photoSafe.length ? photoSafe : candidates.slice(0, 1), grouped) as typeof candidates[number];
      if (equalSideRail) {
        const geometry = railGeometry(selected.columnCount);
        root.style.setProperty("--scroll-rail-width", `${geometry.railWidth + brandMargin}px`);
        root.dataset.representativeContentWidth = String(geometry.trackWidth);
      }
      setSize(selected.itemSize, equalSideRail ? railGeometry(selected.columnCount).menuWidth : width);
      collect(selected.columnCount); // Restore final-width chip/rhythm measurements after probes.
      measure.current!.style.width = `${selected.columnWidth}px`;
      const brandBounds = brandArea.current?.getBoundingClientRect();
      const brandOverflow = Boolean(brandBounds && [...(brandArea.current?.children ?? [])].some(node => node.getBoundingClientRect().bottom > brandBounds.bottom + 1));
      const title = brandArea.current?.querySelector<HTMLElement>("[data-canvas-brand-fit]");
      if (leftColumn && brandOverflow && selected.columnCount > 1 && title?.dataset.canvasBrandFit === "ready" &&
        Math.abs(Number(title.dataset.canvasBrandWidth) - railGeometry(selected.columnCount).trackWidth) < 1) {
        rejectedRailColumns.add(selected.columnCount);
        setLayout(previous => ({ ...previous, ready: false }));
        raf = requestAnimationFrame(update);
        return;
      }
      const next = { ...selected.layout, columnWidth: selected.columnWidth, capacity: selected.layout.height, ready: !brandOverflow, brandOverflow };
      const signature = JSON.stringify([next, units.map(u => u.id)]);
      if (signature !== layoutSignature.current) {
        layoutSignature.current = signature;
        setLayout(next);
      }
      updateScrollHint();
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(area.current);
    const readingBoard = area.current.closest('[data-scroll-brand-board]');
    if (readingBoard) observer.observe(readingBoard);
    for (const node of area.current.closest('[data-scroll-brand-board]')?.querySelectorAll('[data-basic-top-row], [data-menu-page-actions]') ?? []) observer.observe(node);
    // Probe row sizes are measurement outputs, not independent resize inputs.
    const measuredContent = measure.current;
    measuredContent.addEventListener("load", schedule, true);
    if (brandArea.current)
      for (const node of brandArea.current.children) observer.observe(node);
    const cornerIdentity = brandArea.current?.querySelector("[data-corner-identity]");
    if (cornerIdentity) observer.observe(cornerIdentity);
    const fontsChanged = () => { rejectedRailColumns.clear(); rejectedPhotoColumns.clear(); schedule(); };
    document.fonts.ready.then(fontsChanged);
    document.fonts.addEventListener("loadingdone", fontsChanged);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      measuredContent.removeEventListener("load", schedule, true);
      document.fonts.removeEventListener("loadingdone", fontsChanged);
    };
  }, [mobile, album, units, layoutMode, showCall, showOrder, device, updateScrollHint, centerColumn, upperLeft, topRow, leftColumn, leftLogo, equalSideRail]);
  // Album flow does not use list packing, but its fixed identity still needs
  // the same actual overflow guard before reporting a settled layout.
  useLayoutEffect(() => {
    if (!album || mobile || !area.current) return;
    const viewport = area.current;
    let frame = 0, disposed = false, albumRailColumns = 3, railFrameKey = "";
    const check = () => {
      frame = 0;
      if (disposed) return;
      const panel = brandArea.current;
      const root = viewport.closest<HTMLElement>("[data-scroll-brand-board]");
      if (equalSideRail && root && panel) {
        const style = getComputedStyle(root), panelStyle = getComputedStyle(panel);
        const frameKey = `${root.clientWidth}|${root.clientHeight}`;
        if (frameKey !== railFrameKey) { albumRailColumns = 3; railFrameKey = frameKey; }
        const menuPanelStyle = getComputedStyle(viewport.closest<HTMLElement>("[data-scroll-menu-panel]")!);
        const brandMargin = (parseFloat(panelStyle.marginLeft) || 0) + (parseFloat(panelStyle.marginRight) || 0);
        const geometryFor = (columns: number) => getRepresentativeRailGeometry(
          root.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
            - brandMargin - (parseFloat(menuPanelStyle.marginLeft) || 0) - (parseFloat(menuPanelStyle.marginRight) || 0),
          parseFloat(panelStyle.paddingLeft) + parseFloat(panelStyle.paddingRight),
          parseFloat(style.columnGap), columns, viewport.offsetWidth - viewport.clientWidth,
          parseFloat(getComputedStyle(viewport).columnGap),
        );
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        while (albumRailColumns > 1 && geometryFor(albumRailColumns).trackWidth < SCROLL_MIN_COLUMN_WIDTH_REM * rem) albumRailColumns--;
        root.style.setProperty("--scroll-album-columns", String(albumRailColumns));
        const geometry = geometryFor(albumRailColumns);
        root.style.setProperty("--scroll-rail-width", `${geometry.railWidth + brandMargin}px`);
        root.dataset.representativeContentWidth = String(geometry.trackWidth);
      }
      viewport.style.setProperty("--paged-album-capacity", `${getMenuReadingViewportHeight(area.current!, viewport.clientHeight) - (scrollContent.current ? parseFloat(getComputedStyle(scrollContent.current).paddingBottom) || 0 : 0)}px`);
      const bounds = panel?.getBoundingClientRect();
      const header = viewport.closest("[data-scroll-brand-board]")?.querySelector<HTMLElement>("[data-basic-top-row]");
      const headerBounds = header?.getBoundingClientRect();
      const brandOverflow = Boolean(bounds && bounds.height > 0 && [...(panel?.children ?? [])].some(node => node.getBoundingClientRect().bottom > bounds.bottom + 1)) ||
        Boolean(headerBounds && [...(header?.children ?? [])].some(node => node.getBoundingClientRect().bottom > headerBounds.bottom + 1));
      const title = panel?.querySelector<HTMLElement>("[data-canvas-brand-fit]");
      if (leftColumn && brandOverflow && albumRailColumns > 1 && root && title?.dataset.canvasBrandFit === "ready" &&
        Math.abs(Number(title.dataset.canvasBrandWidth) - Number(root.dataset.representativeContentWidth)) < 1) {
        albumRailColumns--;
        setLayout(previous => ({ ...previous, ready: false }));
        frame = requestAnimationFrame(check);
        return;
      }
      setLayout(previous => previous.ready === !brandOverflow && previous.brandOverflow === brandOverflow ? previous : { ...previous, ready: !brandOverflow, brandOverflow });
      updateScrollHint();
    };
    const schedule = () => { if (disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(check); };
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    const readingBoard = viewport.closest('[data-scroll-brand-board]');
    if (readingBoard) observer.observe(readingBoard);
    if (brandArea.current) for (const node of brandArea.current.children) observer.observe(node);
    const header = viewport.closest("[data-scroll-brand-board]")?.querySelector("[data-basic-top-row]");
    if (header) observer.observe(header);
    const fontsChanged = () => { albumRailColumns = 3; schedule(); };
    document.fonts.addEventListener("loadingdone", fontsChanged);
    void document.fonts.ready.then(fontsChanged);
    schedule();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts.removeEventListener("loadingdone", fontsChanged); };
  }, [album, mobile, units, updateScrollHint, leftColumn, equalSideRail]);
  // A logo replaces CanvasBrandTitle, but must retain its shared header budget.
  useLayoutEffect(() => {
    if (mobile || !topRow || !defaultStructure || !data.menuSite.logo_url) return;
    const board = area.current?.closest<HTMLElement>("[data-scroll-brand-board]");
    const header = board?.querySelector<HTMLElement>("[data-basic-top-row]");
    const logo = header?.querySelector<HTMLImageElement>("[data-default-design-logo]");
    const slot = logo?.closest<HTMLElement>(".cafe-a-store-logo-wrap");
    if (!board || !header || !logo || !slot) return;
    let frame = 0, disposed = false;
    const measureLogoHeader = () => {
      frame = 0;
      if (disposed || !logo.isConnected) return;
      board.style.setProperty("--cafe-a-header-gap-scale", "1");
      const style = getComputedStyle(board);
      const height = board.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - parseFloat(style.rowGap);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const naturalRatio = Number(logo.closest<HTMLElement>("[data-menu-logo-slot]")?.dataset.menuLogoRatio) || (logo.naturalWidth > 0 ? logo.naturalHeight / logo.naturalWidth : 0);
      const desiredLogoHeight = Math.min(slot.clientWidth * .75 * naturalRatio / .8, innerHeight * .2, 12 * rem);
      const sideHeight = measureMenuHeaderContentHeight(header);
      const headerStyle = getComputedStyle(header);
      const padding = (parseFloat(headerStyle.paddingTop) || 0) + (parseFloat(headerStyle.paddingBottom) || 0);
      // Copy sets a real minimum; the compact title/logo budget must not crop it.
      board.style.setProperty("--cafe-a-header-copy-height", `${Math.ceil(sideHeight + padding)}px`);
      const ratio = getCanvasHeaderRatio(height, 0, 0, 1, Math.max(desiredLogoHeight, sideHeight) + padding);
      board.style.setProperty("--cafe-a-header-fr", `${ratio * 100}fr`);
      board.style.setProperty("--cafe-a-body-fr", `${(1 - ratio) * 100}fr`);
      board.dataset.fitHeaderRatio = String(ratio);
      board.dataset.fitHeaderGapScale = "1";
      board.dataset.fitHeaderBrandLines = "logo";
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(measureLogoHeader); };
    const observer = new ResizeObserver(schedule);
    observer.observe(board);
    observer.observe(slot);
    for (const element of header.querySelectorAll(MENU_HEADER_CONTENT_SELECTOR)) observer.observe(element);
    const copyObserver = new MutationObserver(schedule);
    copyObserver.observe(header, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["data-menu-logo-ratio"] });
    logo.addEventListener("load", schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    void document.fonts.ready.then(schedule);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      copyObserver.disconnect();
      logo.removeEventListener("load", schedule);
      document.fonts.removeEventListener("loadingdone", schedule);
      for (const property of ["--cafe-a-header-fr", "--cafe-a-body-fr", "--cafe-a-header-gap-scale", "--cafe-a-header-copy-height"]) board.style.removeProperty(property);
      delete board.dataset.fitHeaderRatio;
      delete board.dataset.fitHeaderGapScale;
      delete board.dataset.fitHeaderBrandLines;
    };
  }, [mobile, topRow, defaultStructure, data.menuSite.logo_url]);
  useLayoutEffect(() => {
    if (mobile || !area.current || !scrollContent.current) return;
    const observer = new ResizeObserver(updateScrollHint);
    observer.observe(area.current);
    observer.observe(scrollContent.current);
    updateScrollHint();
    applyOnePageChipLayouts(scrollContent.current);
    return () => observer.disconnect();
  }, [mobile, updateScrollHint, layout]);
  if (mobile)
    return (
      <div className={styles.mobile} data-paged-mobile data-basic-structure={structure} data-portrait-cover={portraitCover ? "true" : undefined}>
        <CafeDesignA {...baseProps} />
      </div>
    );
  const unit = (block: ScrollableMenuBlock, last: boolean, hasFooter: boolean, nextKind?: Unit["kind"] | "notices") => {
    const id = block.id;
    const value = unitById.get(id);
    if (!value) return null;
    return (
      <div
        key={id}
        className={styles.unit}
        data-kind={value.kind}
        data-next-kind={nextKind}
        data-paged-block={id}
        style={{ "--scroll-base-gap": `${block.gapAfter ?? 0}px`, ...(last && !hasFooter ? { paddingBottom: 0 } : {}) } as CSSProperties & Record<`--${string}`, string | number>}
      >
        {value.node}
      </div>
    );
  };
  const albumGroup = (first: Unit) => {
    const group = units.filter(value => value.group === first.group);
    return <section key={first.group} data-album-category>
      {group.filter(value => value.kind !== "item").map(value => <div key={value.id}>{value.node}</div>)}
      {group.some(value => value.kind === "item") ? <div className={styles.albumGrid} data-album-grid>{group.filter(value => value.kind === "item").map(value => <div key={value.id}>{value.node}</div>)}</div> : null}
    </section>;
  };
  const albumGroups = units.filter((value, index) => index === 0 || value.group !== units[index - 1].group);
  const noticeCopy = !notices.length ? null : topRow
    ? <MenuClampedCopy text={notices.join("\n")} />
    : notices.map((notice, index) => <p key={index}><ScriptAwareText text={notice} /></p>);
  const footerNotices = notices.length ? <div className={`${styles.notices} cafe-a-description-text cafe-a-menu-description`} data-paged-notices>{noticeCopy}</div> : null;
  const languageControl = <div className={styles.brandControls} data-paged-controls><CafeLanguageHoverControl data={baseProps} menuAlign={topRow ? "right" : "left"} iconOnly /></div>;
  const storeIdentity = <CafeAStoreIdentity data={baseProps} capabilities={capabilities}
    titleClassName="cafe-a-store-title cafe-a-rail-title" logoClassName={styles.logo}
    layoutShell={topRow ? "brand_top_band" : centerColumn ? "brand_center_column" : "brand_left_rail"} />;
  const storeDescription = (data.menuSite.brand_description || data.menuSite.description)
    ? topRow ? <MenuClampedCopy data-representative-copy data-scroll-header-copy text={data.menuSite.brand_description || data.menuSite.description || ""} className="cafe-a-description-text cafe-a-menu-description cafe-a-store-description whitespace-pre-line text-[#3f4945]" />
      : <p data-menu-store-description data-representative-copy data-scroll-header-copy className="cafe-a-description-text cafe-a-menu-description cafe-a-store-description whitespace-pre-line text-[#3f4945]"><ScriptAwareText text={data.menuSite.brand_description || data.menuSite.description || ""} /></p> : null;
  const actionFooter = showCall || showOrder || call.terminalConnected ? (
            <footer className={styles.footer} data-scroll-actions data-menu-page-actions aria-label={t("메뉴 이용")}>
              {call.terminalConnected ? <span className={styles.tableLabel} data-terminal-table-label title={call.tableLabel}>{call.tableLabel}</span> : null}
              {showCall ? (
                <button type="button" className={styles.callButton} onClick={call.openCall} aria-label={t("직원 호출하기")} data-scroll-call>
                  <StaffCallIcon aria-hidden="true" strokeWidth={1.8} /><ScriptAwareText text={t("호출하기")} />
                </button>
              ) : null}
              {showOrder ? (
                <button type="button" className={styles.orderButton} onClick={call.openCart} aria-label={t("주문하기, 장바구니 {0}개", call.cartCount ?? 0)} data-scroll-order>
                  <ShoppingCart aria-hidden="true" strokeWidth={1.8} /><ScriptAwareText text={t("주문하기")} />
                  {(call.cartCount ?? 0) > 0 ? <span aria-hidden="true">({call.cartCount})</span> : null}
                </button>
              ) : null}
            </footer>
          ) : null;
  const brandPanel = <aside ref={brandArea} className={styles.brand} data-paged-brand>
          {upperLeft ? <CafeAUpperLeftIntro data={baseProps} /> : <>
          {!topRow ? <>{languageControl}<div className={styles.identity} data-representative-copy>{storeIdentity}{storeDescription}</div></> : null}
          {showCover ? (portraitCover ? <div className={styles.portraitCoverSlot} data-portrait-cover-slot><CafeACoverHero data={baseProps} featuredSlides={featuredSlides} capabilities={capabilities} density="default" customBadgeStyles={customBadgeStyles} priceDisplayMode={priceDisplayMode} desktopClassName={styles.cover} /></div> : <CafeACoverHero data={baseProps} featuredSlides={featuredSlides} capabilities={capabilities} density="default" customBadgeStyles={customBadgeStyles} priceDisplayMode={priceDisplayMode} desktopClassName={styles.cover} />) : null}
          {centerColumn ? actionFooter : null}
          </>}
        </aside>;
  return (
    <CafeATimeSaleClock value={saleNow}>
      <CafeATypographyFontAssets typographySettings={typographySettings} />
      <MenuPageScrollSurface enabled={topRow} background={getResolvedBackgroundColor("cafe_design_a", data.menuSite.page_settings)} label={t("메뉴 내용")}>
      <main
        className={`menu-typography cafe-a-typography ${styles.frame}`}
        style={
          {
            ...typography,
            backgroundColor: getResolvedBackgroundColor("cafe_design_a", data.menuSite.page_settings),
            "--scroll-background": getResolvedBackgroundColor("cafe_design_a", data.menuSite.page_settings),
            "--paged-capacity": layout.capacity + "px",
            "--scroll-min-column-width": `${SCROLL_MIN_COLUMN_WIDTH_REM}rem`,
            ...(album ? { "--scroll-item-size": `${getOnePageItemNameCeilingRem(device) ?? 1.3}rem` } : {}),
            "--paged-gap-scale": 1,
          } as CSSProperties
        }
        data-menu-text-colors={getTypographyCustomColorRoles(typographySettings)}
        data-scroll-brand-board
        data-menu-page-flow={topRow ? "true" : undefined}
        data-equal-side-rail={equalSideRail ? "true" : undefined}
        data-basic-structure={structure} data-representative-panel={getMenuDesignBackgrounds("cafe_design_a", data.menuSite.page_settings).coloredPanel ? "true" : undefined}
        data-default-reading={defaultStructure ? "true" : undefined}
        data-show-cover={showCover ? "true" : "false"}
        data-template-key="cafe_design_a"
        data-paged-template-key="cafe_real_matcha_paged_test"
        data-preview-device={device}
        data-cafe-a-proportion-policy="true"
        data-cafe-a-adaptive-fit="true"
        data-cafe-a-copy-aware-rhythm="true"
        data-cafe-a-mobile-style="false"
        data-spacing-contract="contained-reading"
        data-paged-ready={layout.ready ? "true" : "false"}
        data-scroll-template="real-matcha"
        data-scroll-more={moreBelow ? "true" : "false"}
        data-paged-layout={layoutMode}
        data-scroll-columns={album ? undefined : layout.columns.length}
        data-scroll-content-height={layout.contentHeight}
      >
        <OnePageCallPalette />
        {topRow ? <header className={`${styles.topRow} ${headerInformationStyles.header}`} data-basic-top-row data-basic-header-align={leftLogo ? "left" : undefined} data-menu-header-shared-rows={leftLogo ? undefined : "true"}>
          {!leftLogo ? <div className={headerInformationStyles.description}>{storeDescription}</div> : null}
          <div className={`${styles.topIdentity} ${headerInformationStyles.identity}`}>{storeIdentity}</div>
          <div className={headerInformationStyles.stack} data-menu-header-info-stack>
            {leftLogo ? languageControl : <div className={headerInformationStyles.tools}>{languageControl}</div>}
            {leftLogo ? storeDescription : null}
            {!leftLogo && allNotices.length ? <div className={`${styles.notices} cafe-a-description-text cafe-a-menu-description`} data-paged-notices>
              <MenuClampedCopy data-scroll-header-copy text={allNotices.join("\n")} />
            </div> : null}
          </div>
        </header> : null}
        {!upperLeft ? brandPanel : null}
        <div data-scroll-menu-panel className={styles.menuPanel} data-paged-menu-panel>
          <div className={styles.viewport} data-scroll-viewport>
            <div
              role={topRow ? undefined : "region"}
              tabIndex={topRow ? undefined : 0}
              className={styles.menu}
              ref={area}
              aria-label={topRow ? undefined : t("메뉴 내용")}
              onScroll={updateScrollHint}
              style={{ "--paged-columns": layout.columns.length } as CSSProperties}
              data-scroll-menu
            >
              <div className={styles.measure} ref={measure} aria-hidden="true" inert>
                {units.map((u, index) => (
                  <div key={u.id} className={styles.unit} data-kind={u.kind} data-next-kind={units[index + 1]?.kind ?? (notices.length ? "notices" : undefined)} data-measure-id={u.id}>
                    {u.node}
                  </div>
                ))}
                <div ref={noticeMeasure} className={`${styles.notices} cafe-a-description-text cafe-a-menu-description`}>
                  {noticeCopy}
                </div>
              </div>
              <div ref={scrollContent} className={styles.scrollContent} data-scroll-content>
                {!units.length ? <p role="status">{t("메뉴를 준비하고 있어요.")}</p> : null}
                {album ? <div className={styles.albumSections} data-album-sections style={{ minHeight: "var(--paged-album-capacity, 0px)" }}>
                  {albumGroups.map(albumGroup)}
                  {footerNotices}
                </div> : <div className={styles.columns} data-scroll-columns style={{ height: upperLeft ? `calc(${layout.contentHeight}px + 2 * var(--scroll-panel-inset))` : layout.contentHeight, maxWidth: layout.columns.length === 1 && !upperLeft && !centerColumn ? layout.columnWidth : undefined }}>
                  {layout.columns.map((column, i) => {
                    return <div key={i} className={styles.column} data-paged-column={i + 1}
                      data-scroll-natural-height={layout.naturalHeights[i]}>
                      {upperLeft && i === 0 ? brandPanel : null}
                      {column.map((b, index) => <div key={b.id}>
                        {unit(b, index === column.length - 1, i === layout.footerColumn && notices.length > 0,
                          column[index + 1]?.kind ?? (i === layout.footerColumn && notices.length ? "notices" : undefined))}
                      </div>)}
                      {i === layout.footerColumn ? <div className={`${styles.notices} cafe-a-description-text cafe-a-menu-description`}
                        data-paged-notices>
                        {noticeCopy}
                      </div> : null}
                    </div>;
                  })}
                </div>}
              </div>
            </div>
            <div className={styles.fade} data-scroll-fade aria-hidden="true" />
          </div>
          {!centerColumn ? actionFooter : null}
          {layout.brandOverflow ? <p role="alert" className={styles.error}>{t("대표영역의 이미지 비율 또는 설명 길이를 조정해 주세요.")}</p> : null}
        </div>
        <CafeMenuImageLightbox preview={imagePreview} templateKey="cafe_design_a" onClose={() => { setImagePreview(null); imageTrigger.current?.focus({preventScroll: true}); }} />
      </main>
      </MenuPageScrollSurface>
    </CafeATimeSaleClock>
  );
}
