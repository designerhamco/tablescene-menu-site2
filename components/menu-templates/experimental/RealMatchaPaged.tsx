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
import { Bell, ShoppingCart } from "lucide-react";
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

import { layoutScrollableMenu } from "@/lib/basic-menu-scroll";

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
  const scrollContent = useRef<HTMLDivElement>(null);
  const noticeArea = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{
    columns: MeasuredMenuBlock[][];
    capacity: number;
    ready: boolean;
    brandOverflow: boolean;
  }>({ columns: [[], []], capacity: 600, ready: false, brandOverflow: false });
  const [moreBelow, setMoreBelow] = useState(false);
  const call = useOnePageCallActions();
  const showCall = call.enabled && call.callEnabled !== false;
  const showOrder = call.enabled && Boolean(call.orderEnabled);
  const updateScrollHint = useCallback(() => {
    const viewport = area.current;
    setMoreBelow(Boolean(viewport && viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop > 2));
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
      const width = area.current.clientWidth;
      const gap = parseFloat(getComputedStyle(area.current).columnGap) || 24;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const columns = Math.max(1, Math.min(3, Math.floor((width + gap) / (12 * rem + gap))));
      measure.current.style.width = `${(width - (columns - 1) * gap) / columns}px`;
      const measured = units.map((u) => ({
        id: u.id, group: u.group, kind: u.kind,
        height: Math.ceil(measure.current!.querySelector<HTMLElement>(`[data-measure-id="${u.id}"]`)!.getBoundingClientRect().height) + 1,
      }));
      const noticesHeight = noticeArea.current?.getBoundingClientRect().height ?? 0;
      const partition = layoutScrollableMenu(measured, columns, Math.max(1, bounds.height - noticesHeight), data.previewLayoutMode !== "orderedFit");
      const brandBounds = brandArea.current?.getBoundingClientRect();
      const brandOverflow = Boolean(
        brandBounds &&
        [...(brandArea.current?.children ?? [])].some(
          (node) =>
            node.getBoundingClientRect().bottom > brandBounds.bottom + 1,
        ),
      );
      setLayout({
        columns: partition.columns,
        capacity: partition.height,
        ready: !brandOverflow,
        brandOverflow,
      });
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(area.current);
    if (noticeArea.current) observer.observe(noticeArea.current);
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
  }, [mobile, units, data.previewLayoutMode, showCall, showOrder]);
  useLayoutEffect(() => {
    if (mobile || !area.current || !scrollContent.current) return;
    const observer = new ResizeObserver(updateScrollHint);
    observer.observe(area.current);
    observer.observe(scrollContent.current);
    updateScrollHint();
    return () => observer.disconnect();
  }, [mobile, updateScrollHint]);
  if (mobile)
    return (
      <div data-paged-mobile>
        <CafeDesignA {...baseProps} />
      </div>
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
            "--scroll-background": getResolvedBackgroundColor("cafe_design_a", data.menuSite.page_settings),
            "--paged-capacity": layout.capacity + "px",
            "--paged-gap-scale": 1,
          } as CSSProperties
        }
        data-template-key="cafe_design_a"
        data-paged-template-key="cafe_real_matcha_paged_test"
        data-preview-device={device}
        data-cafe-a-proportion-policy="true"
        data-cafe-a-adaptive-fit="true"
        data-cafe-a-mobile-style="false"
        data-spacing-contract="contained-reading"
        data-paged-ready={layout.ready ? "true" : "false"}
        data-scroll-template="real-matcha"
        data-scroll-more={moreBelow ? "true" : "false"}
        data-paged-layout={data.previewLayoutMode ?? "orderedBalancedFit"}
      >
        <aside ref={brandArea} className={styles.brand} data-paged-brand>
          <OnePageCallPalette />
          <div className={styles.brandControls} data-paged-controls>
            <CafeLanguageHoverControl data={baseProps} menuAlign="left" iconOnly />
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
          <div className={styles.viewport} data-scroll-viewport>
            <div
              role="region"
              tabIndex={0}
              className={styles.menu}
              ref={area}
              aria-label="메뉴 내용"
              onScroll={updateScrollHint}
              style={{ "--paged-columns": layout.columns.length } as CSSProperties}
              data-scroll-menu
            >
              <div className={styles.measure} ref={measure} aria-hidden="true" inert>
                {units.map((u) => (
                  <div key={u.id} className={styles.unit} data-kind={u.kind} data-measure-id={u.id}>
                    {u.node}
                  </div>
                ))}
              </div>
              <div ref={scrollContent} className={styles.scrollContent} data-scroll-content>
                <div className={styles.columns} style={{ minHeight: units.length ? layout.capacity : undefined }}>
                  {layout.columns.map((column, i) => (
                    <div key={i} className={styles.column} data-paged-column={i + 1}>
                      {column.map((b, index) => {
                        const sourceWidget = data.widgets?.find((w) => w.id === b.id);
                        const trailingBottom = sourceWidget?.settings.placement === "bottom" &&
                          column.slice(index).every((next) => next.kind === "widget" &&
                            data.widgets?.find((w) => w.id === next.id)?.settings.placement === "bottom");
                        return <div key={b.id} style={trailingBottom ? { marginTop: "auto" } : undefined}>{unit(b.id)}</div>;
                      })}
                    </div>
                  ))}
                </div>
                {!units.length ? <p role="status">메뉴를 준비하고 있어요.</p> : null}
                <div ref={noticeArea} className={`${styles.notices} cafe-a-description-text cafe-a-menu-description text-[#58645f]`} data-paged-notices>
                  {notices.map((n, i) => <p key={i}><ScriptAwareText text={n} /></p>)}
                </div>
              </div>
            </div>
            <div className={styles.fade} data-scroll-fade aria-hidden="true" />
          </div>
          {showCall || showOrder ? (
            <footer className={styles.footer} data-scroll-actions aria-label="메뉴 이용">
              {showCall ? (
                <button type="button" className={styles.callButton} onClick={call.openCall} aria-label="직원 호출하기" data-scroll-call>
                  <Bell aria-hidden="true" strokeWidth={1.8} /><ScriptAwareText text="호출하기" />
                </button>
              ) : null}
              {showOrder ? (
                <button type="button" className={styles.orderButton} onClick={call.openCart} aria-label={`주문하기, 장바구니 ${call.cartCount ?? 0}개`} data-scroll-order>
                  <ShoppingCart aria-hidden="true" strokeWidth={1.8} /><ScriptAwareText text="주문하기" />
                  {(call.cartCount ?? 0) > 0 ? <span aria-hidden="true">({call.cartCount})</span> : null}
                </button>
              ) : null}
            </footer>
          ) : null}
          {layout.brandOverflow ? <p role="alert" className={styles.error}>대표영역의 이미지 비율 또는 설명 길이를 조정해 주세요.</p> : null}
        </div>
        <CafeMenuImageLightbox preview={imagePreview} templateKey="cafe_design_a" onClose={() => { setImagePreview(null); imageTrigger.current?.focus({preventScroll: true}); }} />
      </main>
    </CafeATimeSaleClock>
  );
}
