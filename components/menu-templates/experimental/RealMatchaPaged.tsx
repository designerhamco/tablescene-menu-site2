"use client";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { OnePageCallButton, OnePageMobileCallBar, OnePageCallPalette, useOnePageCallActions } from "../one-page/OnePageCallControls";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { getPriceDisplayModeFromSettings } from "@/lib/menu-price-format";
import { getCustomBadgeStyles } from "@/lib/template-badge-styles";
import { getResolvedBackgroundColor } from "@/lib/template-background-colors";
import { isMenuCoverVisibleOnDevice } from "@/lib/menu-cover-device-visibility";
import CafeAWidgetBlock, { type CafeAWidgetPreview } from "../CafeAWidgetBlock";
import ScriptAwareText from "../shared/ScriptAwareText";
import PagedMenuItem from "./PagedMenuItem";
import { getNextTimeSaleBoundaryMs } from "@/lib/menu-time-sale-schedule";
import {
  useMenuPresentationDevice,
} from "@/components/public-menu/order-call/TableMenuInteractions";
import {
  getCustomTypographySettings,
  getTypographyCssVariables,
  mergeTypographySettings,
} from "@/lib/template-typography-presets";
import {
  paginateMenuBlocks,
  selectMenuPaginationCandidate,
  type MeasuredMenuBlock,
  type MenuPagePartition,
} from "@/lib/basic-menu-pagination";

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
  const device = useMenuPresentationDevice(data.previewDevice);
  const mobile = device === "mobile";
  const area = useRef<HTMLDivElement>(null);
  const brandArea = useRef<HTMLElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const anchor = useRef<string | null>(null);
  const [layout, setLayout] = useState<{
    pages: MenuPagePartition[];
    columns: number;
    capacity: number;
    gapScale: number;
    ready: boolean;
    brandOverflow: boolean;
  }>({
    pages: [],
    columns: 2,
    capacity: 600,
    gapScale: 1,
    ready: false,
    brandOverflow: false,
  });
  const [page, setPage] = useState(0);
  const call = useOnePageCallActions();
  const callOnly = call.enabled && call.callEnabled !== false && !call.orderEnabled;
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
  const notices = getCafeAFooterInfo(baseProps, capabilities);

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
      const gap = parseFloat(getComputedStyle(area.current).columnGap) || 24;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      // Measure each readable width; wider columns can wrap less and use fewer pages.
      const maxColumns = Math.max(1, Math.min(3, Math.floor((bounds.width + gap) / (12 * rem + gap))));
      const candidates = [1, 0.9, 0.8].flatMap(gapScale => Array.from({length: maxColumns}, (_, index) => {
        const columns = index + 1;
        measure.current!.style.width = `${(bounds.width - (columns - 1) * gap) / columns}px`;
        measure.current!.style.setProperty("--paged-gap-scale", String(gapScale));
        const measured = units.map((u) => ({
          id: u.id, group: u.group, kind: u.kind,
          height: Math.ceil(measure.current!.querySelector<HTMLElement>(`[data-measure-id="${u.id}"]`)!.getBoundingClientRect().height) + 1,
        }));
        return { columns, gapScale, pages: paginateMenuBlocks(measured, columns, bounds.height, data.previewLayoutMode !== "orderedFit") };
      }));
      const { columns, pages, gapScale = 1 } = selectMenuPaginationCandidate(candidates);
      measure.current.style.setProperty("--paged-gap-scale", String(gapScale));
      measure.current.style.width = `${(bounds.width - (columns - 1) * gap) / columns}px`;
      const next = anchor.current
        ? pages.findIndex((p) =>
            p.columns.some((c) => c.some((u) => u.id === anchor.current)),
          )
        : -1;
      const brandBounds = brandArea.current?.getBoundingClientRect();
      const brandOverflow = Boolean(
        brandBounds &&
        [...(brandArea.current?.children ?? [])].some(
          (node) =>
            node.getBoundingClientRect().bottom > brandBounds.bottom + 1,
        ),
      );
      setLayout({
        pages,
        columns,
        capacity: bounds.height,
        gapScale,
        ready: !brandOverflow,
        brandOverflow,
      });
      setPage((p) => (next >= 0 ? next : Math.min(p, pages.length - 1)));
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
  }, [mobile, units, data.previewLayoutMode, callOnly]);
  const changePage = (index: number) => {
    const next = Math.max(0, Math.min(layout.pages.length - 1, index));
    anchor.current =
      layout.pages[next]?.columns.flat().find((b) => b.kind === "item")?.id ??
      null;
    setPage(next);
  };
  if (mobile)
    return (
      <div data-paged-mobile>
        <CafeDesignA {...baseProps} />
      </div>
    );
  const current = layout.pages[page];
  const overflow = layout.pages.reduce(
    (count, page) => count + page.overflow.length,
    0,
  );
  const unit = (id: string) => {
    const value = unitById.get(id);
    if (!value) return null;
    return (
      <div
        key={id}
        className={styles.unit}
        data-kind={value.kind}
        data-paged-block={id}
      >
        {value.node}
      </div>
    );
  };
  return (
    <CafeATimeSaleClock value={saleNow}>
      <CafeATypographyFontAssets typographySettings={typographySettings} />
      <main
        className={`menu-typography cafe-a-typography ${styles.frame}`}
        style={
          {
            ...typography,
            backgroundColor: getResolvedBackgroundColor("cafe_design_a", data.menuSite.page_settings),
            "--paged-capacity": layout.capacity + "px",
            "--paged-gap-scale": layout.gapScale,
          } as CSSProperties
        }
        data-template-key="cafe_design_a"
        data-paged-template-key="cafe_real_matcha_paged_test"
        data-preview-device={device}
        data-cafe-a-proportion-policy="true"
        data-cafe-a-adaptive-fit="true"
        data-cafe-a-mobile-style="false"
        data-spacing-contract="paged-reading"
        data-paged-ready={layout.ready && !overflow ? "true" : "false"}
        data-paged-page={page + 1}
        data-paged-total={layout.pages.length}
        data-paged-call-only={callOnly ? "true" : "false"}
        data-paged-gap-scale={layout.gapScale}
        data-paged-layout={data.previewLayoutMode ?? "orderedBalancedFit"}
      >
        <aside ref={brandArea} className={styles.brand} data-paged-brand>
          <OnePageCallPalette />
          <div className={styles.brandControls} data-paged-controls>
            {call.enabled ? <OnePageMobileCallBar showActions={!callOnly} languageControl={<CafeLanguageHoverControl data={baseProps} menuAlign="left" iconOnly />} /> : <CafeLanguageHoverControl data={baseProps} menuAlign="left" iconOnly />}
          </div>
          <div className={styles.identity}>
            <CafeAStoreIdentity data={baseProps} capabilities={capabilities} titleClassName="cafe-a-store-title cafe-a-rail-title" logoClassName={styles.logo} />
            {(data.menuSite.brand_description || data.menuSite.description) ? <p className="cafe-a-description-text cafe-a-menu-description cafe-a-store-description whitespace-pre-line text-[#3f4945]"><ScriptAwareText text={data.menuSite.brand_description || data.menuSite.description || ""} /></p> : null}
          </div>
          {data.pageSettings.menu_cover_enabled && featuredSlides.length > 0 && isMenuCoverVisibleOnDevice(data.pageSettings, device) ? (
            <CafeACoverHero data={baseProps} featuredSlides={featuredSlides} capabilities={capabilities} density="default" customBadgeStyles={customBadgeStyles} priceDisplayMode={priceDisplayMode} desktopClassName={styles.cover} />
          ) : null}
        </aside>
        <div className={styles.menuPanel} data-paged-menu-panel>
        <div
          role="region"
          className={styles.menu}
          ref={area}
          aria-label="메뉴 페이지"
          style={{ "--paged-columns": layout.columns } as CSSProperties}
        >
          <div
            className={styles.measure}
            ref={measure}
            aria-hidden="true"
            inert
          >
            {units.map((u) => (
              <div
                key={u.id}
                className={styles.unit}
                data-kind={u.kind}
                data-measure-id={u.id}
              >
                {u.node}
              </div>
            ))}
          </div>
          {current?.columns.map((column, i) => (
            <div key={i} className={styles.column} data-paged-column={i + 1}>
              {column.map((b) => {
                const sourceWidget = data.widgets?.find((w) => w.id === b.id);
                const trailingBottom =
                  sourceWidget?.settings.placement === "bottom" &&
                  column
                    .slice(column.indexOf(b))
                    .every(
                      (next) =>
                        next.kind === "widget" &&
                        data.widgets?.find((w) => w.id === next.id)?.settings
                          .placement === "bottom",
                    );
                return (
                  <div
                    key={b.id}
                    style={trailingBottom ? { marginTop: "auto" } : undefined}
                  >
                    {unit(b.id)}
                  </div>
                );
              })}
            </div>
          ))}
          {!layout.pages.length ? (
            <p role="status">메뉴를 준비하고 있어요.</p>
          ) : null}
          {overflow || layout.brandOverflow ? (
            <p role="alert" className={styles.error}>
              이 콘텐츠는 현재 화면보다 큽니다. 이미지 비율 또는 설명 길이를
              조정해 주세요.
            </p>
          ) : null}
        </div>
        <footer className={`${styles.footer} ${callOnly ? styles.footerWithCall : ""}`} data-paged-footer>
          <div className={callOnly ? styles.callCluster : styles.noticeCluster}>
          {callOnly ? <div className={styles.footerCall} data-paged-call-footer><OnePageCallButton /></div> : null}
          <div className={`${styles.notices} cafe-a-description-text cafe-a-menu-description text-[#58645f]`} data-paged-notices>
            {notices.map((n, i) => (
              <p key={i}>
                <ScriptAwareText text={n} />
              </p>
            ))}
          </div>
          </div>
          <nav className={styles.pagination} aria-label="메뉴 페이지 이동">
            <button
              type="button"
              aria-label="이전 메뉴 페이지"
              disabled={page === 0}
              onClick={() => changePage(page - 1)}
            >
              <ChevronLeft />
            </button>
            {layout.pages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}페이지 보기`}
                aria-current={page === i ? "page" : undefined}
                onClick={() => changePage(i)}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              aria-label="다음 메뉴 페이지"
              disabled={page >= layout.pages.length - 1}
              onClick={() => changePage(page + 1)}
            >
              <ChevronRight />
            </button>
          </nav>
        </footer>
        </div>
        <CafeMenuImageLightbox preview={imagePreview} templateKey="cafe_design_a" onClose={() => { setImagePreview(null); imageTrigger.current?.focus({preventScroll: true}); }} />
      </main>
    </CafeATimeSaleClock>
  );
}
