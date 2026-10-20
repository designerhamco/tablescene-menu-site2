"use client";
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
  mergeTypographySettings,
} from "@/lib/template-typography-presets";
import type { MeasuredMenuBlock } from "@/lib/basic-menu-pagination";

import { layoutScrollableMenu, selectScrollableMenuCandidate, type ScrollableMenuLayout, type ScrollableMenuBlock } from "@/lib/basic-menu-scroll";
import { getOnePageItemNameCeilingRem } from "@/lib/one-page-typography-profile";
import { getOrderedFitGapScale } from "../one-page/pc-tablet/cafe-fit-engine";
import { getPcTabletLayoutModeFromPageSettings } from "@/lib/menu-layout-modes";

import { useDefaultDesignLayout } from "../defaults/DefaultDesignScope";
import type { MenuWidget } from "@/lib/menu-widgets";
import styles from "./RealMatchaPaged.module.css";
const capabilities = getTemplateCapabilities("cafe_design_a");

type Unit = {
  id: string;
  group: string;
  kind: MeasuredMenuBlock["kind"];
  node: ReactNode;
};
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
  const structure = defaultStructure ?? "basic-first-column";
  const portraitCover = defaultStructure === "basic-first-column" || defaultStructure === "basic-center-column";
  const topRow = structure === "basic-top-row";
  const centerColumn = structure === "basic-center-column";
  const upperLeft = structure === "basic-upper-left";
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
    const content = scrollContent.current?.querySelector<HTMLElement>("[data-scroll-columns]");
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
  const notices = topRow ? [] : allNotices;

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
    if (mobile || !area.current || !measure.current) return;
    let disposed = false,
      raf = 0;
    const update = () => {
      if (disposed || !area.current || !measure.current) return;
      const bounds = area.current.getBoundingClientRect();
      if (bounds.width <= 1 || bounds.height <= 1) return;
      const regionWidth = Math.min(area.current.clientWidth, bounds.width - (area.current.offsetWidth - area.current.clientWidth));
      const gap = parseFloat(getComputedStyle(area.current).columnGap) || 24;
      const brandWidth = brandArea.current?.getBoundingClientRect().width ?? 0;
      const width = centerColumn ? regionWidth - brandWidth - gap : regionWidth;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      // The menu region already excludes the fixed brand column and its gutter.
      // Automatic tracks stop at three. Overflow stays on the scroll surface.
      const maxColumns = Math.max(1, Math.min(centerColumn ? 2 : 3, Math.floor((width + gap) / (12 * rem + gap))));
      const root = area.current.closest<HTMLElement>("[data-scroll-template]")!;
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
        const columnWidth = Math.min(columnCount === 1 ? 40 * rem : Infinity, (width - (columnCount - 1) * gap) / columnCount);
        measure.current!.style.width = `${columnWidth}px`;
        applyOnePageChipLayouts(measure.current!);
        const measured = units.map(u => {
          const element = measure.current!.querySelector<HTMLElement>(`[data-measure-id="${u.id}"]`)!;
          const rhythm = Number(element.querySelector<HTMLElement>("[data-cafe-a-item-rhythm]")?.dataset.cafeAItemRhythm ?? 1);
          element.style.setProperty("--scroll-item-rhythm", String(reference && u.kind === "item" ? 1.2 : rhythm));
          return { id: u.id, group: u.group, kind: u.kind,
            height: element.getBoundingClientRect().height,
            gapAfter: parseFloat(getComputedStyle(element).paddingBottom) || 0 };
        });
        root.style.setProperty("--scroll-track-width", `${columnWidth}px`);
        const firstColumnInset = upperLeft ? (brandArea.current?.getBoundingClientRect().height ?? 0) + gap : 0;
        root.style.setProperty("--scroll-first-inset", `${firstColumnInset}px`);
        const footerHeight = noticeMeasure.current?.getBoundingClientRect().height ?? 0;
        const candidate = { columnCount, columnWidth, layout: layoutScrollableMenu(measured, columnCount, bounds.height, grouped, { footerHeight, firstColumnInset }) };
        measure.current!.removeAttribute("data-cafe-a-three-part-reference");
        return candidate;
      };
      const setSize = (size: number) => {
        root.style.setProperty("--scroll-item-size", `${size}px`);
        // The original shared gap mapper and 0.74 rhythm coefficient remain authoritative.
        const base = Math.min(1.08 * rem, 0.88 * rem + Math.min(innerWidth, innerHeight) * 0.002);
        root.style.setProperty("--fit-menu-gap-scale", String(getOrderedFitGapScale(size / base, width)));
      };
      // Grouping changes partition boundaries, never the shared reading size.
      const counts = centerColumn ? [2] : Array.from({ length: maxColumns }, (_, index) => index + 1);
      const candidates = counts.map(count => {
        const ceiling = (getOnePageItemNameCeilingRem(device) ?? 1.3) * rem;
        // Compare names at one shared reading size. Shrinking a cramped 3-track
        // candidate must not disguise its width/wrapping cost during selection.
        setSize(ceiling);
        const natural = collect(count);
        const names = measureScrollableNames(measure.current!);
        return { ...natural, itemSize: ceiling, names };
      });
      const selected = selectScrollableMenuCandidate(candidates, grouped) as typeof candidates[number];
      setSize(selected.itemSize);
      collect(selected.columnCount); // Restore final-width chip/rhythm measurements after probes.
      measure.current!.style.width = `${selected.columnWidth}px`;
      const brandBounds = brandArea.current?.getBoundingClientRect();
      const brandOverflow = Boolean(brandBounds && [...(brandArea.current?.children ?? [])].some(node => node.getBoundingClientRect().bottom > brandBounds.bottom + 1));
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
    for (const node of measure.current.children) observer.observe(node);
    if (brandArea.current)
      for (const node of brandArea.current.children) observer.observe(node);
    document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", schedule);
    };
  }, [mobile, units, layoutMode, showCall, showOrder, device, updateScrollHint, centerColumn, upperLeft, topRow]);
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
  const languageControl = <div className={styles.brandControls} data-paged-controls><CafeLanguageHoverControl data={baseProps} menuAlign="left" iconOnly /></div>;
  const storeIdentity = <CafeAStoreIdentity data={baseProps} capabilities={capabilities}
    titleClassName="cafe-a-store-title cafe-a-rail-title" logoClassName={styles.logo}
    layoutShell={topRow ? "brand_top_band" : centerColumn ? "brand_center_column" : "brand_left_rail"} />;
  const storeDescription = (data.menuSite.brand_description || data.menuSite.description)
    ? <p className="cafe-a-description-text cafe-a-menu-description cafe-a-store-description whitespace-pre-line text-[#3f4945]"><ScriptAwareText text={data.menuSite.brand_description || data.menuSite.description || ""} /></p> : null;
  const showCover = data.pageSettings.menu_cover_enabled && featuredSlides.length > 0 && isMenuCoverVisibleOnDevice(data.pageSettings, device);
  const actionFooter = showCall || showOrder ? (
            <footer className={styles.footer} data-scroll-actions aria-label={t("메뉴 이용")}>
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
          {!topRow ? <>{languageControl}<div className={styles.identity}>{storeIdentity}{storeDescription}</div></> : null}
          {showCover ? (portraitCover ? <div className={styles.portraitCoverSlot} data-portrait-cover-slot><CafeACoverHero data={baseProps} featuredSlides={featuredSlides} capabilities={capabilities} density="default" customBadgeStyles={customBadgeStyles} priceDisplayMode={priceDisplayMode} desktopClassName={styles.cover} /></div> : <CafeACoverHero data={baseProps} featuredSlides={featuredSlides} capabilities={capabilities} density="default" customBadgeStyles={customBadgeStyles} priceDisplayMode={priceDisplayMode} desktopClassName={styles.cover} />) : null}
          {centerColumn ? actionFooter : null}
        </aside>;
  return (
    <CafeATimeSaleClock value={saleNow}>
      <CafeATypographyFontAssets typographySettings={typographySettings} />
      <main
        className={`menu-typography cafe-a-typography ${styles.frame}`}
        style={
          {
            ...typography,
            backgroundColor: getResolvedBackgroundColor("cafe_design_a", data.menuSite.page_settings),
            "--scroll-background": getResolvedBackgroundColor("cafe_design_a", data.menuSite.page_settings),
            "--paged-capacity": layout.capacity + "px",
            "--paged-gap-scale": 1,
          } as CSSProperties
        }
        data-scroll-brand-board={topRow ? "" : undefined}
        data-basic-structure={structure}
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
        data-scroll-columns={layout.columns.length}
        data-scroll-content-height={layout.contentHeight}
      >
        <OnePageCallPalette />
        {topRow ? <header className={styles.topRow} data-basic-top-row>
          <div className={styles.topDescription} data-scroll-header-copy>{languageControl}{storeDescription}</div>
          <div className={styles.topIdentity}>{storeIdentity}</div>
          <div className={`${styles.notices} cafe-a-description-text cafe-a-menu-description`} data-paged-notices data-scroll-header-copy>
            {allNotices.map((n, i) => <p key={i}><ScriptAwareText text={n} /></p>)}
          </div>
        </header> : null}
        {!upperLeft ? brandPanel : null}
        <div className={styles.menuPanel} data-paged-menu-panel>
          <div className={styles.viewport} data-scroll-viewport>
            <div
              role="region"
              tabIndex={0}
              className={styles.menu}
              ref={area}
              aria-label={t("메뉴 내용")}
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
                <div ref={noticeMeasure} className={`${styles.notices} cafe-a-description-text cafe-a-menu-description text-[#58645f]`}>
                  {notices.map((n, i) => <p key={i}><ScriptAwareText text={n} /></p>)}
                </div>
              </div>
              <div ref={scrollContent} className={styles.scrollContent} data-scroll-content>
                {!units.length ? <p role="status">{t("메뉴를 준비하고 있어요.")}</p> : null}
                <div className={styles.columns} data-scroll-columns style={{ height: layout.contentHeight, maxWidth: layout.columns.length === 1 && !upperLeft && !centerColumn ? layout.columnWidth : undefined }}>
                  {layout.columns.map((column, i) => {
                    return <div key={i} className={styles.column} data-paged-column={i + 1}
                      data-scroll-natural-height={layout.naturalHeights[i]}>
                      {upperLeft && i === 0 ? brandPanel : null}
                      {column.map((b, index) => <div key={b.id}>
                        {unit(b, index === column.length - 1, i === layout.footerColumn && notices.length > 0,
                          column[index + 1]?.kind ?? (i === layout.footerColumn && notices.length ? "notices" : undefined))}
                      </div>)}
                      {i === layout.footerColumn ? <div className={`${styles.notices} cafe-a-description-text cafe-a-menu-description text-[#58645f]`}
                        data-paged-notices>
                        {notices.map((n, index) => <p key={index}><ScriptAwareText text={n} /></p>)}
                      </div> : null}
                    </div>;
                  })}
                </div>
              </div>
            </div>
            <div className={styles.fade} data-scroll-fade aria-hidden="true" />
          </div>
          {!centerColumn ? actionFooter : null}
          {layout.brandOverflow ? <p role="alert" className={styles.error}>{t("대표영역의 이미지 비율 또는 설명 길이를 조정해 주세요.")}</p> : null}
        </div>
        <CafeMenuImageLightbox preview={imagePreview} templateKey="cafe_design_a" onClose={() => { setImagePreview(null); imageTrigger.current?.focus({preventScroll: true}); }} />
      </main>
    </CafeATimeSaleClock>
  );
}
