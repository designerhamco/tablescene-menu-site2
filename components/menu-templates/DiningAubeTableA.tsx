/* eslint-disable @next/next/no-img-element */
"use client";
import "./DiningAubeTableA.css";
import CafeAWidgetBlock, { toCafeAWidgetPreview } from "./CafeAWidgetBlock";
import { resolveMenuToolsInk } from "@/lib/menu-interaction-theme";
import { resolvedMenuTextColors } from "@/lib/menu-text-colors";
import { getMenuNoticeRows } from "@/lib/menu-notices";
import { formatMenuMoney } from "@/lib/menu-ui-copy";
import type { SupportedLocale } from "@/lib/locales";
import { useMenuLocale, useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";

import MenuOrderAddButton from "@/components/public-menu/order-call/MenuOrderAddButton";
import { readMenuSurfaceSettings } from "@/lib/menu-design-surfaces";
import { DiningMenuToolbar } from "@/components/public-menu/order-call/TableMenuInteractions";
import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import ScriptAwareText from "@/components/menu-templates/shared/ScriptAwareText";
import type {
  PublicMenuCategory,
  PublicMenuItem,
  PublicMenuItemPriceOption,
  PublicMenuTemplateProps,
} from "@/components/menu-templates/types";
import {
  buildAubeTableNavigationUnits,
  getAubeTableSwipeTargetIndex,
  normalizeAubeTableCoverBackgroundColor,
  normalizeAubeTableCoverBackgroundOpacity,
  normalizeAubeTableLayoutColumns,
  normalizeAubeTableTextAlignment,
  shouldShowAubeTableCourseItemImages,
  shouldUseAubeTableCoverLogo,
  sortAubeTablePages,
} from "@/lib/aube-table";
import {
  getCustomTypographySettings,
  getEnglishFontLoadAssets,
  getKoreanFontLoadAssets,
  getTypographyCssVariables,
  getTypographyCustomColorRoles,
  getTypographyRoleFontLoadAssets,
  mergeTypographySettings,
} from "@/lib/template-typography-presets";
import { formatMenuPrice } from "@/types/menu";
import { getMenuImageRadius } from "./shared/menu-image-radius";
import { CafeMenuImageLightbox } from "./CafeDesignA";
import { useDefaultAlbum, useDefaultDesign, useDefaultDesignLogoImage } from "./defaults/DefaultDesignScope";
import type { CafeMenuImagePreview } from "./shared/cafe-template-types";

type OpenItemImage = (preview: CafeMenuImagePreview, trigger: HTMLElement) => void;

type CourseWithItems = PublicMenuCategory & { items: PublicMenuItem[] };
export type DiningAubeTableLayoutVariant = "paged" | "sidebar";
export type DiningAubeTableThemeVariant = "aube" | "maison-marais";
type DiningAubeTableProps = PublicMenuTemplateProps & {
  layoutVariant?: DiningAubeTableLayoutVariant;
  themeVariant?: DiningAubeTableThemeVariant;
};

const AUBE_TABLE_STAGE_VARIANTS = {
  enter: (direction: number) => ({ opacity: 0.42, x: direction * 20 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -14 }),
};

const AUBE_TABLE_STAGE_TRANSITION = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as const,
};

const AUBE_TABLE_COVER_REVEAL_CONTAINER = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.12,
    },
  },
};

const AUBE_TABLE_COVER_REVEAL_ITEM = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.78, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const AUBE_TABLE_COURSE_REVEAL_CONTAINER = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.72,
      staggerChildren: 0.22,
    },
  },
};

const AUBE_TABLE_PAGE_HEADER_REVEAL = {
  hidden: { opacity: 0, y: -22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.42, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const AUBE_TABLE_COURSE_REVEAL_GROUP = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.13,
    },
  },
};

const AUBE_TABLE_COURSE_REVEAL_HEADING = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const AUBE_TABLE_COURSE_REVEAL_ITEMS = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.84, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

function getPriceOptions(item: PublicMenuItem, options: PublicMenuItemPriceOption[], locale: SupportedLocale) {
  return options
    .filter((option) => option.menu_item_id === item.id && option.visible !== false)
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((option) => ({ id: option.id, text: `${option.label} ${option.price_label?.trim() || (option.price == null ? "" : formatMenuMoney(option.price, locale))}`.trim() }));
}

function CoursePrice({ course }: { course: CourseWithItems }) {
  const t = useMenuText();
  if (course.course_price_visible === false) return null;
  const price = course.course_price_label?.trim() || (course.course_price == null ? "" : t("{0}원", course.course_price.toLocaleString("ko-KR")));
  if (!price) return null;
  return <p className="aube-table-course-price"><ScriptAwareText text={price} /></p>;
}

function MenuItemRow({
  item,
  priceOptions,
  showImage = true,
  onOpenImage,
}: {
  item: PublicMenuItem;
  priceOptions: PublicMenuItemPriceOption[];
  showImage?: boolean;
  onOpenImage: OpenItemImage;
}) {
  const t = useMenuText();
  const locale = useMenuLocale();
  const album = useDefaultAlbum();
  const options = item.price_visible === false ? [] : getPriceOptions(item, priceOptions, locale);
  const price = item.price_visible === false ? "" : options.length ? options.map(option => option.text).join(" · ") : formatMenuPrice(item);
  return (
    <article className="aube-table-item" data-aube-table-item="" data-cafe-a-sold-out={item.is_sold_out ? "true" : undefined}>
      {showImage && item.image_url ? <button type="button" className="aube-table-image-trigger" aria-label={t("{0} 이미지 크게 보기", item.name)}
        onClick={event => onOpenImage({ src: item.image_url!, title: item.name, secondaryTitle: item.set_name }, event.currentTarget)}>
        <img className="aube-table-item-image" src={item.image_url} alt={t("{0} 이미지", item.name)} loading="lazy" />
      </button> : null}
      <div className="aube-table-item-copy" data-price-options={options.length && price ? "true" : undefined}>
        <div className="aube-table-item-heading" data-has-price={price ? "true" : "false"} data-price-options={options.length && price ? "true" : undefined}>
          <h3><ScriptAwareText text={item.name} /></h3>
          <div className="aube-table-item-purchase">
            {price && album ? <div className="aube-table-item-price aube-table-album-prices">
              {(options.length ? options : [{ id: item.id, text: price }]).map(option => <div className="aube-table-album-price-row" key={option.id}>
                <span className="aube-table-album-price-leader" data-album-price-leader aria-hidden="true" />
                <span className="aube-table-option-price"><ScriptAwareText text={option.text} /></span>
              </div>)}
            </div> : price ? <p className="aube-table-item-price">{options.length ? options.map((option, index) => <span key={option.id}>
              {index > 0 ? <span className="aube-table-option-separator"><ScriptAwareText text=" · " /></span> : null}
              <span className="aube-table-option-price"><ScriptAwareText text={option.text} /></span>
            </span>) : <ScriptAwareText text={price} />}</p> : null}
            {!item.is_sold_out ? <MenuOrderAddButton itemId={item.id} itemName={item.name} /> : null}
          </div>
        </div>
        {item.set_name ? <p className="aube-table-item-secondary"><ScriptAwareText text={item.set_name} /></p> : null}
        {item.description ? <p className="aube-table-item-description"><ScriptAwareText text={item.description} /></p> : null}
        {item.is_sold_out ? <span className="aube-table-sold-out"><ScriptAwareText text={t("품절")} /></span> : null}
      </div>
    </article>
  );
}

function CourseBlock({ course, priceOptions, onOpenImage }: { course: CourseWithItems; priceOptions: PublicMenuItemPriceOption[]; onOpenImage: OpenItemImage }) {
  const t = useMenuText();
  const showItemImages = shouldShowAubeTableCourseItemImages(course);

  return (
    <motion.section className="aube-table-course" data-aube-table-course="" data-course-priced={!showItemImages ? "true" : "false"} variants={AUBE_TABLE_COURSE_REVEAL_GROUP}>
      <motion.div variants={AUBE_TABLE_COURSE_REVEAL_HEADING}>
        <header className="aube-table-course-header">
          <div className="aube-table-course-title">
            <h2><ScriptAwareText text={course.name} /></h2>
          </div>
          <span className="aube-table-course-rule" aria-hidden="true" />
          <div className="aube-table-course-purchase">
            <CoursePrice course={course} />
            <MenuOrderAddButton itemId={"course:"+course.id} itemName={course.name+t(" 코스")}/>
          </div>
        </header>
        {course.description_visible !== false && course.description ? (
          <p className="aube-table-course-description"><ScriptAwareText text={course.description} /></p>
        ) : null}
        {course.course_price_description_visible !== false && course.course_price_description ? (
          <p className="aube-table-course-price-description"><ScriptAwareText text={course.course_price_description} /></p>
        ) : null}
      </motion.div>
      <motion.div className="aube-table-course-items" variants={AUBE_TABLE_COURSE_REVEAL_ITEMS}>
        {course.items.map((item) => (
          <MenuItemRow
            key={item.id}
            item={item}
            priceOptions={priceOptions}
            showImage={showItemImages}
            onOpenImage={onOpenImage}
          />
        ))}
      </motion.div>
    </motion.section>
  );
}

export default function DiningAubeTableA({
  layoutVariant = "paged",
  themeVariant = "aube",
  pages,
  ...data
}: DiningAubeTableProps) {
  const t = useMenuText();
  const defaultDesign = useDefaultDesign();
  const album = useDefaultAlbum();
  const usesSidebarNavigation = layoutVariant === "sidebar";
  const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(data.menuSite.template_key, customTypography);
  const typographyStyle = getTypographyCssVariables(typographySettings, data.menuSite.template_key);
  const textColors = resolvedMenuTextColors(data.menuSite.page_settings, true);
  const categoryToolsInk = textColors.category ?? typographySettings.typography_roles.category.color ?? "#191c1b";
  const customColorRoles = getTypographyCustomColorRoles(typographySettings);
  const fontAssets = [
    getKoreanFontLoadAssets(typographySettings.korean_font_key),
    getEnglishFontLoadAssets(typographySettings.english_font_key),
    ...getTypographyRoleFontLoadAssets(typographySettings.typography_roles),
  ];
  const visiblePages = useMemo(
    () => sortAubeTablePages(pages.filter((page) => page.visible !== false)),
    [pages],
  );
  const coverEnabled = data.pageSettings.menu_cover_enabled !== false;
  const units = useMemo(() => buildAubeTableNavigationUnits(coverEnabled, visiblePages), [coverEnabled, visiblePages]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imagePreview, setImagePreview] = useState<CafeMenuImagePreview | null>(null);
  const imageTrigger = useRef<HTMLElement | null>(null);
  const openImage = useCallback<OpenItemImage>((preview, trigger) => {
    imageTrigger.current = trigger;
    setImagePreview({ ...preview, borderRadius: getMenuImageRadius(trigger) });
  }, []);
  const closeImage = useCallback(() => {
    setImagePreview(null);
    imageTrigger.current?.focus({ preventScroll: true });
  }, []);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const [failedCoverLogoUrl, setFailedCoverLogoUrl] = useState<string | null>(null);
  const logoImageRef = useDefaultDesignLogoImage(data.menuSite.logo_url, () => setFailedCoverLogoUrl(data.menuSite.logo_url));
  const prefersReducedMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const safeActiveIndex = Math.max(0, Math.min(activeIndex, units.length - 1));

  const selectUnit = useCallback((index: number) => {
    const currentIndex = Math.max(0, Math.min(activeIndex, units.length - 1));
    const nextIndex = Math.max(0, Math.min(units.length - 1, index));
    if (nextIndex === currentIndex) return;
    setTransitionDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveIndex(nextIndex);
  }, [activeIndex, units.length]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [safeActiveIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest("[role=dialog],input,textarea,select")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectUnit(safeActiveIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        selectUnit(safeActiveIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safeActiveIndex, selectUnit]);

  function onSwipeEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const nextIndex = getAubeTableSwipeTargetIndex({
      currentIndex: safeActiveIndex,
      unitCount: units.length,
      offsetX: info.offset.x,
      velocityX: info.velocity.x,
    });
    selectUnit(nextIndex);
  }

  const activeUnit = units[safeActiveIndex] ?? units[0] ?? null;
  const activePage = activeUnit?.type === "page" ? visiblePages.find((page) => page.id === activeUnit.pageId) ?? null : null;
  const courses: CourseWithItems[] = activePage
    ? data.categories
        .filter((course) => course.visible !== false && course.menu_page_id === activePage.id)
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((course) => ({
          ...course,
          items: data.items
            .filter((item) => item.visible !== false && item.category_id === course.id)
            .sort((left, right) => left.sort_order - right.sort_order),
        }))
    : [];
  const directItems = activePage
    ? data.items
        .filter((item) => item.visible !== false && !item.category_id && item.menu_page_id === activePage.id)
        .sort((left, right) => left.sort_order - right.sort_order)
    : [];
  const pageWidgets = (data.widgets ?? []).filter(widget => widget.visible !== false && widget.menuPageId === activePage?.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const pageContent = [...courses.map(course => ({ type: "category" as const, order: course.sort_order, value: course })), ...pageWidgets.map(widget => ({ type: "widget" as const, order: widget.sortOrder, value: widget }))].sort((a, b) => a.order - b.order);
  const pageAlignment = normalizeAubeTableTextAlignment(activePage?.text_alignment);
  const pageColumns = normalizeAubeTableLayoutColumns(activePage?.layout_columns);
  const coverColor = normalizeAubeTableCoverBackgroundColor(data.pageSettings.multi_page_cover_background_color);
  const coverOpacity = normalizeAubeTableCoverBackgroundOpacity(data.pageSettings.multi_page_cover_background_opacity);
  const coverToolsInk = textColors.representative ?? readMenuSurfaceSettings(data.menuSite.page_settings).coverDescriptionColor ?? typographySettings.typography_roles.supporting.color ?? (defaultDesign ? "#606561" : "#FFFFFF");
  const toolsStyle = {
    "--aube-cover-copy-ink": coverToolsInk,
    "--aube-cover-tools-ink": resolveMenuToolsInk({ preferred: coverToolsInk, surface: coverColor, palette: [coverToolsInk, typographySettings.typography_roles.brand.color ?? "#C5A165"] }),
    "--menu-dining-language-ink": resolveMenuToolsInk({ preferred: categoryToolsInk, surface: "#ffffff" }),
  } as CSSProperties;
  const storeName = data.menuSite.restaurant_name || data.menuSite.business_name || data.menuSite.name;
  const coverTitle = data.menuSite.menu_cover_title || data.menuSite.restaurant_name || data.menuSite.name;
  const coverDescription = data.menuSite.menu_cover_description || data.menuSite.brand_description || data.menuSite.description;
  const useCoverLogo = shouldUseAubeTableCoverLogo(data.menuSite.logo_url, failedCoverLogoUrl);
  const coverNotices = getMenuNoticeRows(data.menuSite);
  // Observe the mounted cover; fixed pagination never moves with notice length.
  const measureCoverBottom = useCallback((bottom: HTMLDivElement | null) => {
    const root = bottom?.closest<HTMLElement>(".aube-table-root");
    const cover = bottom?.closest<HTMLElement>(".aube-table-cover");
    const win = root?.ownerDocument.defaultView;
    if (!bottom || !root || !cover || !win) return;
    const shell = root.closest<HTMLElement>("[data-menu-interaction-shell]");
    const pagination = root.querySelector<HTMLElement>(".aube-table-pagination");
    const dock = shell?.querySelector<HTMLElement>("[data-table-mobile-dock]");
    const update = () => {
      const frame = cover.getBoundingClientRect();
      const noticesHeight = bottom.getBoundingClientRect().height;
      const dockRect = dock?.getBoundingClientRect();
      const pageBottom = Math.min(frame.bottom, win.innerHeight, dockRect?.height ? dockRect.top : Infinity);
      const noticeEnd = Math.min(pageBottom - 24, pagination ? pagination.getBoundingClientRect().top - 20 : Infinity);
      root.style.setProperty("--aube-cover-notice-bottom", `${Math.max(24, frame.bottom - noticeEnd)}px`);
      // Bound the height budget to the viewport so oversized cover copy cannot feed back into measurement.
      root.style.setProperty("--aube-cover-bottom-height", `${Math.max(0, Math.min(frame.bottom, win.innerHeight) - noticeEnd) + noticesHeight}px`);
    };
    const observer = new ResizeObserver(update);
    for (const element of [bottom, cover, pagination, dock]) if (element) observer.observe(element);
    win.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      win.removeEventListener("resize", update);
      root.style.removeProperty("--aube-cover-notice-bottom");
      root.style.removeProperty("--aube-cover-bottom-height");
    };
  }, []);
  if (!activeUnit) return null;
  const pagination = !usesSidebarNavigation && units.length > 1 ? (
        <nav className="aube-table-pagination" aria-label={t("메뉴 페이지 이동")}>
          <button
            type="button"
            className="aube-table-pagination-direction aube-table-pagination-prev"
            aria-label={t("이전 메뉴 페이지")}
            disabled={safeActiveIndex === 0}
            onClick={() => selectUnit(safeActiveIndex - 1)}
          >
            <span className="aube-table-pagination-arrow" aria-hidden="true" />
            <ScriptAwareText text="Prev" />
          </button>
          <div className="aube-table-pagination-dots">
            {units.map((unit, index) => (
              <button
                type="button"
                className="aube-table-pagination-dot"
                key={unit.id}
                aria-label={t("{0} 페이지로 이동", unit.label)}
                aria-current={index === safeActiveIndex ? "page" : undefined}
                data-active={index === safeActiveIndex ? "true" : "false"}
                onClick={() => selectUnit(index)}
              />
            ))}
          </div>
          <button
            type="button"
            className="aube-table-pagination-direction aube-table-pagination-next"
            aria-label={t("다음 메뉴 페이지")}
            disabled={safeActiveIndex === units.length - 1}
            onClick={() => selectUnit(safeActiveIndex + 1)}
          >
            <ScriptAwareText text="Next" />
            <span className="aube-table-pagination-arrow" aria-hidden="true" />
          </button>
        </nav>
      ) : null;

  return (
    <>
      <KoreanFontAssets assets={fontAssets} />
      <div className="aube-table-viewport" data-preview-device={data.previewDevice}>
      <div
        className="aube-table-root cafe-a-typography"
        style={{ ...typographyStyle, ...toolsStyle }}
        data-menu-text-colors={customColorRoles}
        data-aube-table=""
        data-layout={layoutVariant}
        data-item-layout={album ? "album" : undefined}
        data-spacing-contract="editorial-scroll"
        data-theme={themeVariant}
        data-cover-active={activeUnit.type === "cover" ? "true" : undefined}
        data-cover-image-active={activeUnit.type === "cover" && data.pageSettings.cover_image_visible !== false && Boolean(data.menuSite.cover_image_url) ? "true" : undefined}
      >
      <div className="aube-table-language-control" data-aube-table-language-control="">
        <DiningMenuToolbar>
        <MenuLanguageSwitcher
          currentLocale={data.locale}
          enabledLocales={data.enabledLocales}
          compact
          triggerVariant="aube"
          menuAlign="left"
        />
        </DiningMenuToolbar>
      </div>
      {usesSidebarNavigation && units.length > 1 ? (
        <>
          <nav className="aube-table-sidebar-navigation" aria-label={t("메뉴 페이지 이동")}>
            <div className="aube-table-sidebar-list">
              {units.map((unit, index) => (
                <button
                  type="button"
                  key={unit.id}
                  aria-current={index === safeActiveIndex ? "page" : undefined}
                  data-active={index === safeActiveIndex ? "true" : "false"}
                  onClick={() => selectUnit(index)}
                >
                  <ScriptAwareText text={unit.type === "cover" ? coverTitle || "Cover" : unit.label} />
                </button>
              ))}
            </div>
          </nav>
          <nav className="aube-table-mobile-page-tabs" aria-label={t("메뉴 페이지 이동")}>
            {units.map((unit, index) => (
              <button
                type="button"
                key={unit.id}
                aria-current={index === safeActiveIndex ? "page" : undefined}
                data-active={index === safeActiveIndex ? "true" : "false"}
                onClick={() => selectUnit(index)}
              >
                <ScriptAwareText text={unit.type === "cover" ? coverTitle || "Cover" : unit.label} />
              </button>
            ))}
          </nav>
        </>
      ) : null}
      <AnimatePresence initial={false} custom={transitionDirection} mode="sync">
        <motion.div
          key={activeUnit.id}
          className="aube-table-stage"
          custom={transitionDirection}
          variants={AUBE_TABLE_STAGE_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={prefersReducedMotion ? { duration: 0.01 } : AUBE_TABLE_STAGE_TRANSITION}
          drag={!usesSidebarNavigation && units.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          dragMomentum={false}
          whileDrag={prefersReducedMotion ? undefined : { opacity: 0.98 }}
          onDragEnd={onSwipeEnd}
        >
      {activeUnit.type === "cover" ? (
        <section className="aube-table-cover" style={{ backgroundColor: coverColor }} data-aube-table-cover="" data-cover-notices={coverNotices.length ? "true" : undefined} data-default-cover-image={defaultDesign && data.pageSettings.cover_image_visible !== false && data.menuSite.cover_image_url ? "true" : undefined}>
          {data.pageSettings.cover_image_visible !== false && data.menuSite.cover_image_url ? (
            <img className="aube-table-cover-image" src={data.menuSite.cover_image_url} alt="" />
          ) : null}
          <div
            className="aube-table-cover-overlay"
            style={{ backgroundColor: coverColor, opacity: coverOpacity / 100 }}
          />
          <motion.div
            className="aube-table-cover-copy"
            variants={AUBE_TABLE_COVER_REVEAL_CONTAINER}
            initial={prefersReducedMotion ? false : "hidden"}
            animate="visible"
          >
            {useCoverLogo ? (
              <motion.div variants={AUBE_TABLE_COVER_REVEAL_ITEM} data-menu-brand-logo>
                <img
                  className="aube-table-cover-logo"
                  data-default-design-logo={defaultDesign ? "" : undefined}
                  ref={logoImageRef}
                  src={data.menuSite.logo_url ?? ""}
                  alt={t("{0} 로고", storeName)}
                  onError={() => setFailedCoverLogoUrl(data.menuSite.logo_url)}
                />
              </motion.div>
            ) : null}
            {coverTitle && !(defaultDesign && useCoverLogo) ? <motion.h1 variants={AUBE_TABLE_COVER_REVEAL_ITEM}><ScriptAwareText text={coverTitle} /></motion.h1> : null}
            {coverDescription ? <motion.p data-menu-store-description className="aube-table-cover-description" variants={AUBE_TABLE_COVER_REVEAL_ITEM}><ScriptAwareText text={coverDescription} /></motion.p> : null}
          </motion.div>
          {coverNotices.length ? <div className="aube-table-cover-bottom" ref={measureCoverBottom}>
            <div className="aube-table-cover-notices" data-dining-cover-notices data-notice-count={coverNotices.length}>
              {coverNotices.map((notice, index) => <p key={index}><ScriptAwareText text={notice} /></p>)}
            </div>
          </div> : null}
        </section>
      ) : activePage ? (
        <div ref={scrollRef} className="aube-table-page-scroll" data-aube-table-page-scroll="">
          <main
            className="aube-table-page"
            data-align={pageAlignment}
            data-columns={pageColumns}
            data-course-priced={courses.some(course => course.course_price != null || Boolean(course.course_price_label?.trim()))}
          >
            <motion.header
              className="aube-table-page-header"
              variants={AUBE_TABLE_PAGE_HEADER_REVEAL}
              initial={prefersReducedMotion ? false : "hidden"}
              animate="visible"
            >
              <h1><ScriptAwareText text={activePage.title} /></h1>
              {activePage.description_visible !== false && activePage.description ? (
                <p className="aube-table-page-description"><ScriptAwareText text={activePage.description} /></p>
              ) : null}
            </motion.header>
            <motion.div
              className="aube-table-page-content"
              variants={AUBE_TABLE_COURSE_REVEAL_CONTAINER}
              initial={prefersReducedMotion ? false : "hidden"}
              animate="visible"
            >
              {pageContent.map(block => block.type === "category" ? <CourseBlock key={block.value.id} course={block.value} priceOptions={data.priceOptions} onOpenImage={openImage} /> : <section key={block.value.id} className="aube-table-widgets" data-aube-table-widgets data-dining-widget={block.value.id}><CafeAWidgetBlock widget={toCafeAWidgetPreview(block.value)} /></section>)}
              {directItems.length > 0 ? (
                <motion.section className="aube-table-direct-items" data-separated={courses.length ? "true" : undefined} variants={AUBE_TABLE_COURSE_REVEAL_ITEMS}>
                  {directItems.map((item) => <MenuItemRow key={item.id} item={item} priceOptions={data.priceOptions} onOpenImage={openImage} />)}
                </motion.section>
              ) : null}
            </motion.div>
          </main>
        </div>
      ) : null}
        </motion.div>
      </AnimatePresence>

      {pagination}

      {!usesSidebarNavigation && activeUnit.type === "page" ? <div className="aube-table-bottom-fade" aria-hidden="true" /> : null}

      </div>

      </div>
      <CafeMenuImageLightbox zIndex={1500} preview={imagePreview} templateKey={data.menuSite.template_key} onClose={closeImage} />
    </>
  );
}
