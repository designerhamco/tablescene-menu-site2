"use client";
/* eslint-disable @next/next/no-img-element */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicMenuTemplateProps } from "../types";
import CafeDesignA, { CafeATypographyFontAssets } from "../CafeDesignA";
import CafeAWidgetBlock, { type CafeAWidgetPreview } from "../CafeAWidgetBlock";
import ScriptAwareText from "../shared/ScriptAwareText";
import MenuLanguageSwitcher from "../shared/MenuLanguageSwitcher";
import PagedMenuItem from "./PagedMenuItem";
import { isMenuTimeSaleActive } from "@/lib/menu-time-sale-display";
import { getNextTimeSaleBoundaryMs } from "@/lib/menu-time-sale-schedule";
import {
  TableMenuActionButtons,
  useMenuPresentationDevice,
} from "@/components/public-menu/order-call/TableMenuInteractions";
import {
  getCustomTypographySettings,
  getTypographyCssVariables,
  mergeTypographySettings,
} from "@/lib/template-typography-presets";
import {
  paginateMenuBlocks,
  type MeasuredMenuBlock,
  type MenuPagePartition,
} from "@/lib/basic-menu-pagination";

import type { MenuWidget } from "@/lib/menu-widgets";
import styles from "./RealMatchaPaged.module.css";
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
    ready: boolean;
    brandOverflow: boolean;
  }>({
    pages: [],
    columns: 2,
    capacity: 600,
    ready: false,
    brandOverflow: false,
  });
  const [page, setPage] = useState(0);
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
  const activeSales = useMemo(
    () => data.timeSales.filter((s) => isMenuTimeSaleActive(s, saleNow)),
    [data.timeSales, saleNow],
  );
  const baseProps = {
    ...data,
    menuSite: { ...data.menuSite, template_key: "cafe_design_a" },
  };
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
  const settings = (data.menuSite.settings ?? {}) as Record<string, unknown>;
  const notices = [1, 2, 3]
    .map((i) =>
      typeof settings["footer_notice_" + i] === "string"
        ? String(settings["footer_notice_" + i])
        : "",
    )
    .filter(Boolean);

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
      result.push({
        id: "heading-" + category.id,
        group: category.id,
        kind: "heading",
        node: (
          <div className={styles.category}>
            <h2>
              <ScriptAwareText text={category.name} />
            </h2>
            {category.description_visible && category.description ? (
              <p>
                <ScriptAwareText text={category.description} />
              </p>
            ) : null}
          </div>
        ),
      });
      for (const item of items) {
        result.push({
          id: item.id,
          group: category.id,
          kind: "item",
          node: (
            <PagedMenuItem
              data={data}
              item={item}
              category={category}
              activeSales={activeSales}
              now={saleNow}
            />
          ),
        });
      }
    }
    return result;
  }, [data, activeSales, saleNow]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  useLayoutEffect(() => {
    if (mobile || !area.current || !measure.current) return;
    let disposed = false,
      raf = 0;
    const update = () => {
      if (disposed || !area.current || !measure.current) return;
      const bounds = area.current.getBoundingClientRect();
      const columns = bounds.width >= 850 ? 3 : bounds.width >= 470 ? 2 : 1;
      area.current.style.setProperty("--paged-columns", String(columns));
      measure.current.style.width = `${(bounds.width - (columns - 1) * 24) / columns}px`;
      const measured = units.map((u) => ({
        id: u.id,
        group: u.group,
        kind: u.kind,
        height:
          Math.ceil(
            measure
              .current!.querySelector<HTMLElement>(
                `[data-measure-id="${u.id}"]`,
              )!
              .getBoundingClientRect().height,
          ) + 1,
      }));
      const pages = paginateMenuBlocks(
        measured,
        columns,
        bounds.height,
        data.previewLayoutMode !== "orderedFit",
      );
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
  }, [mobile, units, data.previewLayoutMode]);
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
    <>
      <CafeATypographyFontAssets typographySettings={typographySettings} />
      <main
        className={`menu-typography ${styles.frame}`}
        style={
          {
            ...typography,
            "--paged-capacity": layout.capacity + "px",
          } as CSSProperties
        }
        data-template-key="cafe_real_matcha_paged_test"
        data-spacing-contract="paged-reading"
        data-paged-ready={layout.ready && !overflow ? "true" : "false"}
        data-paged-page={page + 1}
        data-paged-total={layout.pages.length}
        data-paged-layout={data.previewLayoutMode ?? "orderedBalancedFit"}
      >
        <aside ref={brandArea} className={styles.brand} data-paged-brand>
          <div className={styles.brandLanguage}>
            <MenuLanguageSwitcher
              currentLocale={data.locale}
              enabledLocales={data.enabledLocales}
              compact
            />
            <span>{data.orderCallConfig?.tableLabel}</span>
          </div>
          {data.menuSite.logo_url ? (
            <img
              className={styles.logo}
              src={data.menuSite.logo_url}
              alt={data.menuSite.restaurant_name || data.menuSite.name}
            />
          ) : (
            <h1>
              <ScriptAwareText
                text={data.menuSite.restaurant_name || data.menuSite.name}
              />
            </h1>
          )}
          <p className={styles.brandDescription}>
            <ScriptAwareText
              text={
                data.menuSite.brand_description ||
                data.menuSite.description ||
                ""
              }
            />
          </p>
          {data.pageSettings.menu_cover_enabled &&
          data.menuSite.cover_image_url ? (
            <img
              className={styles.cover}
              src={data.menuSite.cover_image_url}
              alt="대표 메뉴"
            />
          ) : null}
        </aside>
        <section
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
        </section>
        <footer className={styles.footer} data-paged-footer>
          <div className={styles.notices} data-paged-notices>
            {notices.map((n, i) => (
              <p key={i}>
                <ScriptAwareText text={n} />
              </p>
            ))}
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
          <TableMenuActionButtons />
        </footer>
      </main>
    </>
  );
}
