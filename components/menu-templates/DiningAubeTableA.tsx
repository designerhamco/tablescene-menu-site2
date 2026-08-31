/* eslint-disable @next/next/no-img-element */
"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ScriptAwareText from "@/components/menu-templates/shared/ScriptAwareText";
import type {
  PublicMenuCategory,
  PublicMenuItem,
  PublicMenuItemPriceOption,
  PublicMenuTemplateProps,
} from "@/components/menu-templates/types";
import {
  buildAubeTableNavigationUnits,
  normalizeAubeTableCoverBackgroundColor,
  normalizeAubeTableCoverBackgroundOpacity,
  normalizeAubeTableLayoutColumns,
  normalizeAubeTableTextAlignment,
  sortAubeTablePages,
} from "@/lib/aube-table";
import { formatMenuPrice } from "@/types/menu";

type CourseWithItems = PublicMenuCategory & { items: PublicMenuItem[] };

function getMenuSiteSettings(data: PublicMenuTemplateProps) {
  const settings = data.menuSite.settings;
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? settings as Record<string, unknown>
    : {};
}

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
        <div className="aube-table-item-heading">
          <h3><ScriptAwareText text={item.name} /></h3>
          {price ? <p className="aube-table-item-price"><ScriptAwareText text={price} /></p> : null}
        </div>
        {item.set_name ? <p className="aube-table-item-secondary"><ScriptAwareText text={item.set_name} /></p> : null}
        {item.description ? <p className="aube-table-item-description"><ScriptAwareText text={item.description} /></p> : null}
        {item.is_sold_out ? <span className="aube-table-sold-out">품절</span> : null}
      </div>
    </article>
  );
}

function CourseBlock({ course, priceOptions }: { course: CourseWithItems; priceOptions: PublicMenuItemPriceOption[] }) {
  return (
    <section className="aube-table-course" data-aube-table-course="">
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
      <div className="aube-table-course-items">
        {course.items.map((item) => <MenuItemRow key={item.id} item={item} priceOptions={priceOptions} />)}
      </div>
    </section>
  );
}

export default function DiningAubeTableA(data: PublicMenuTemplateProps) {
  const visiblePages = useMemo(
    () => sortAubeTablePages(data.pages.filter((page) => page.visible !== false)),
    [data.pages],
  );
  const coverEnabled = data.pageSettings.menu_cover_enabled !== false;
  const units = useMemo(() => buildAubeTableNavigationUnits(coverEnabled, visiblePages), [coverEnabled, visiblePages]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedCoverLogoUrl, setFailedCoverLogoUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const safeActiveIndex = Math.max(0, Math.min(activeIndex, units.length - 1));

  const selectUnit = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(units.length - 1, index));
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: "auto" }));
  }, [units.length]);

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

  function onPointerDown(event: ReactPointerEvent) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: ReactPointerEvent) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    selectUnit(safeActiveIndex + (deltaX < 0 ? 1 : -1));
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
  const siteSettings = getMenuSiteSettings(data);
  const useCoverLogo = Boolean(
    data.menuSite.logo_url &&
    siteSettings.logo_replaces_name === true &&
    failedCoverLogoUrl !== data.menuSite.logo_url,
  );
  const showCoverStoreName = Boolean(storeName && storeName.trim() !== coverTitle?.trim());

  if (!activeUnit) return null;

  return (
    <div className="aube-table-root cafe-a-typography" data-aube-table="" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      {activeUnit.type === "cover" ? (
        <section className="aube-table-cover" style={{ backgroundColor: coverColor }} data-aube-table-cover="">
          {data.pageSettings.cover_image_visible !== false && data.menuSite.cover_image_url ? (
            <img className="aube-table-cover-image" src={data.menuSite.cover_image_url} alt="" />
          ) : null}
          <div
            className="aube-table-cover-overlay"
            style={{ backgroundColor: coverColor, opacity: coverOpacity / 100 }}
          />
          <div className="aube-table-cover-copy">
            {useCoverLogo ? (
              <img
                className="aube-table-cover-logo"
                src={data.menuSite.logo_url ?? ""}
                alt={`${storeName} 로고`}
                onError={() => setFailedCoverLogoUrl(data.menuSite.logo_url)}
              />
            ) : showCoverStoreName ? (
              <p className="aube-table-cover-brand"><ScriptAwareText text={storeName} /></p>
            ) : null}
            {coverTitle ? <h1><ScriptAwareText text={coverTitle} /></h1> : null}
            {coverDescription ? <p className="aube-table-cover-description"><ScriptAwareText text={coverDescription} /></p> : null}
          </div>
        </section>
      ) : activePage ? (
        <div ref={scrollRef} className="aube-table-page-scroll" data-aube-table-page-scroll="">
          <main className="aube-table-page" data-align={pageAlignment} data-columns={pageColumns}>
            <header className="aube-table-page-header">
              <h1><ScriptAwareText text={activePage.title} /></h1>
              {activePage.description_visible !== false && activePage.description ? (
                <p className="aube-table-page-description"><ScriptAwareText text={activePage.description} /></p>
              ) : null}
            </header>
            <div className="aube-table-page-content">
              {courses.map((course) => <CourseBlock key={course.id} course={course} priceOptions={data.priceOptions} />)}
              {directItems.length > 0 ? (
                <section className="aube-table-direct-items">
                  {directItems.map((item) => <MenuItemRow key={item.id} item={item} priceOptions={data.priceOptions} />)}
                </section>
              ) : null}
            </div>
          </main>
        </div>
      ) : null}

      {units.length > 1 ? (
        <nav className="aube-table-pagination" aria-label="메뉴 페이지 이동">
          {units.map((unit, index) => (
            <button
              type="button"
              key={unit.id}
              aria-label={`${unit.label} 페이지로 이동`}
              aria-current={index === safeActiveIndex ? "page" : undefined}
              data-active={index === safeActiveIndex ? "true" : "false"}
              onClick={() => selectUnit(index)}
            />
          ))}
        </nav>
      ) : null}

      <style jsx global>{`
        .aube-table-root { position: relative; min-height: 100dvh; overflow: hidden; background: #fbfaf7; color: #17191f; }
        .aube-table-cover { position: relative; min-height: 100dvh; display: grid; place-items: center; overflow: hidden; isolation: isolate; }
        .aube-table-cover-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
        .aube-table-cover-overlay { position: absolute; inset: 0; z-index: -1; }
        .aube-table-cover-copy { width: min(88vw, 860px); padding: 104px 28px 142px; text-align: center; color: #fff; }
        .aube-table-cover-logo { display: block; width: auto; height: auto; max-width: min(240px, 54vw); max-height: 88px; margin: 0 auto 34px; object-fit: contain; }
        .aube-table-cover-brand { margin: 0 0 28px; font-size: 13px; font-weight: 700; letter-spacing: .18em; }
        .aube-table-cover h1 { margin: 0; font-family: var(--menu-role-brand-font-en, var(--menu-font-en)), var(--menu-font-ko), serif; font-size: clamp(52px, 8vw, 110px); font-weight: 600; line-height: .96; letter-spacing: -.045em; }
        .aube-table-cover-description { max-width: 620px; margin: 30px auto 0; font-size: clamp(15px, 1.45vw, 19px); line-height: 1.75; opacity: .84; }
        .aube-table-page-scroll { height: 100dvh; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
        .aube-table-page { width: min(100%, 1280px); min-height: 100%; margin: 0 auto; padding: clamp(94px, 12vh, 148px) clamp(30px, 6vw, 86px) 168px; }
        .aube-table-page[data-align="center"] { text-align: center; }
        .aube-table-page-header { max-width: 820px; margin-bottom: clamp(76px, 9vh, 112px); }
        .aube-table-page[data-align="center"] .aube-table-page-header { margin-left: auto; margin-right: auto; }
        .aube-table-page-header h1 { margin: 0; color: #b58c4b; font-family: var(--menu-role-brand-font-en, var(--menu-font-en)), var(--menu-font-ko), serif; font-size: clamp(50px, 6.5vw, 84px); font-weight: 500; line-height: 1; letter-spacing: -.04em; }
        .aube-table-page-description { max-width: 640px; margin: 24px 0 0; color: #72757d; font-size: 16px; line-height: 1.75; }
        .aube-table-page[data-align="center"] .aube-table-page-description { margin-left: auto; margin-right: auto; }
        .aube-table-page-content { display: grid; gap: clamp(76px, 8vw, 112px); text-align: left; }
        .aube-table-page[data-columns="2"] .aube-table-page-content { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: clamp(58px, 7vw, 104px); row-gap: clamp(72px, 8vw, 108px); }
        .aube-table-course { min-width: 0; }
        .aube-table-course-header { display: grid; grid-template-columns: auto minmax(32px, 1fr) auto; align-items: center; gap: 18px; }
        .aube-table-course-title { min-width: 0; }
        .aube-table-course-rule { width: 100%; border-top: 1px solid #d9ccb7; }
        .aube-table-course-header h2 { margin: 0; font-size: clamp(27px, 2.6vw, 38px); font-weight: 500; line-height: 1.12; letter-spacing: -.035em; }
        .aube-table-course-price { margin: 0; white-space: nowrap; color: #b58c4b; font-size: 17px; font-weight: 700; }
        .aube-table-course-description { max-width: 660px; margin: 18px 0 0; color: #666a72; font-size: 15px; line-height: 1.72; }
        .aube-table-course-price-description { margin: 8px 0 0; color: #95979d; font-size: 13px; line-height: 1.65; }
        .aube-table-course-items, .aube-table-direct-items { display: grid; gap: 0; margin-top: 38px; }
        .aube-table-direct-items { grid-column: 1 / -1; }
        .aube-table-page[data-columns="2"] .aube-table-direct-items { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: clamp(58px, 7vw, 104px); }
        .aube-table-item { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 22px; padding: 18px 0 22px; text-align: left; }
        .aube-table-item:not(:has(.aube-table-item-image)) { grid-template-columns: minmax(0, 1fr); }
        .aube-table-item-image { width: 96px; height: 96px; border-radius: 2px; object-fit: cover; }
        .aube-table-item-heading { display: flex; align-items: baseline; gap: 14px; }
        .aube-table-item-heading::after { content: ""; order: 2; min-width: 24px; flex: 1; border-top: 1px dotted #d6c9b4; }
        .aube-table-item h3 { order: 1; margin: 0; font-size: 18px; font-weight: 700; line-height: 1.42; letter-spacing: -.018em; }
        .aube-table-item-price { order: 3; margin: 0; white-space: nowrap; color: #b58c4b; font-size: 15px; font-weight: 700; }
        .aube-table-item-secondary { margin: 7px 0 0; color: #98999f; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
        .aube-table-item-description { margin: 9px 0 0; color: #7a7d84; font-size: 14px; line-height: 1.65; }
        .aube-table-sold-out { display: inline-flex; margin-top: 12px; padding: 5px 9px; background: #17191f; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: .08em; }
        .aube-table-pagination { position: fixed; z-index: 20; left: 50%; bottom: max(22px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; align-items: center; gap: 9px; padding: 12px 16px; border: 1px solid #e7e2da; border-radius: 999px; background: #fff; box-shadow: 0 10px 30px rgba(23,25,31,.12); }
        .aube-table-pagination button { width: 7px; height: 7px; border: 0; border-radius: 999px; padding: 0; background: #c7c4be; transition: width .2s ease, background .2s ease; }
        .aube-table-pagination button[data-active="true"] { width: 25px; background: #b58c4b; }
        @media (max-width: 720px) {
          .aube-table-cover-copy { padding: 88px 22px 124px; }
          .aube-table-cover-logo { max-width: min(200px, 58vw); max-height: 72px; margin-bottom: 26px; }
          .aube-table-page { padding: 82px 24px 132px; }
          .aube-table-page-header { margin-bottom: 64px; }
          .aube-table-page-header h1 { font-size: clamp(42px, 13vw, 58px); }
          .aube-table-page-description { margin-top: 18px; font-size: 14px; }
          .aube-table-page[data-columns="2"] .aube-table-page-content, .aube-table-page[data-columns="2"] .aube-table-direct-items { grid-template-columns: 1fr; }
          .aube-table-page-content { gap: 68px; }
          .aube-table-course-header { grid-template-columns: auto minmax(20px, 1fr) auto; gap: 12px; }
          .aube-table-course-header h2 { font-size: 27px; }
          .aube-table-course-price { font-size: 14px; }
          .aube-table-item { grid-template-columns: 76px minmax(0, 1fr); gap: 16px; padding: 17px 0 20px; }
          .aube-table-item-image { width: 76px; height: 76px; }
          .aube-table-item-heading { gap: 10px; }
          .aube-table-item h3 { font-size: 16px; }
          .aube-table-item-price { font-size: 13px; }
          .aube-table-item-description { font-size: 13px; }
        }
      `}</style>
    </div>
  );
}
