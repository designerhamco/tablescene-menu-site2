/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
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
  shouldUseAubeTableCoverLogo,
  sortAubeTablePages,
} from "@/lib/aube-table";
import {
  getCustomTypographySettings,
  getEnglishFontLoadAssets,
  getKoreanFontLoadAssets,
  getTypographyCssVariables,
  getTypographyRoleFontLoadAssets,
  mergeTypographySettings,
} from "@/lib/template-typography-presets";
import { formatMenuPrice } from "@/types/menu";

type CourseWithItems = PublicMenuCategory & { items: PublicMenuItem[] };

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

function getPrice(item: PublicMenuItem, options: PublicMenuItemPriceOption[]) {
  const itemOptions = options
    .filter((option) => option.menu_item_id === item.id && option.visible !== false)
    .sort((left, right) => left.sort_order - right.sort_order);
  if (itemOptions.length > 0) {
    return itemOptions.map((option) => `${option.label} ${option.price_label?.trim() || (option.price == null ? "" : `${option.price.toLocaleString("ko-KR")}원`)}`.trim()).join(" · ");
  }
  return formatMenuPrice(item);
}

function CoursePrice({ course }: { course: CourseWithItems }) {
  if (course.course_price_visible === false) return null;
  const price = course.course_price_label?.trim() || (course.course_price == null ? "" : `${course.course_price.toLocaleString("ko-KR")}원`);
  if (!price) return null;
  return <p className="aube-table-course-price"><ScriptAwareText text={price} /></p>;
}

function MenuItemRow({ item, priceOptions }: { item: PublicMenuItem; priceOptions: PublicMenuItemPriceOption[] }) {
  const price = item.price_visible === false ? "" : getPrice(item, priceOptions);
  return (
    <article className="aube-table-item" data-aube-table-item="">
      {item.image_url ? <img className="aube-table-item-image" src={item.image_url} alt="" /> : null}
      <div className="aube-table-item-copy">
        <div className="aube-table-item-heading" data-has-price={price ? "true" : "false"}>
          <h3><ScriptAwareText text={item.name} /></h3>
          {price ? <p className="aube-table-item-price"><ScriptAwareText text={price} /></p> : null}
        </div>
        {item.set_name ? <p className="aube-table-item-secondary"><ScriptAwareText text={item.set_name} /></p> : null}
        {item.description ? <p className="aube-table-item-description"><ScriptAwareText text={item.description} /></p> : null}
        {item.is_sold_out ? <span className="aube-table-sold-out"><ScriptAwareText text="품절" /></span> : null}
      </div>
    </article>
  );
}

function CourseBlock({ course, priceOptions }: { course: CourseWithItems; priceOptions: PublicMenuItemPriceOption[] }) {
  return (
    <motion.section className="aube-table-course" data-aube-table-course="" variants={AUBE_TABLE_COURSE_REVEAL_GROUP}>
      <motion.div variants={AUBE_TABLE_COURSE_REVEAL_HEADING}>
        <header className="aube-table-course-header">
          <div className="aube-table-course-title">
            <h2><ScriptAwareText text={course.name} /></h2>
          </div>
          <span className="aube-table-course-rule" aria-hidden="true" />
          <CoursePrice course={course} />
        </header>
        {course.description_visible !== false && course.description ? (
          <p className="aube-table-course-description"><ScriptAwareText text={course.description} /></p>
        ) : null}
        {course.course_price_description_visible !== false && course.course_price_description ? (
          <p className="aube-table-course-price-description"><ScriptAwareText text={course.course_price_description} /></p>
        ) : null}
      </motion.div>
      <motion.div className="aube-table-course-items" variants={AUBE_TABLE_COURSE_REVEAL_ITEMS}>
        {course.items.map((item) => <MenuItemRow key={item.id} item={item} priceOptions={priceOptions} />)}
      </motion.div>
    </motion.section>
  );
}

export default function DiningAubeTableA(data: PublicMenuTemplateProps) {
  const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(data.menuSite.template_key, customTypography);
  const typographyStyle = getTypographyCssVariables(typographySettings, data.menuSite.template_key);
  const fontAssets = [
    getKoreanFontLoadAssets(typographySettings.korean_font_key),
    getEnglishFontLoadAssets(typographySettings.english_font_key),
    ...getTypographyRoleFontLoadAssets(typographySettings.typography_roles),
  ];
  const visiblePages = useMemo(
    () => sortAubeTablePages(data.pages.filter((page) => page.visible !== false)),
    [data.pages],
  );
  const coverEnabled = data.pageSettings.menu_cover_enabled !== false;
  const units = useMemo(() => buildAubeTableNavigationUnits(coverEnabled, visiblePages), [coverEnabled, visiblePages]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const [failedCoverLogoUrl, setFailedCoverLogoUrl] = useState<string | null>(null);
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
  const pageAlignment = normalizeAubeTableTextAlignment(activePage?.text_alignment);
  const pageColumns = normalizeAubeTableLayoutColumns(activePage?.layout_columns);
  const coverColor = normalizeAubeTableCoverBackgroundColor(data.pageSettings.multi_page_cover_background_color);
  const coverOpacity = normalizeAubeTableCoverBackgroundOpacity(data.pageSettings.multi_page_cover_background_opacity);
  const storeName = data.menuSite.restaurant_name || data.menuSite.business_name || data.menuSite.name;
  const coverTitle = data.menuSite.menu_cover_title || data.menuSite.restaurant_name || data.menuSite.name;
  const coverDescription = data.menuSite.menu_cover_description || data.menuSite.brand_description || data.menuSite.description;
  const useCoverLogo = shouldUseAubeTableCoverLogo(data.menuSite.logo_url, failedCoverLogoUrl);
  if (!activeUnit) return null;

  return (
    <>
      <KoreanFontAssets assets={fontAssets} />
      <div className="aube-table-root cafe-a-typography" style={typographyStyle} data-aube-table="">
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
          drag={units.length > 1 && !prefersReducedMotion ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          dragMomentum={false}
          whileDrag={prefersReducedMotion ? undefined : { opacity: 0.98 }}
          onDragEnd={onSwipeEnd}
        >
      {activeUnit.type === "cover" ? (
        <section className="aube-table-cover" style={{ backgroundColor: coverColor }} data-aube-table-cover="">
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
              <motion.div variants={AUBE_TABLE_COVER_REVEAL_ITEM}>
                <img
                  className="aube-table-cover-logo"
                  src={data.menuSite.logo_url ?? ""}
                  alt={`${storeName} 로고`}
                  onError={() => setFailedCoverLogoUrl(data.menuSite.logo_url)}
                />
              </motion.div>
            ) : null}
            {coverTitle ? <motion.h1 variants={AUBE_TABLE_COVER_REVEAL_ITEM}><ScriptAwareText text={coverTitle} /></motion.h1> : null}
            {coverDescription ? <motion.p className="aube-table-cover-description" variants={AUBE_TABLE_COVER_REVEAL_ITEM}><ScriptAwareText text={coverDescription} /></motion.p> : null}
          </motion.div>
        </section>
      ) : activePage ? (
        <div ref={scrollRef} className="aube-table-page-scroll" data-aube-table-page-scroll="">
          <main
            className="aube-table-page"
            data-align={pageAlignment}
            data-columns={pageColumns}
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
              {courses.map((course) => <CourseBlock key={course.id} course={course} priceOptions={data.priceOptions} />)}
              {directItems.length > 0 ? (
                <motion.section className="aube-table-direct-items" variants={AUBE_TABLE_COURSE_REVEAL_ITEMS}>
                  {directItems.map((item) => <MenuItemRow key={item.id} item={item} priceOptions={data.priceOptions} />)}
                </motion.section>
              ) : null}
            </motion.div>
          </main>
        </div>
      ) : null}
        </motion.div>
      </AnimatePresence>

      {units.length > 1 ? (
        <nav className="aube-table-pagination" aria-label="메뉴 페이지 이동">
          <button
            type="button"
            className="aube-table-pagination-direction aube-table-pagination-prev"
            aria-label="이전 메뉴 페이지"
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
                aria-label={`${unit.label} 페이지로 이동`}
                aria-current={index === safeActiveIndex ? "page" : undefined}
                data-active={index === safeActiveIndex ? "true" : "false"}
                onClick={() => selectUnit(index)}
              />
            ))}
          </div>
          <button
            type="button"
            className="aube-table-pagination-direction aube-table-pagination-next"
            aria-label="다음 메뉴 페이지"
            disabled={safeActiveIndex === units.length - 1}
            onClick={() => selectUnit(safeActiveIndex + 1)}
          >
            <ScriptAwareText text="Next" />
            <span className="aube-table-pagination-arrow" aria-hidden="true" />
          </button>
        </nav>
      ) : null}

      {activeUnit.type === "page" ? <div className="aube-table-bottom-fade" aria-hidden="true" /> : null}

      <style jsx global>{`
        .aube-table-root {
          --aube-accent: #c5a165;
          --aube-type-page-description: clamp(14px, 1.15vw, 17px);
          --aube-type-course-title: clamp(26px, 2.2vw, 32px);
          --aube-type-course-price: clamp(15px, 1.3vw, 18px);
          --aube-type-course-body: clamp(14px, 1.1vw, 16px);
          --aube-type-course-meta: clamp(12px, 1vw, 14px);
          --aube-type-item-title: clamp(17px, 1.45vw, 20px);
          --aube-type-item-price: clamp(15px, 1.25vw, 18px);
          --aube-type-item-secondary: clamp(11px, .9vw, 13px);
          --aube-type-item-body: clamp(13px, 1.1vw, 15px);
          --aube-space-course: clamp(44px, 4.4vw, 62px);
          --aube-space-section-start: clamp(38px, 5vh, 58px);
          --aube-space-item-top: clamp(7px, .7vw, 10px);
          --aube-space-item-bottom: clamp(10px, 1vw, 14px);
          position: relative;
          min-height: 100dvh;
          overflow: hidden;
          background: #fff;
          color: #17191f;
          font-family: var(--menu-font-ko), "Pretendard", sans-serif;
        }
        .aube-table-root.cafe-a-typography .cafe-a-script-ko { font-family: var(--cafe-a-script-ko-font, var(--menu-font-ko)), "Pretendard", sans-serif; }
        .aube-table-root.cafe-a-typography .cafe-a-script-en { font-family: var(--cafe-a-script-en-font, var(--menu-font-en)), "Tenor Sans", var(--menu-font-ko), sans-serif; }
        .aube-table-stage { position: absolute; inset: 0; min-height: 100dvh; touch-action: pan-y; cursor: grab; will-change: transform, opacity; }
        .aube-table-stage:active { cursor: grabbing; }
        .aube-table-cover { position: relative; min-height: 100dvh; display: grid; place-items: center; overflow: hidden; isolation: isolate; }
        .aube-table-cover-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
        .aube-table-cover-overlay { position: absolute; inset: 0; z-index: -1; }
        .aube-table-cover-copy { width: min(92vw, 1240px); padding: 104px 28px 142px; text-align: center; color: #fff; }
        .aube-table-cover-logo { display: block; width: auto; height: auto; max-width: min(300px, 46vw); max-height: 104px; margin: 0 auto clamp(22px, 2.2vw, 32px); object-fit: contain; }
        .aube-table-cover h1 { --cafe-a-script-ko-font: var(--menu-role-brand-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-brand-font-en, var(--menu-font-en)); margin: 0; color: var(--menu-role-brand-color, var(--aube-accent)); font-family: var(--menu-role-brand-font-family, var(--menu-font-en)); font-size: clamp(60px, 7.5vw, 112px); font-weight: var(--menu-role-brand-font-weight, 400); line-height: .96; letter-spacing: .13em; text-indent: .13em; }
        .aube-table-cover-description { --cafe-a-script-ko-font: var(--menu-role-supporting-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-supporting-font-en, var(--menu-font-en)); max-width: 820px; margin: clamp(22px, 2.2vw, 32px) auto 0; font-family: var(--menu-role-supporting-font-family, var(--menu-font-ko)); font-size: clamp(18px, 1.8vw, 27px); font-weight: var(--menu-role-supporting-font-weight, 400); line-height: 1.5; letter-spacing: .02em; opacity: .88; }
        .aube-table-page-scroll { height: 100dvh; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
        .aube-table-page { width: min(100%, 1440px); min-height: 100%; margin: 0 auto; padding: clamp(96px, 12vh, 132px) clamp(30px, 5vw, 80px) clamp(156px, 18vh, 188px); }
        .aube-table-page[data-align="center"] { text-align: center; }
        .aube-table-page-header { --cafe-a-script-ko-font: var(--menu-role-category-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-category-font-en, var(--menu-font-en)); max-width: 820px; margin: 0 auto var(--aube-space-section-start); text-align: center; }
        .aube-table-page-header h1 { margin: 0; color: var(--menu-role-category-color, var(--aube-accent)); font-family: var(--menu-role-category-font-family, var(--menu-font-en)); font-size: clamp(48px, 4.7vw, 68px); font-weight: var(--menu-role-category-font-weight, 400); line-height: 1.05; letter-spacing: -.025em; }
        .aube-table-page-description { --cafe-a-script-ko-font: var(--menu-role-supporting-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-supporting-font-en, var(--menu-font-en)); max-width: 680px; margin: clamp(11px, 1.1vw, 16px) auto 0; color: #72757d; font-family: var(--menu-role-supporting-font-family, var(--menu-font-ko)); font-size: var(--aube-type-page-description); font-weight: var(--menu-role-supporting-font-weight, 400); line-height: 1.55; }
        .aube-table-page-content { display: grid; gap: var(--aube-space-course); text-align: left; }
        .aube-table-page[data-align="center"] .aube-table-page-content { text-align: center; }
        .aube-table-page[data-columns="2"] .aube-table-page-content { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: clamp(52px, 6vw, 92px); row-gap: var(--aube-space-course); }
        .aube-table-course { min-width: 0; }
        .aube-table-course-header { display: grid; grid-template-columns: auto minmax(32px, 1fr) auto; align-items: baseline; gap: clamp(14px, 1.5vw, 22px); }
        .aube-table-course-header:not(:has(.aube-table-course-price)) { grid-template-columns: auto minmax(32px, 1fr); }
        .aube-table-course-title { min-width: 0; }
        .aube-table-course-rule { width: 100%; border-top: 1px solid rgba(197, 161, 101, .38); }
        .aube-table-course-header h2 { --cafe-a-script-ko-font: var(--menu-role-category-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-category-font-en, var(--menu-font-en)); margin: 0; color: var(--menu-role-category-color, #17191f); font-family: var(--menu-role-category-font-family, var(--menu-font-en)); font-size: var(--aube-type-course-title); font-weight: var(--menu-role-category-font-weight, 500); line-height: 1.18; letter-spacing: -.025em; }
        .aube-table-course-price { --cafe-a-script-ko-font: var(--menu-role-price-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-price-font-en, var(--menu-font-en)); margin: 0; white-space: nowrap; color: var(--aube-accent); font-family: var(--menu-role-price-font-family, var(--menu-font-ko)); font-size: var(--aube-type-course-price); font-weight: var(--menu-role-price-font-weight, 700); line-height: 1.35; }
        .aube-table-course-description { --cafe-a-script-ko-font: var(--menu-role-supporting-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-supporting-font-en, var(--menu-font-en)); max-width: 700px; margin: clamp(14px, 1.4vw, 20px) 0 0; color: #666a72; font-family: var(--menu-role-supporting-font-family, var(--menu-font-ko)); font-size: var(--aube-type-course-body); font-weight: var(--menu-role-supporting-font-weight, 400); line-height: 1.58; }
        .aube-table-course-price-description { --cafe-a-script-ko-font: var(--menu-role-supporting-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-supporting-font-en, var(--menu-font-en)); margin: clamp(6px, .65vw, 10px) 0 0; color: #898c93; font-family: var(--menu-role-supporting-font-family, var(--menu-font-ko)); font-size: var(--aube-type-course-meta); font-weight: var(--menu-role-supporting-font-weight, 400); line-height: 1.55; }
        .aube-table-course-items, .aube-table-direct-items { display: grid; gap: 0; }
        .aube-table-course-items { margin-top: var(--aube-space-section-start); }
        .aube-table-direct-items { margin-top: 0; }
        .aube-table-page[data-align="center"] .aube-table-course-header { display: flex; flex-direction: column; align-items: center; gap: clamp(8px, .8vw, 12px); }
        .aube-table-page[data-align="center"] .aube-table-course-rule { width: clamp(42px, 4vw, 58px); }
        .aube-table-page[data-align="center"] .aube-table-course-description { margin-left: auto; margin-right: auto; }
        .aube-table-page[data-align="center"] .aube-table-course-price-description { margin-left: auto; margin-right: auto; }
        .aube-table-direct-items { grid-column: 1 / -1; }
        .aube-table-page[data-columns="2"] .aube-table-direct-items { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: clamp(52px, 6vw, 92px); }
        .aube-table-item { display: grid; grid-template-columns: clamp(96px, 9vw, 124px) minmax(0, 1fr); gap: clamp(20px, 2vw, 28px); padding: var(--aube-space-item-top) 0 var(--aube-space-item-bottom); text-align: left; }
        .aube-table-item:not(:has(.aube-table-item-image)) { grid-template-columns: minmax(0, 1fr); }
        .aube-table-item-image { width: clamp(96px, 9vw, 124px); height: clamp(96px, 9vw, 124px); border-radius: 2px; object-fit: cover; }
        .aube-table-item-heading { display: flex; align-items: baseline; gap: clamp(10px, 1vw, 16px); }
        .aube-table-item-heading[data-has-price="true"]::after { content: ""; order: 2; min-width: 24px; height: 1.5px; flex: 1; background-image: radial-gradient(circle, rgba(197, 161, 101, .42) .65px, transparent .78px); background-position: left center; background-repeat: repeat-x; background-size: 5px 1.5px; }
        .aube-table-item h3 { --cafe-a-script-ko-font: var(--menu-role-item-name-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-item-name-font-en, var(--menu-font-en)); order: 1; margin: 0; font-family: var(--menu-role-item-name-font-family, var(--menu-font-ko)); font-size: var(--aube-type-item-title); font-weight: var(--menu-role-item-name-font-weight, 500); line-height: 1.3; letter-spacing: -.018em; }
        .aube-table-item-price { --cafe-a-script-ko-font: var(--menu-role-price-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-price-font-en, var(--menu-font-en)); order: 3; margin: 0; white-space: normal; text-align: right; color: var(--aube-accent); font-family: var(--menu-role-price-font-family, var(--menu-font-ko)); font-size: var(--aube-type-item-price); font-weight: var(--menu-role-price-font-weight, 600); line-height: 1.32; }
        .aube-table-item-secondary { --cafe-a-script-ko-font: var(--menu-role-supporting-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-supporting-font-en, var(--menu-font-en)); margin: clamp(7px, .7vw, 10px) 0 0; color: #898c93; font-family: var(--menu-role-supporting-font-family, var(--menu-font-ko)); font-size: var(--aube-type-item-secondary); font-weight: var(--menu-role-supporting-font-weight, 700); line-height: 1.4; letter-spacing: .06em; }
        .aube-table-item-description { --cafe-a-script-ko-font: var(--menu-role-supporting-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-supporting-font-en, var(--menu-font-en)); max-width: 720px; margin: clamp(7px, .75vw, 10px) 0 0; color: #70737a; font-family: var(--menu-role-supporting-font-family, var(--menu-font-ko)); font-size: var(--aube-type-item-body); font-weight: var(--menu-role-supporting-font-weight, 400); line-height: 1.55; }
        .aube-table-page[data-align="center"] .aube-table-item { text-align: center; }
        .aube-table-page[data-align="center"] .aube-table-item-heading { justify-content: center; }
        .aube-table-page[data-align="center"] .aube-table-item-description { margin-left: auto; margin-right: auto; }
        .aube-table-sold-out { --cafe-a-script-ko-font: var(--menu-role-supporting-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-supporting-font-en, var(--menu-font-en)); display: inline-flex; margin-top: 14px; padding: 6px 10px; background: #17191f; color: #fff; font-family: var(--menu-role-supporting-font-ko, var(--menu-font-ko)); font-size: clamp(11px, .9vw, 13px); font-weight: var(--menu-role-supporting-font-weight, 700); letter-spacing: .08em; }
        .aube-table-bottom-fade { position: fixed; z-index: 15; inset: auto 0 0; height: clamp(116px, 17vh, 174px); pointer-events: none; background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, .82) 52%, #fff 86%); }
        .aube-table-pagination { position: fixed; z-index: 20; left: 50%; bottom: max(22px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; align-items: center; justify-content: center; padding: 0; }
        .aube-table-pagination-dots { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .aube-table-pagination-dot { width: 5.5px; height: 5.5px; border: 0; border-radius: 999px; padding: 0; background: #c9c9c9; transition: background-color .2s ease, transform .2s ease; }
        .aube-table-pagination-dot[data-active="true"] { background: var(--aube-accent); transform: scale(1.06); }
        .aube-table-pagination-dot[data-active="true"]:focus { outline: none; }
        .aube-table-pagination-dot:focus-visible:not([data-active="true"]), .aube-table-pagination-direction:focus-visible { outline: 2px solid var(--aube-accent); outline-offset: 5px; }
        .aube-table-pagination-direction { --cafe-a-script-ko-font: var(--menu-role-supporting-font-ko, var(--menu-font-ko)); --cafe-a-script-en-font: var(--menu-role-supporting-font-en, var(--menu-font-en)); display: none; align-items: center; gap: 12px; border: 0; padding: 8px 0; background: transparent; color: #5d6470; font-family: var(--menu-role-supporting-font-en, var(--menu-font-en)), var(--menu-role-supporting-font-ko, var(--menu-font-ko)), sans-serif; font-size: 14px; font-weight: var(--menu-role-supporting-font-weight, 400); letter-spacing: .16em; text-transform: uppercase; transition: color .22s ease; }
        .aube-table-pagination-arrow { display: block; width: 9px; height: 11px; flex: 0 0 auto; background: currentColor; -webkit-mask: url("/menu-templates/dining_aube_table_a/aube-pagination-arrow.svg") center / contain no-repeat; mask: url("/menu-templates/dining_aube_table_a/aube-pagination-arrow.svg") center / contain no-repeat; }
        .aube-table-pagination-prev .aube-table-pagination-arrow { transform: rotate(180deg); }
        .aube-table-pagination-direction:disabled { opacity: .2; cursor: default; }
        @media (min-width: 1280px) and (hover: hover) and (pointer: fine) {
          .aube-table-pagination { width: min(calc(100vw - 96px), 640px); display: grid; grid-template-columns: minmax(120px, 1fr) auto minmax(120px, 1fr); }
          .aube-table-pagination-direction { display: inline-flex; }
          .aube-table-pagination-prev { justify-self: start; }
          .aube-table-pagination-next { justify-self: end; }
          .aube-table-pagination-direction:not(:disabled):hover, .aube-table-pagination-direction:not(:disabled):focus-visible { color: var(--aube-accent); }
          .aube-table-pagination-prev:not(:disabled):hover .aube-table-pagination-arrow, .aube-table-pagination-prev:not(:disabled):focus-visible .aube-table-pagination-arrow { animation: aube-table-arrow-prev .56s cubic-bezier(.22, .8, .36, 1); }
          .aube-table-pagination-next:not(:disabled):hover .aube-table-pagination-arrow, .aube-table-pagination-next:not(:disabled):focus-visible .aube-table-pagination-arrow { animation: aube-table-arrow-next .56s cubic-bezier(.22, .8, .36, 1); }
        }
        @keyframes aube-table-arrow-prev { 0%, 100% { transform: translateX(0) rotate(180deg); } 48% { transform: translateX(-5px) rotate(180deg); } }
        @keyframes aube-table-arrow-next { 0%, 100% { transform: translateX(0); } 48% { transform: translateX(5px); } }
        @media (prefers-reduced-motion: reduce) {
          .aube-table-stage { will-change: auto; }
          .aube-table-pagination-direction:not(:disabled) .aube-table-pagination-arrow { animation: none !important; }
        }
        @media (max-width: 720px) {
          .aube-table-root {
            --aube-type-page-description: clamp(14px, 3.8vw, 16px);
            --aube-type-course-title: clamp(24px, 6.7vw, 29px);
            --aube-type-course-price: clamp(14px, 4vw, 17px);
            --aube-type-course-body: clamp(14px, 3.8vw, 16px);
            --aube-type-course-meta: clamp(12px, 3.2vw, 14px);
            --aube-type-item-title: clamp(17px, 4.7vw, 20px);
            --aube-type-item-price: clamp(14px, 4vw, 17px);
            --aube-type-item-secondary: clamp(10px, 2.8vw, 12px);
            --aube-type-item-body: clamp(13px, 3.6vw, 15px);
            --aube-space-course: clamp(42px, 11.5vw, 54px);
            --aube-space-section-start: 36px;
            --aube-space-item-top: clamp(8px, 2.2vw, 11px);
            --aube-space-item-bottom: clamp(11px, 3vw, 15px);
          }
          .aube-table-cover-copy { width: min(92vw, 680px); padding: 88px 22px 124px; }
          .aube-table-cover-logo { max-width: min(230px, 58vw); max-height: 84px; margin-bottom: 22px; }
          .aube-table-cover h1 { font-size: clamp(42px, 11.5vw, 58px); line-height: 1; letter-spacing: .1em; text-indent: .1em; }
          .aube-table-cover-description { margin-top: clamp(18px, 5vw, 24px); font-size: clamp(16px, 4.7vw, 20px); line-height: 1.5; }
          .aube-table-page { padding: 82px 24px 132px; }
          .aube-table-page-header { margin-bottom: 36px; }
          .aube-table-page-header h1 { font-size: clamp(38px, 11vw, 48px); }
          .aube-table-page-description { margin-top: 11px; }
          .aube-table-page[data-columns="2"] .aube-table-page-content, .aube-table-page[data-columns="2"] .aube-table-direct-items { grid-template-columns: 1fr; }
          .aube-table-page-content { gap: var(--aube-space-course); }
          .aube-table-course-header { grid-template-columns: auto minmax(20px, 1fr) auto; gap: 12px; }
          .aube-table-item { grid-template-columns: clamp(76px, 21vw, 92px) minmax(0, 1fr); gap: clamp(14px, 4vw, 18px); padding: var(--aube-space-item-top) 0 var(--aube-space-item-bottom); }
          .aube-table-item-image { width: clamp(76px, 21vw, 92px); height: clamp(76px, 21vw, 92px); }
          .aube-table-item-heading { gap: clamp(8px, 2.5vw, 11px); }
          .aube-table-bottom-fade { height: clamp(104px, 15vh, 136px); }
        }
      `}</style>
      </div>
    </>
  );
}
