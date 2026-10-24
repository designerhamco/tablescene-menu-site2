"use client";
import { getRepresentativeRailGeometry } from "@/lib/representative-rail-geometry";
import { getMenuDesignBackgrounds } from "@/lib/template-background-colors";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ShoppingCart } from "lucide-react";
import {
  CafeACategoryTitle, CafeAMenuItemRow, CafeACoverHero, CafeADesktopFixedRail,
  CafeADesktopToplineInformationHeader, CafeADesktopToplineFeaturedSlot, CafeAPanelFlowIntro,
  CafeATypographyFontAssets, CafeATimeSaleClock, CafeLanguageHoverControl, CafeMenuImageLightbox,
  getFeaturedHeroSlides, getTimeSaleByItemId, getCategoryPriceRailColumns, getCafeAFooterInfo, getVisibleMenuPageGroups,
} from "../CafeDesignA";
import CafeAWidgetBlock from "../CafeAWidgetBlock";
import ScriptAwareText from "../shared/ScriptAwareText";
import { useMenuText } from "../shared/MenuLocaleScope";
import type { CafeDesignAProps, CafeMenuImagePreview } from "../shared/cafe-template-types";
import { getFlatContentBlocks } from "../one-page/pc-tablet/cafe-fit-engine";
import { OnePageCallPalette, useOnePageCallActions } from "./OnePageCallControls";
import { StaffCallIcon } from "@/components/public-menu/order-call/MenuActionIcons";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { getFixedOnePageLayoutShell } from "@/lib/one-page-layout-shells";
import { getOnePageItemNameCeilingRem, getOnePageTypographyProfile } from "@/lib/one-page-typography-profile";
import { getOrderedFitGapScale } from "./pc-tablet/cafe-fit-engine";
import { layoutScrollableMenu, selectScrollableMenuCandidate, type ScrollableMenuLayout } from "@/lib/basic-menu-scroll";
import { measureScrollableNames } from "../experimental/scroll-name-readability";
import { applyOnePageChipLayouts } from "../one-page-chip-layout";
import { getPcTabletLayoutModeFromPageSettings } from "@/lib/menu-layout-modes";
import { getCustomTypographySettings, getTypographyCssVariables, getTypographyCustomColorRoles, mergeTypographySettings } from "@/lib/template-typography-presets";
import { getCustomBadgeStyles } from "@/lib/template-badge-styles";
import { getPriceDisplayModeFromSettings } from "@/lib/menu-price-format";
import { getResolvedBackgroundColor } from "@/lib/template-background-colors";
import { isMenuCoverVisibleOnDevice } from "@/lib/menu-cover-device-visibility";
import { MOCHA_FOREST_PANEL_COLORS } from "@/lib/mocha-forest-panels";
import { getNextTimeSaleBoundaryMs } from "@/lib/menu-time-sale-schedule";
import { getCanvasHeaderRatio } from "@/lib/canvas-brand-title-fit";
import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";
import styles from "./NativeBasicScroll.module.css";

type Unit = { id: string; group: string; kind: "heading" | "item" | "widget"; node: ReactNode; };

/** Native skin primitives own appearance. This component only replaces canvas
 * compression with measured, ordered reading tracks and a fixed service dock. */
export default function NativeBasicScroll({ data, device }: { data: CafeDesignAProps; device: MenuPreviewDevice }) {
  const t = useMenuText();
  const key = data.menuSite.template_key;
  const shell = getFixedOnePageLayoutShell(key);
  const center = shell === "brand_center_column";
  const top = shell === "brand_top_band";
  const panel = shell === "brand_panel_flow";
  const mocha = data.templateSkin === "mocha_forest";
  const capabilities = useMemo(() => getTemplateCapabilities(key), [key]);
  const typography = mergeTypographySettings(key, getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings));
  const badges = useMemo(() => getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings), [data.menuSite.settings, data.menuSite.page_settings]);
  const priceMode = getPriceDisplayModeFromSettings(data.menuSite.settings, key);
  const grouped = (data.mode === "preview" && data.previewLayoutMode ? data.previewLayoutMode : getPcTabletLayoutModeFromPageSettings(data.menuSite.page_settings, key)) !== "orderedFit";
  const call = useOnePageCallActions();
  const showCall = call.enabled && call.callEnabled !== false;
  const showOrder = call.enabled && call.orderEnabled;
  const background = mocha ? MOCHA_FOREST_PANEL_COLORS.ivory : getResolvedBackgroundColor(key, data.menuSite.page_settings);
  const slides = getFeaturedHeroSlides(data, capabilities);
  const cover = data.pageSettings.menu_cover_enabled !== false && slides.length > 0 && isMenuCoverVisibleOnDevice(data.pageSettings, device);
  const notices = getCafeAFooterInfo(data, capabilities);
  const [now, setNow] = useState(data.initialNowMs);
  useLayoutEffect(() => {
    const current = Date.now();
    const boundary = data.timeSales.map(s => getNextTimeSaleBoundaryMs({ ...s, active: true, timeZone: "Asia/Seoul" }, current)).filter((n): n is number => n != null);
    const timer = boundary.length ? window.setTimeout(() => setNow(Date.now()), Math.max(1, Math.min(...boundary) - current + 50)) : null;
    const refresh = () => setNow(Date.now());
    window.addEventListener("focus", refresh);
    return () => { if (timer != null) clearTimeout(timer); window.removeEventListener("focus", refresh); };
  }, [data.timeSales, now]);
  const sales = useMemo(() => getTimeSaleByItemId(data.timeSales, key, now), [data.timeSales, key, now]);
  const [image, setImage] = useState<CafeMenuImagePreview | null>(null);
  const imageTrigger = useRef<HTMLElement | null>(null);
  const openImage = useCallback((preview: CafeMenuImagePreview, trigger: HTMLElement) => { imageTrigger.current = trigger; setImage(preview); }, []);
  const closeImage = () => { setImage(null); requestAnimationFrame(() => imageTrigger.current?.focus({ preventScroll: true })); };
  const units = useMemo(() => {
    const result: Unit[] = [];
    if (panel) result.push({ id: "native-intro", group: "native-intro", kind: "widget", node: <CafeAPanelFlowIntro data={data} density="default" /> });
    for (const block of getFlatContentBlocks(getVisibleMenuPageGroups(data))) {
      if (block.blockType === "widget") {
        result.push({ id: block.key, group: block.key, kind: "widget", node: <CafeAWidgetBlock widget={block.widget} /> });
        continue;
      }
      const columns = getCategoryPriceRailColumns({ category: block.category, items: block.items, timeSaleByItemId: sales, templateKey: key, priceDisplayMode: priceMode, nowMs: now });
      result.push({ id: `heading-${block.key}`, group: block.key, kind: "heading", node: <>
        {block.showDividerBeforeCategory ? <div className="cafe-a-menu-category-top-divider" aria-hidden="true" /> : null}
        <CafeACategoryTitle category={block.category} density="default" priceRailColumns={columns} />
      </> });
      for (const item of block.items) result.push({ id: item.id, group: block.key, kind: "item", node: <CafeAMenuItemRow item={item} category={block.category} priceOptions={data.priceOptions} traits={data.traits.filter(trait => trait.menu_item_id === item.id && trait.visible !== false)} capabilities={capabilities} density="default" templateKey={key} timeSale={sales.get(item.id)} customBadgeStyles={badges} locale={data.locale} priceDisplayMode={priceMode} priceRailColumns={columns} previewDevice={device} pagePresentation="one" onOpenImage={openImage} /> });
    }
    return result;
  }, [data, panel, sales, key, priceMode, now, badges, device, openImage, capabilities]);
  const board = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const tracks = useRef<HTMLDivElement>(null);
  const noticeMeasure = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ScrollableMenuLayout>(() => layoutScrollableMenu([], center ? 2 : 1, 600));
  const [ready, setReady] = useState(false);
  const [more, setMore] = useState(false);
  const updateHint = useCallback(() => {
    const el = area.current;
    setMore(Boolean(el && tracks.current && tracks.current.getBoundingClientRect().bottom > el.getBoundingClientRect().bottom + 2));
  }, []);
  useLayoutEffect(() => {
    if (!area.current || !board.current || !measure.current) return;
    let frame = 0, disposed = false;
    const rejectedRailColumns = new Set<number>();
    let railFrameKey = "";
    const update = () => {
      frame = 0;
      if (disposed || !area.current || !measure.current || !board.current) return;
      const root = board.current;
      const viewport = area.current;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const gap = parseFloat(getComputedStyle(viewport).columnGap) || 24;
      const brandWidth = center ? root.querySelector<HTMLElement>("[data-native-brand]")?.getBoundingClientRect().width ?? 0 : 0;
      const viewportStyle = getComputedStyle(viewport);
      const viewportPaddingTop = parseFloat(viewportStyle.paddingTop) || 0;
      const viewportHeight = viewport.clientHeight - viewportPaddingTop - (parseFloat(viewportStyle.paddingBottom) || 0);
      const width = viewport.clientWidth - (parseFloat(viewportStyle.paddingLeft) || 0) - (parseFloat(viewportStyle.paddingRight) || 0) - (center ? brandWidth + gap : 0);
      const leftRail = shell === "brand_left_rail";
      const boardStyle = getComputedStyle(root);
      const brand = root.querySelector<HTMLElement>("[data-native-brand]");
      const brandStyle = brand ? getComputedStyle(brand) : null;
      const boardWidth = root.getBoundingClientRect().width - parseFloat(boardStyle.paddingLeft) - parseFloat(boardStyle.paddingRight);
      const panelPadding = (parseFloat(brandStyle?.paddingLeft ?? "0") || 0) + (parseFloat(brandStyle?.paddingRight ?? "0") || 0);
      const railGeometry = (count: number) => getRepresentativeRailGeometry(boardWidth, panelPadding, gap, count, viewport.offsetWidth - viewport.clientWidth);
      const frameKey = `${boardWidth}|${root.clientHeight}`;
      if (frameKey !== railFrameKey) { rejectedRailColumns.clear(); railFrameKey = frameKey; }
      const max = center ? 2 : Math.max(1, Math.min(3, Math.floor((width + gap) / (12 * rem + gap))));
      const size = (getOnePageItemNameCeilingRem(device) ?? 1.3) * rem;
      root.style.setProperty("--native-item-size", `${size}px`);
      const base = Math.min(1.08 * rem, .88 * rem + Math.min(innerWidth, innerHeight) * .002);
      root.style.setProperty("--fit-menu-gap-scale", String(getOrderedFitGapScale(size / base, width)));
      const panelInset = panel ? parseFloat(getComputedStyle(measure.current.children[units.length > 1 ? 1 : 0] ?? measure.current).paddingLeft) || 0 : 0;
      const candidates = (center ? [2] : leftRail ? [1, 2, 3].filter(count => count === 1 || (!rejectedRailColumns.has(count) && railGeometry(count).trackWidth >= 12 * rem)) : Array.from({ length: max }, (_, i) => i + 1)).map(count => {
        const columnWidth = leftRail ? railGeometry(count).trackWidth : (width - (count - 1) * gap) / count;
        measure.current!.style.width = `${columnWidth}px`;
        applyOnePageChipLayouts(measure.current!);
        const measured = units.map(unit => {
          const el = [...measure.current!.children].find(node => (node as HTMLElement).dataset.nativeMeasure === unit.id) as HTMLElement;
          el.style.setProperty("--native-rhythm", el.querySelector<HTMLElement>("[data-cafe-a-item-rhythm]")?.dataset.cafeAItemRhythm ?? "1");
          const gapAfter = parseFloat(getComputedStyle(el).paddingBottom) || 0;
          const trimNoticeBoundary = unit === units.at(-1) && Boolean(noticeMeasure.current?.getBoundingClientRect().height);
          return { id: unit.id, group: unit.group, kind: unit.kind,
            height: el.getBoundingClientRect().height - (panel && unit.id === "native-intro" ? panelInset + viewportPaddingTop : 0) - (trimNoticeBoundary ? gapAfter : 0),
            gapAfter: trimNoticeBoundary ? 0 : gapAfter };
        });
        return { columnCount: count, columnWidth, itemSize: size, names: measureScrollableNames(measure.current!), layout: layoutScrollableMenu(measured, count, viewportHeight - 2 * panelInset, grouped, { footerHeight: noticeMeasure.current?.getBoundingClientRect().height ?? 0 }) };
      });
      const selected = selectScrollableMenuCandidate(candidates, grouped);
      if (leftRail) {
        const geometry = railGeometry(selected.columnCount);
        root.style.setProperty("--native-rail-width", `${geometry.railWidth}px`);
        root.dataset.representativeContentWidth = String(geometry.trackWidth);
      }
      const title = brand?.querySelector<HTMLElement>("[data-canvas-brand-fit]");
      if (leftRail && selected.columnCount > 1 && title?.dataset.canvasBrandFit === "ready" &&
        Math.abs(Number(title.dataset.canvasBrandWidth) - railGeometry(selected.columnCount).trackWidth) < 1 &&
        [...brand!.querySelectorAll(".cafe-a-fixed-rail-copy,.cafe-a-cover-hero")].some(node => node.getBoundingClientRect().bottom > brand!.getBoundingClientRect().bottom - parseFloat(brandStyle!.paddingBottom) + 1)) {
        rejectedRailColumns.add(selected.columnCount);
        setReady(false);
        frame = requestAnimationFrame(update);
        return;
      }
      measure.current.style.width = `${selected.columnWidth}px`;
      applyOnePageChipLayouts(measure.current); // Leave probes at the chosen width, as in the shared Matcha reader.
      root.dataset.nativeNameMeasurements = String(selected.names?.filter(name => name.role !== "category").length ?? 0);
      root.style.setProperty("--native-track-width", `${selected.columnWidth}px`);
      setLayout(previous => JSON.stringify(previous) === JSON.stringify(selected.layout) ? previous : selected.layout);
      setReady(true);
      updateHint();
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(area.current);
    for (const copy of board.current?.querySelectorAll("[data-native-brand] .cafe-a-fixed-rail-copy") ?? []) observer.observe(copy);
    // Candidate probes resize hidden rows themselves. Observing those outputs
    // feeds the next measurement back into the current decision. Real content
    // changes restart this effect; fonts, images and viewport remain live inputs.
    const measuredContent = measure.current;
    measuredContent.addEventListener("load", schedule, true);
    const fontsChanged = () => { rejectedRailColumns.clear(); schedule(); };
    document.fonts.addEventListener("loadingdone", fontsChanged);
    void document.fonts.ready.then(fontsChanged);
    schedule();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); measuredContent.removeEventListener("load", schedule, true); document.fonts.removeEventListener("loadingdone", fontsChanged); };
  }, [units, device, grouped, center, panel, shell, updateHint]);
  useLayoutEffect(() => {
    if (!area.current || !tracks.current) return;
    applyOnePageChipLayouts(tracks.current);
    const observer = new ResizeObserver(updateHint);
    observer.observe(area.current); observer.observe(tracks.current); updateHint();
    return () => observer.disconnect();
  }, [layout, updateHint]);
  // Logos bypass text fitting but retain the native three-cell header budget.
  useLayoutEffect(() => {
    if (!top || !data.menuSite.logo_url || !board.current) return;
    const root = board.current;
    const logo = root.querySelector<HTMLImageElement>(".cafe-a-topline-brand-identity img");
    const slot = logo?.closest<HTMLElement>(".cafe-a-topline-brand-identity");
    if (!logo || !slot) return;
    let frame = 0, disposed = false;
    const update = () => {
      frame = 0;
      if (disposed) return;
      root.style.setProperty("--cafe-a-header-gap-scale", "1");
      const style = getComputedStyle(root);
      const height = root.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - parseFloat(style.rowGap);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const ratio = logo.naturalWidth ? logo.naturalHeight / logo.naturalWidth : 0;
      const copyHeight = Math.max(0, ...[...root.querySelectorAll<HTMLElement>(".cafe-a-topline-description,.cafe-a-topline-notice-text")].map(el => Math.max(el.scrollHeight, el.getBoundingClientRect().height)));
      root.style.setProperty("--cafe-a-header-copy-height", `${Math.ceil(copyHeight)}px`);
      const headerRatio = getCanvasHeaderRatio(height, 0, 0, 1, Math.max(copyHeight, Math.min(slot.clientWidth * .75 * ratio, innerHeight * .2, 12 * rem)));
      root.style.setProperty("--cafe-a-header-fr", `${headerRatio * 100}fr`);
      root.style.setProperty("--cafe-a-body-fr", `${(1 - headerRatio) * 100}fr`);
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule); observer.observe(root); observer.observe(slot);
    for (const element of root.querySelectorAll(".cafe-a-topline-description,.cafe-a-topline-notice-text")) observer.observe(element);
    const copyObserver = new MutationObserver(schedule);
    const header = root.querySelector("[data-cafe-a-topline-info-header]");
    if (header) copyObserver.observe(header, { childList: true, characterData: true, subtree: true });
    logo.addEventListener("load", schedule); document.fonts.addEventListener("loadingdone", schedule);
    void document.fonts.ready.then(schedule); schedule();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); copyObserver.disconnect(); logo.removeEventListener("load", schedule); document.fonts.removeEventListener("loadingdone", schedule); root.style.removeProperty("--cafe-a-header-copy-height"); };
  }, [top, data.menuSite.logo_url]);
  const noticeNode = !top && !center && notices.length ? <div className={`${styles.notices} cafe-a-menu-description cafe-a-description-text`} data-native-notices>{notices.map((notice, index) => <p key={index}><ScriptAwareText text={notice} /></p>)}</div> : null;
  const dock = showCall || showOrder ? <footer className={styles.actions} data-native-actions data-call-only={showCall && !showOrder ? "true" : undefined} aria-label={t("메뉴 이용")}>
    {showCall ? <button type="button" className={styles.call} onClick={call.openCall} aria-label={t("직원 호출하기")}><StaffCallIcon strokeWidth={1.8} /><ScriptAwareText text={t("호출하기")} /></button> : null}
    {showOrder ? <button type="button" className={styles.order} onClick={call.openCart} aria-label={t("주문하기, 장바구니 {0}개", call.cartCount ?? 0)}><ShoppingCart strokeWidth={1.8} /><ScriptAwareText text={t("주문하기")} />{(call.cartCount ?? 0) > 0 ? <span>({call.cartCount})</span> : null}</button> : null}
  </footer> : null;
  return <CafeATimeSaleClock value={now}>
    <CafeATypographyFontAssets typographySettings={typography} />
    <main className={`menu-typography cafe-a-typography ${styles.root}`} data-menu-text-colors={getTypographyCustomColorRoles(typography)} data-template-key={key} data-cafe-a-skin={data.templateSkin} data-preview-device={device} data-one-page-layout-shell={shell} data-cafe-a-proportion-policy="true" data-cafe-a-adaptive-fit="true" data-cafe-a-copy-aware-rhythm="true" data-cafe-a-mobile-style="false" data-spacing-contract="contained-reading" data-cafe-a-brand-font-en={typography.typography_roles.brand.font_en_key ?? typography.english_font_key} data-cafe-a-category-font-en={typography.typography_roles.category.font_en_key ?? typography.english_font_key} data-one-page-typography-profile={getOnePageTypographyProfile(key).key} style={{ ...getTypographyCssVariables(typography, key), backgroundColor: background, "--native-background": background, "--mocha-forest-brown": MOCHA_FOREST_PANEL_COLORS.brown, "--mocha-forest-ivory": MOCHA_FOREST_PANEL_COLORS.ivory, "--mocha-forest-green": MOCHA_FOREST_PANEL_COLORS.green } as CSSProperties}>
      <OnePageCallPalette />
      <div ref={board} className={styles.board} aria-busy={!ready} data-native-scroll data-scroll-brand-board data-native-shell={shell} data-representative-panel={getMenuDesignBackgrounds(key, data.menuSite.page_settings).coloredPanel ? "true" : undefined} data-native-ready={ready ? "true" : "false"} data-layout-mode={grouped ? "orderedBalancedFit" : "orderedFit"} data-native-more={more ? "true" : "false"} style={{ "--native-columns": layout.columns.length } as CSSProperties}>
        {top ? <div className={styles.header} data-native-header><CafeADesktopToplineInformationHeader data={data} capabilities={capabilities} density="default" /><div className={styles.headerLanguage}><CafeLanguageHoverControl data={data} menuAlign="left" iconOnly /></div></div> : null}
        {!panel ? <div className={styles.brand} data-native-brand>
          {center ? <div className={styles.cornerLanguage} data-native-corner-language><CafeLanguageHoverControl data={data} menuAlign="left" iconOnly /></div> : null}
          {top ? cover ? <CafeADesktopToplineFeaturedSlot data={data} featuredSlides={slides} capabilities={capabilities} density="default" customBadgeStyles={badges} priceDisplayMode={priceMode} /> : null : <CafeADesktopFixedRail data={data} density="default" variant={shell} mochaColumnCount={layout.columns.length + 1} hideLanguageControl={center}>{cover ? <CafeACoverHero data={data} featuredSlides={slides} capabilities={capabilities} density="default" customBadgeStyles={badges} priceDisplayMode={priceMode} /> : null}</CafeADesktopFixedRail>}
          {center ? dock : null}
        </div> : null}
        <div className={styles.menuPanel} data-native-menu-panel>
          <div className={styles.viewport}>
            <div className={styles.menu} ref={area} role="region" aria-label={t("메뉴 내용")} tabIndex={0} onScroll={updateHint} data-native-menu>
              <div className={styles.measure} ref={measure} aria-hidden="true" inert>{units.map((unit, i) => <div className={styles.unit} data-native-measure={unit.id} data-measure-id={unit.id} data-kind={unit.kind} data-boundary={units[i + 1]?.kind !== "item" ? "section" : undefined} key={unit.id}>{unit.node}</div>)}<div ref={noticeMeasure}>{noticeNode}</div></div>
              <div ref={tracks} className={styles.tracks} data-native-tracks>
                {layout.columns.map((column, index) => <div key={index} className={styles.column} data-native-column={index + 1} data-mocha-panel={mocha ? index === layout.columns.length - 1 ? "green" : "ivory" : undefined}>
                  {column.map((block, i) => <div key={block.id} className={styles.unit} data-native-unit={block.id} data-kind={block.kind} style={{ paddingBottom: i === column.length - 1 ? 0 : block.gapAfter }}>{units.find(unit => unit.id === block.id)?.node}</div>)}
                  {index === layout.footerColumn ? noticeNode : null}
                </div>)}
                {!units.length ? <p>{t("메뉴를 준비하고 있어요.")}</p> : null}
              </div>
            </div>
            <div className={styles.fade} aria-hidden="true" data-native-fade />
          </div>
          {!center ? dock : null}
        </div>
      </div>
    </main>
    <CafeMenuImageLightbox preview={image} onClose={closeImage} templateKey={key} />
  </CafeATimeSaleClock>;
}
