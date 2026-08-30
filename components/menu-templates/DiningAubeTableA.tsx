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
  normalizeAubeTableLayoutColumns,
  normalizeAubeTableTextAlignment,
  sortAubeTablePages,
} from "@/lib/aube-table";
import { formatMenuPrice } from "@/types/menu";

type CourseWithItems = PublicMenuCategory & { items: PublicMenuItem[] };

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
        {item.is_sold_out ? <span className="aube-table-sold-out">SOLD OUT</span> : null}
      </div>
    </article>
  );
}

function CourseBlock({ course, priceOptions }: { course: CourseWithItems; priceOptions: PublicMenuItemPriceOption[] }) {
  return (
    <section className="aube-table-course" data-aube-table-course="">
      <header className="aube-table-course-header">
        <div>
          <p className="aube-table-course-eyebrow">COURSE</p>
          <h2><ScriptAwareText text={course.name} /></h2>
        </div>
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
  const coverTitle = data.menuSite.menu_cover_title || data.menuSite.restaurant_name || data.menuSite.name;
  const coverDescription = data.menuSite.menu_cover_description || data.menuSite.brand_description || data.menuSite.description;

  if (!activeUnit) return null;

  return (
    <div className="aube-table-root cafe-a-typography" data-aube-table="" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      {activeUnit.type === "cover" ? (
        <section className="aube-table-cover" style={{ backgroundColor: coverColor }} data-aube-table-cover="">
          {data.pageSettings.cover_image_visible !== false && data.menuSite.cover_image_url ? (
            <img className="aube-table-cover-image" src={data.menuSite.cover_image_url} alt="" />
          ) : null}
          <div className="aube-table-cover-overlay" />
          <div className="aube-table-cover-copy">
            <p className="aube-table-cover-eyebrow">FINE DINING MENU</p>
            {coverTitle ? <h1><ScriptAwareText text={coverTitle} /></h1> : null}
            {coverDescription ? <p className="aube-table-cover-description"><ScriptAwareText text={coverDescription} /></p> : null}
          </div>
        </section>
      ) : activePage ? (
        <div ref={scrollRef} className="aube-table-page-scroll" data-aube-table-page-scroll="">
          <main className="aube-table-page" data-align={pageAlignment} data-columns={pageColumns}>
            <header className="aube-table-page-header">
              <p className="aube-table-page-eyebrow">{data.menuSite.restaurant_name || data.menuSite.name}</p>
              <h1><ScriptAwareText text={activePage.title} /></h1>
              {activePage.description_visible !== false && activePage.description ? (
                <p className="aube-table-page-description"><ScriptAwareText text={activePage.description} /></p>
              ) : null}
            </header>
            <div className="aube-table-page-content">
              {directItems.length > 0 ? (
                <section className="aube-table-direct-items">
                  {directItems.map((item) => <MenuItemRow key={item.id} item={item} priceOptions={data.priceOptions} />)}
                </section>
              ) : null}
              {courses.map((course) => <CourseBlock key={course.id} course={course} priceOptions={data.priceOptions} />)}
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

      <style jsx>{`
        .aube-table-root { position: relative; min-height: 100dvh; overflow: hidden; background: #f5f1e9; color: #201e19; }
        .aube-table-cover { position: relative; min-height: 100dvh; display: grid; place-items: center; overflow: hidden; isolation: isolate; }
        .aube-table-cover-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
        .aube-table-cover-overlay { position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(12,11,9,.2), rgba(12,11,9,.72)); }
        .aube-table-cover-copy { width: min(86vw, 780px); padding: 96px 24px 132px; text-align: center; color: #fff; }
        .aube-table-cover-eyebrow, .aube-table-page-eyebrow, .aube-table-course-eyebrow { margin: 0 0 16px; font-size: 11px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; opacity: .72; }
        .aube-table-cover h1 { margin: 0; font-family: var(--menu-role-brand-font-en, var(--menu-font-en)), var(--menu-font-ko), serif; font-size: clamp(48px, 8vw, 108px); font-weight: 700; line-height: .94; letter-spacing: -.045em; }
        .aube-table-cover-description { max-width: 580px; margin: 28px auto 0; font-size: clamp(14px, 1.4vw, 18px); line-height: 1.8; opacity: .82; }
        .aube-table-page-scroll { height: 100dvh; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
        .aube-table-page { width: min(100%, 1180px); min-height: 100%; margin: 0 auto; padding: clamp(84px, 11vh, 138px) clamp(24px, 6vw, 80px) 148px; }
        .aube-table-page[data-align="center"] { text-align: center; }
        .aube-table-page-header { max-width: 720px; margin-bottom: clamp(56px, 8vh, 92px); }
        .aube-table-page[data-align="center"] .aube-table-page-header { margin-left: auto; margin-right: auto; }
        .aube-table-page-header h1 { margin: 0; font-family: var(--menu-role-brand-font-en, var(--menu-font-en)), var(--menu-font-ko), serif; font-size: clamp(42px, 6vw, 74px); line-height: 1.02; letter-spacing: -.045em; }
        .aube-table-page-description { max-width: 620px; margin: 22px 0 0; color: #6f695f; font-size: 15px; line-height: 1.75; }
        .aube-table-page[data-align="center"] .aube-table-page-description { margin-left: auto; margin-right: auto; }
        .aube-table-page-content { display: grid; gap: clamp(64px, 8vw, 112px); }
        .aube-table-course { border-top: 1px solid rgba(32,30,25,.25); padding-top: 30px; }
        .aube-table-course-header { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
        .aube-table-course-header h2 { margin: 0; font-size: clamp(25px, 3vw, 36px); line-height: 1.1; letter-spacing: -.035em; }
        .aube-table-course-price { margin: 0; white-space: nowrap; font-size: 16px; font-weight: 800; }
        .aube-table-course-description { max-width: 640px; margin: 15px 0 0; color: #666055; font-size: 14px; line-height: 1.7; }
        .aube-table-course-price-description { margin: 7px 0 0; color: #918a7e; font-size: 12px; line-height: 1.6; }
        .aube-table-course-items, .aube-table-direct-items { display: grid; gap: 0; margin-top: 34px; }
        .aube-table-page[data-columns="2"] .aube-table-course-items, .aube-table-page[data-columns="2"] .aube-table-direct-items { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: clamp(32px, 5vw, 68px); }
        .aube-table-item { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 18px; padding: 22px 0; border-bottom: 1px solid rgba(32,30,25,.13); text-align: left; }
        .aube-table-item:not(:has(.aube-table-item-image)) { grid-template-columns: minmax(0, 1fr); }
        .aube-table-item-image { width: 84px; height: 84px; border-radius: 3px; object-fit: cover; }
        .aube-table-item-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 18px; }
        .aube-table-item h3 { margin: 0; font-size: 16px; font-weight: 800; line-height: 1.35; }
        .aube-table-item-price { margin: 0; white-space: nowrap; font-size: 14px; font-weight: 800; }
        .aube-table-item-secondary { margin: 6px 0 0; color: #8a8377; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
        .aube-table-item-description { margin: 8px 0 0; color: #70695e; font-size: 12px; line-height: 1.65; }
        .aube-table-sold-out { display: inline-flex; margin-top: 10px; padding: 4px 8px; background: #201e19; color: #fff; font-size: 9px; font-weight: 800; letter-spacing: .1em; }
        .aube-table-pagination { position: fixed; z-index: 20; left: 50%; bottom: max(22px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; align-items: center; gap: 9px; padding: 12px 16px; border-radius: 999px; background: #201e19; }
        .aube-table-pagination button { width: 7px; height: 7px; border: 0; border-radius: 999px; padding: 0; background: #777268; transition: width .2s ease, background .2s ease; }
        .aube-table-pagination button[data-active="true"] { width: 25px; background: #fff; }
        @media (max-width: 720px) {
          .aube-table-page { padding: 74px 22px 124px; }
          .aube-table-page-header { margin-bottom: 52px; }
          .aube-table-page[data-columns="2"] .aube-table-course-items, .aube-table-page[data-columns="2"] .aube-table-direct-items { grid-template-columns: 1fr; }
          .aube-table-course-header { align-items: start; }
          .aube-table-item { grid-template-columns: 72px minmax(0, 1fr); gap: 14px; }
          .aube-table-item-image { width: 72px; height: 72px; }
        }
      `}</style>
    </div>
  );
}
