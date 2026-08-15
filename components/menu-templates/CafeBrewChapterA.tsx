/* eslint-disable @next/next/no-img-element */
"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import ScriptAwareText from "@/components/menu-templates/shared/ScriptAwareText";
import { useTimeSaleNow } from "@/components/menu-templates/shared/useTimeSaleNow";
import type { PublicMenuCategory, PublicMenuItem, PublicMenuItemPriceOption, PublicMenuTemplateProps, PublicMenuTimeSale } from "@/components/menu-templates/types";
import MenuOrderAddButton from "@/components/public-menu/order-call/MenuOrderAddButton";
import { getMenuTimeSaleAuxiliaryLabels, isMenuTimeSaleActive } from "@/lib/menu-time-sale-display";
import { getReadableTextColorForTimeSaleBadge, normalizeTimeSaleBadgeBackgroundColor } from "@/lib/menu-time-sales";
import { getBadgeStyleCss, getBadgeStyleForItem, getCustomBadgeStyles } from "@/lib/template-badge-styles";
import {
  getCustomTypographySettings,
  getEnglishFontLoadAssets,
  getKoreanFontLoadAssets,
  getTypographyCssVariables,
  getTypographyRoleFontLoadAssets,
  mergeTypographySettings,
} from "@/lib/template-typography-presets";
import { formatMenuPrice } from "@/types/menu";

type BrewChapterUnit =
  | { type: "cover"; id: "cover" }
  | { type: "category"; id: string; categoryId: string; label: string };

type BrewChapterMenuCategory = PublicMenuCategory & {
  items: PublicMenuItem[];
};

function getSettingsRecord(settings: PublicMenuTemplateProps["menuSite"]["settings"]) {
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? settings as Record<string, unknown>
    : {};
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getStringSetting(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getCoverNotices(data: PublicMenuTemplateProps) {
  const settings = getSettingsRecord(data.menuSite.settings);
  return [
    getStringSetting(settings, "footer_notice_1"),
    getStringSetting(settings, "footer_notice_2"),
    getStringSetting(settings, "footer_notice_3"),
  ].filter((row): row is string => Boolean(row));
}

function sortBySortOrderAndName<T extends { sort_order: number }>(items: T[], getName: (item: T) => string | null | undefined) {
  return [...items].sort((left, right) => left.sort_order - right.sort_order || (getName(left) ?? "").localeCompare(getName(right) ?? "", "ko"));
}

function getMenuCategories(data: PublicMenuTemplateProps): BrewChapterMenuCategory[] {
  const pages = sortBySortOrderAndName(data.pages.filter((page) => page.visible !== false), (page) => page.title);
  const pageOrder = new Map(pages.map((page, index) => [page.id, index]));
  const visiblePageIds = new Set(pages.map((page) => page.id));
  const itemsByCategoryId = new Map<string, PublicMenuItem[]>();

  sortBySortOrderAndName(data.items.filter((item) => item.visible !== false), (item) => item.name).forEach((item) => {
    if (typeof item.category_id !== "string") return;
    const items = itemsByCategoryId.get(item.category_id) ?? [];
    items.push(item);
    itemsByCategoryId.set(item.category_id, items);
  });

  return [...data.categories]
    .filter((category) => (
      category.visible !== false &&
      (typeof category.menu_page_id !== "string" || visiblePageIds.has(category.menu_page_id))
    ))
    .sort((left, right) => {
      const leftPageOrder = typeof left.menu_page_id === "string" ? pageOrder.get(left.menu_page_id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      const rightPageOrder = typeof right.menu_page_id === "string" ? pageOrder.get(right.menu_page_id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      return leftPageOrder - rightPageOrder || left.sort_order - right.sort_order || left.name.localeCompare(right.name, "ko");
    })
    .map((category) => ({
      ...category,
      items: itemsByCategoryId.get(category.id) ?? [],
    }));
}

function getTimeSaleForItem(timeSales: PublicMenuTimeSale[], itemId: string) {
  for (const promotion of timeSales) {
    const match = promotion.items.find((item) => item.visible !== false && item.menuItemId === itemId);
    if (match) return { promotion, match };
  }
  return null;
}

function getTimeSaleBadgeStyle(backgroundColor: string): CSSProperties {
  const normalizedBackgroundColor = normalizeTimeSaleBadgeBackgroundColor(backgroundColor);
  return {
    backgroundColor: normalizedBackgroundColor,
    color: getReadableTextColorForTimeSaleBadge(normalizedBackgroundColor),
  };
}

function formatPriceNumber(price: number | null | undefined) {
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(price);
}

function getVisiblePriceColumns(category: BrewChapterMenuCategory) {
  return category.priceColumns
    .filter((column) => column.visible !== false)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, "ko"))
    .slice(0, 3);
}

function formatColumnPriceValue(value: PublicMenuItem["priceColumnValues"][number] | undefined) {
  if (!value || value.visible === false) return "";
  return value.priceLabel?.trim() || formatPriceNumber(value.price) || "";
}

function getSharedPriceColumnTokens(category: BrewChapterMenuCategory, item: PublicMenuItem) {
  const columns = getVisiblePriceColumns(category);
  if (columns.length === 0 || item.priceColumnValues.length === 0) return [];

  const valueByColumnId = new Map(item.priceColumnValues.filter((value) => value.visible !== false).map((value) => [value.priceColumnId, value]));
  const tokens = columns.map((column) => ({
    columnId: column.id,
    label: column.label,
    price: formatColumnPriceValue(valueByColumnId.get(column.id)),
  }));

  return tokens.some((token) => token.price) ? tokens : [];
}

function getPriceTokens(item: PublicMenuItem, itemPriceOptions: PublicMenuItemPriceOption[]) {
  if (item.priceColumnValues.some((value) => value.visible !== false)) return [];

  const visibleOptions = itemPriceOptions.filter((option) => option.visible !== false && option.menu_item_id === item.id);
  if (visibleOptions.length > 0) {
    return visibleOptions
      .sort((left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label, "ko"))
      .map((option) => ({
        label: option.label,
        price: option.price_label?.trim() || formatPriceNumber(option.price),
      }))
      .filter((token): token is { label: string; price: string } => Boolean(token.price));
  }

  const basePrice = formatMenuPrice(item);
  return basePrice ? [{ label: "", price: basePrice }] : [];
}

function buildUnits(coverPageEnabled: boolean, menuCategories: BrewChapterMenuCategory[]): BrewChapterUnit[] {
  const coverUnit: BrewChapterUnit = { type: "cover", id: "cover" };
  return [
    ...(coverPageEnabled ? [coverUnit] : []),
    ...menuCategories.map((category) => ({
      type: "category" as const,
      id: `category:${category.id}`,
      categoryId: category.id,
      label: category.name,
    })),
  ];
}

function BrewChapterPagination({
  units,
  activeIndex,
  onSelect,
}: {
  units: BrewChapterUnit[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  if (units.length <= 1) return null;

  return (
    <nav className="brew-chapter-pagination" aria-label="메뉴북 페이지 이동" data-brew-pagination="">
      {units.map((unit, index) => (
        <button
          key={unit.id}
          type="button"
          aria-label={unit.type === "cover" ? "커버 페이지로 이동" : `${unit.label} 메뉴로 이동`}
          aria-current={index === activeIndex ? "page" : undefined}
          className="brew-chapter-pagination-dot"
          data-brew-pagination-dot=""
          data-active={index === activeIndex ? "true" : "false"}
          onClick={() => onSelect(index)}
        />
      ))}
    </nav>
  );
}

function CoverUnit({
  data,
  gestureHandlers,
}: {
  data: PublicMenuTemplateProps;
  gestureHandlers: BrewGestureHandlers;
}) {
  const site = data.menuSite;
  const title = site.restaurant_name || site.business_name || site.name;
  const description = site.brand_description || site.description;
  const notices = getCoverNotices(data);
  const pageSettings = getRecord(site.page_settings);
  const coverImageUrl = site.cover_image_url?.trim() ?? "";
  const useCoverImage = pageSettings.cover_image_visible !== false && pageSettings.coverImageVisible !== false && Boolean(coverImageUrl);

  return (
    <section className="brew-chapter-unit brew-chapter-cover-unit" data-brew-unit="cover" {...gestureHandlers}>
      <div className="brew-chapter-cover-copy" data-brew-cover-has-image={useCoverImage ? "true" : "false"}>
        <div className="brew-chapter-cover-text">
          {site.logo_url ? (
            <img src={site.logo_url} alt={title ?? ""} className="brew-chapter-cover-logo" />
          ) : title ? (
            <h1 className="brew-chapter-cover-title cafe-a-store-title break-words font-black uppercase leading-[0.96]"><ScriptAwareText text={title} /></h1>
          ) : null}
          {description ? (
            <p className="brew-chapter-cover-description cafe-a-description-text cafe-a-menu-description cafe-a-menu-description-wrap cafe-a-menu-description-size-default break-keep text-[#3f4945]"><ScriptAwareText text={description} /></p>
          ) : null}
          {notices.length > 0 ? (
            <div className="brew-chapter-cover-notices" data-brew-cover-notices="">
              {notices.map((notice) => (
                <p key={notice} className="cafe-a-description-text cafe-a-menu-description cafe-a-menu-description-wrap cafe-a-menu-description-size-default break-keep text-[#3f4945]"><ScriptAwareText text={notice} /></p>
              ))}
            </div>
          ) : null}
        </div>
        {useCoverImage ? <img src={coverImageUrl} alt="" className="brew-chapter-cover-image" draggable={false} /> : null}
      </div>
    </section>
  );
}

function MenuItemRow({
  category,
  item,
  priceOptions,
  timeSales,
  locale,
  initialNowMs,
  templateKey,
  customBadgeStyles,
}: {
  category: BrewChapterMenuCategory;
  item: PublicMenuItem;
  priceOptions: PublicMenuItemPriceOption[];
  timeSales: PublicMenuTimeSale[];
  locale: PublicMenuTemplateProps["locale"];
  initialNowMs: number;
  templateKey?: string | null;
  customBadgeStyles: unknown;
}) {
  const priceTokens = getPriceTokens(item, priceOptions);
  const sharedPriceColumnTokens = getSharedPriceColumnTokens(category, item);
  const timeSale = getTimeSaleForItem(timeSales, item.id);
  const timeSalePrice = timeSale?.match.salePriceLabel?.trim() || formatPriceNumber(timeSale?.match.salePrice) || "";
  const timeSaleNeedsTick = timeSale?.promotion.timeDisplayMode === "countdown" || timeSale?.promotion.timeDisplayMode === "message_and_countdown";
  const nowMs = useTimeSaleNow(initialNowMs, Boolean(timeSaleNeedsTick));
  const timeSaleActive = timeSale ? isMenuTimeSaleActive(timeSale.promotion, nowMs) : false;
  const timeSaleAuxiliaryLabels = timeSale ? getMenuTimeSaleAuxiliaryLabels(timeSale.promotion, nowMs, locale) : [];
  const basePrice = formatMenuPrice(item);
  const badgeStyle = item.badge_label ? getBadgeStyleForItem(item, templateKey, customBadgeStyles) : null;
  const showTimeSale = Boolean(!item.is_sold_out && timeSale && timeSaleActive && timeSalePrice);
  const imageUrl = item.image_url?.trim() ?? "";
  const priceColumnStyle = sharedPriceColumnTokens.length > 0
    ? { "--brew-chapter-price-column-count": sharedPriceColumnTokens.length } as CSSProperties
    : undefined;

  return (
    <article
      className="brew-chapter-menu-item"
      style={priceColumnStyle}
      data-brew-menu-item=""
      data-brew-sold-out={item.is_sold_out ? "true" : undefined}
      data-brew-price-columns={sharedPriceColumnTokens.length > 0 ? "true" : undefined}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${item.name} 이미지`}
          className="brew-chapter-menu-item-image"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : null}
      <div className="brew-chapter-menu-item-primary">
        <h3 className="cafe-a-menu-title cafe-a-menu-title-size-default break-words font-bold leading-snug text-[#191c1b]"><ScriptAwareText text={item.name} /></h3>
        {item.badge_label && badgeStyle ? (
          <span className="brew-chapter-menu-badge menu-badge cafe-a-menu-badge" style={getBadgeStyleCss(badgeStyle)}><ScriptAwareText text={item.badge_label} /></span>
        ) : null}
        {showTimeSale && timeSale ? (
          <span className="brew-chapter-menu-badge menu-badge cafe-a-menu-badge" style={getTimeSaleBadgeStyle(timeSale.promotion.badgeBackgroundColor)}>
            <ScriptAwareText text={timeSale.promotion.badgeText} />
          </span>
        ) : null}
        {item.is_sold_out ? <span className="brew-chapter-menu-badge brew-chapter-sold-out-chip menu-badge cafe-a-menu-badge cafe-a-sold-out-chip"><ScriptAwareText text="품절" /></span> : null}
        <MenuOrderAddButton itemId={item.id} itemName={item.name} />
      </div>
      {item.set_name ? <p className="brew-chapter-menu-meta cafe-a-menu-meta cafe-a-menu-meta-size-default break-words text-[#333333]"><ScriptAwareText text={item.set_name} /></p> : null}
      {item.description ? <p className="brew-chapter-menu-description cafe-a-description-text cafe-a-menu-description cafe-a-menu-description-wrap cafe-a-menu-description-size-default break-keep text-[#3f4945]"><ScriptAwareText text={item.description} /></p> : null}
      {sharedPriceColumnTokens.length > 0 ? (
        <div className="brew-chapter-shared-price-values cafe-a-menu-price cafe-a-menu-price-size-default text-[#191c1b]" style={priceColumnStyle}>
          {sharedPriceColumnTokens.map((token) => (
            <span key={`${item.id}-${token.columnId}`}><ScriptAwareText text={token.price || "—"} /></span>
          ))}
        </div>
      ) : showTimeSale && timeSale && basePrice ? (
        <div className="brew-chapter-price-block" data-brew-time-sale-price="">
          <div className="brew-chapter-price-row cafe-a-menu-price cafe-a-menu-price-size-default text-[#191c1b]">
            <span className="brew-chapter-original-price cafe-a-time-sale-regular-price"><ScriptAwareText text={basePrice} /></span>
            <strong className="cafe-a-time-sale-price"><ScriptAwareText text={timeSalePrice} /></strong>
          </div>
          {timeSaleAuxiliaryLabels.length > 0 ? (
            <p
              className="brew-chapter-time-sale-copy cafe-a-time-sale-time-text"
              style={{ color: normalizeTimeSaleBadgeBackgroundColor(timeSale.promotion.badgeBackgroundColor) }}
            >
              <ScriptAwareText text={timeSaleAuxiliaryLabels.join(" · ")} />
            </p>
          ) : null}
        </div>
      ) : priceTokens.length > 0 ? (
        <div className="brew-chapter-price-row cafe-a-menu-price cafe-a-menu-price-size-default text-[#191c1b]">
          {priceTokens.map((token) => (
            <span key={`${item.id}-${token.label}-${token.price}`}>
              {token.label ? <span className="cafe-a-price-label"><ScriptAwareText text={token.label} /> </span> : null}
              <ScriptAwareText text={token.price} />
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SharedPriceColumnHeader({ category }: { category: BrewChapterMenuCategory }) {
  const columns = getVisiblePriceColumns(category);
  const hasValues = category.items.some((item) => getSharedPriceColumnTokens(category, item).length > 0);
  if (columns.length === 0 || !hasValues) return null;

  return (
    <div
      className="brew-chapter-shared-price-header brew-chapter-option-header"
      style={{ "--brew-chapter-price-column-count": columns.length } as CSSProperties}
      data-brew-shared-price-header=""
    >
      <span aria-hidden="true" />
      {columns.map((column) => (
        <span key={column.id}><ScriptAwareText text={column.label} /></span>
      ))}
    </div>
  );
}

type BrewGestureHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
};

function MenuUnit({
  categories,
  activeCategoryId,
  onCategorySelect,
  timeSales,
  priceOptions,
  locale,
  initialNowMs,
  templateKey,
  customBadgeStyles,
  tabsRef,
  panelRef,
  gestureHandlers,
}: {
  categories: BrewChapterMenuCategory[];
  activeCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
  timeSales: PublicMenuTimeSale[];
  priceOptions: PublicMenuItemPriceOption[];
  locale: PublicMenuTemplateProps["locale"];
  initialNowMs: number;
  templateKey?: string | null;
  customBadgeStyles: unknown;
  tabsRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  gestureHandlers: BrewGestureHandlers;
}) {
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0] ?? null;
  const activeCategoryHasSharedPriceColumns = activeCategory
    ? activeCategory.items.some((item) => getSharedPriceColumnTokens(activeCategory, item).length > 0)
    : false;

  return (
    <section className="brew-chapter-unit brew-chapter-menu-unit" data-brew-unit="menu">
      <nav className="brew-chapter-category-tabs" aria-label="메뉴 카테고리" data-brew-menu-nav="" ref={tabsRef}>
        <div className="brew-chapter-category-tabs-inner">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="brew-chapter-category-button brew-chapter-navigation-label uppercase"
              data-brew-category-button=""
              data-active={category.id === activeCategory?.id ? "true" : "false"}
              aria-current={category.id === activeCategory?.id ? "true" : undefined}
              onClick={() => onCategorySelect(category.id)}
            >
              <ScriptAwareText text={category.name} />
            </button>
          ))}
        </div>
      </nav>
      <div className="brew-chapter-selected-menu-panel" data-brew-menu-panel="" ref={panelRef} {...gestureHandlers}>
        {activeCategory ? (
          <div className="brew-chapter-selected-menu-content">
            <header className="brew-chapter-selected-category-heading">
              <h2 className="brew-chapter-page-heading cafe-a-category-title break-words font-black uppercase"><ScriptAwareText text={activeCategory.name} /></h2>
              {activeCategory.description_visible !== false && activeCategory.description ? (
                <p className="cafe-a-description-text cafe-a-menu-description cafe-a-menu-description-wrap cafe-a-menu-description-size-default break-keep text-[#3f4945]"><ScriptAwareText text={activeCategory.description} /></p>
              ) : null}
            </header>
            <SharedPriceColumnHeader category={activeCategory} />
            <div className="brew-chapter-menu-list" data-brew-shared-price-category={activeCategoryHasSharedPriceColumns ? "true" : "false"}>
              {activeCategory.items.map((item) => (
                <MenuItemRow
                  key={item.id}
                  category={activeCategory}
                  item={item}
                  priceOptions={priceOptions}
                  timeSales={timeSales}
                  locale={locale}
                  initialNowMs={initialNowMs}
                  templateKey={templateKey}
                  customBadgeStyles={customBadgeStyles}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function CafeBrewChapterA(data: PublicMenuTemplateProps) {
  const categories = useMemo(() => getMenuCategories(data), [data]);
  const coverPageEnabled = data.pageSettings.menu_cover_enabled !== false;
  const units = useMemo(() => buildUnits(coverPageEnabled, categories), [categories, coverPageEnabled]);
  const customBadgeStyles = useMemo(() => getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings), [data.menuSite.settings, data.menuSite.page_settings]);
  const typographySettings = useMemo(() => {
    const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
    return mergeTypographySettings(data.menuSite.template_key, customTypography);
  }, [data.menuSite.page_settings, data.menuSite.settings, data.menuSite.template_key]);
  const typographyStyle = useMemo(
    () => getTypographyCssVariables(typographySettings, data.menuSite.template_key),
    [data.menuSite.template_key, typographySettings],
  );
  const typographyFontAssets = useMemo(() => [
    getKoreanFontLoadAssets(typographySettings.korean_font_key),
    getEnglishFontLoadAssets(typographySettings.english_font_key),
    ...getTypographyRoleFontLoadAssets(typographySettings.typography_roles),
  ], [typographySettings]);
  const [activeUnitIndex, setActiveUnitIndex] = useState(0);
  const safeUnitIndex = Math.min(activeUnitIndex, Math.max(0, units.length - 1));
  const activeUnit = units[safeUnitIndex] ?? units[0];
  const activeCategoryId = activeUnit?.type === "category" ? activeUnit.categoryId : null;
  const activePageKeyRef = useRef(activeUnit?.id ?? null);
  const tabsRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    width: number;
    startedOnInteractive: boolean;
    horizontalIntent: boolean | null;
  } | null>(null);

  useEffect(() => {
    activePageKeyRef.current = activeUnit?.id ?? null;
  }, [activeUnit?.id]);

  useEffect(() => {
    const previousKey = activePageKeyRef.current;
    if (!previousKey) {
      setActiveUnitIndex(0);
      return;
    }
    const nextIndex = units.findIndex((unit) => unit.id === previousKey);
    if (nextIndex >= 0) {
      setActiveUnitIndex(nextIndex);
      return;
    }
    setActiveUnitIndex((index) => Math.min(index, Math.max(0, units.length - 1)));
  }, [units]);

  useEffect(() => {
    if (activeUnit?.type !== "category") return;
    panelRef.current?.scrollTo({ top: 0 });
    const activeButton = tabsRef.current?.querySelector<HTMLButtonElement>(`[data-brew-category-button][data-active="true"]`);
    activeButton?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeUnit?.id, activeUnit?.type]);

  const setPageIndex = useCallback((nextIndex: number) => {
    setActiveUnitIndex((currentIndex) => {
      const clampedIndex = Math.max(0, Math.min(nextIndex, Math.max(0, units.length - 1)));
      return clampedIndex === currentIndex ? currentIndex : clampedIndex;
    });
  }, [units.length]);

  const movePage = useCallback((delta: number) => {
    setActiveUnitIndex((currentIndex) => {
      const nextIndex = Math.max(0, Math.min(currentIndex + delta, Math.max(0, units.length - 1)));
      return nextIndex === currentIndex ? currentIndex : nextIndex;
    });
  }, [units.length]);

  const selectCategory = useCallback((categoryId: string) => {
    const nextIndex = units.findIndex((unit) => unit.type === "category" && unit.categoryId === categoryId);
    if (nextIndex >= 0) setPageIndex(nextIndex);
  }, [setPageIndex, units]);

  const isInteractiveGestureTarget = useCallback((target: EventTarget | null) => {
    return target instanceof Element && Boolean(target.closest("button, a, input, textarea, select, [role='button'], [data-brew-menu-nav]"));
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      width: event.currentTarget.getBoundingClientRect().width || window.innerWidth,
      startedOnInteractive: isInteractiveGestureTarget(event.target),
      horizontalIntent: null,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [isInteractiveGestureTarget]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId || state.startedOnInteractive) return;

    state.lastX = event.clientX;
    state.lastY = event.clientY;
    const deltaX = state.lastX - state.startX;
    const deltaY = state.lastY - state.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (state.horizontalIntent === null && Math.max(absX, absY) >= 8) {
      state.horizontalIntent = absX >= 12 && absX > absY * 1.25;
    }

    if (state.horizontalIntent) {
      event.preventDefault();
    }
  }, []);

  const finishPointerGesture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const deltaX = state.lastX - state.startX;
    const deltaY = state.lastY - state.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const hasHorizontalIntent = state.horizontalIntent === true || (absX >= 12 && absX > absY * 1.25);
    if (state.startedOnInteractive || !hasHorizontalIntent) return;

    const width = state.width || event.currentTarget.getBoundingClientRect().width || window.innerWidth;
    const threshold = Math.max(48, Math.min(64, width * 0.14));
    if (Math.abs(deltaX) < threshold) return;

    movePage(deltaX < 0 ? 1 : -1);
  }, [movePage]);

  useEffect(() => {
    function handleNativePointerMove(event: PointerEvent) {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId || state.startedOnInteractive) return;

      state.lastX = event.clientX;
      state.lastY = event.clientY;
      const deltaX = state.lastX - state.startX;
      const deltaY = state.lastY - state.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (state.horizontalIntent === null && Math.max(absX, absY) >= 8) {
        state.horizontalIntent = absX >= 12 && absX > absY * 1.25;
      }

      if (state.horizontalIntent) {
        event.preventDefault();
      }
    }

    function handleNativePointerEnd(event: PointerEvent) {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) return;

      state.lastX = event.clientX;
      state.lastY = event.clientY;
      dragStateRef.current = null;

      const deltaX = state.lastX - state.startX;
      const deltaY = state.lastY - state.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const hasHorizontalIntent = state.horizontalIntent === true || (absX >= 12 && absX > absY * 1.25);
      if (state.startedOnInteractive || !hasHorizontalIntent) return;

      const threshold = Math.max(48, Math.min(64, state.width * 0.14));
      if (Math.abs(deltaX) < threshold) return;

      movePage(deltaX < 0 ? 1 : -1);
    }

    window.addEventListener("pointermove", handleNativePointerMove, { passive: false });
    window.addEventListener("pointerup", handleNativePointerEnd);
    window.addEventListener("pointercancel", handleNativePointerEnd);
    return () => {
      window.removeEventListener("pointermove", handleNativePointerMove);
      window.removeEventListener("pointerup", handleNativePointerEnd);
      window.removeEventListener("pointercancel", handleNativePointerEnd);
    };
  }, [movePage]);

  const gestureHandlers = useMemo<BrewGestureHandlers>(() => ({
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: finishPointerGesture,
    onPointerCancel: finishPointerGesture,
  }), [finishPointerGesture, handlePointerDown, handlePointerMove]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePage(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        movePage(1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePage]);

  if (units.length === 0) {
    return (
      <>
        <KoreanFontAssets assets={typographyFontAssets} />
        <main className="menu-typography cafe-a-typography brew-chapter-template" style={typographyStyle} data-brew-chapter-template="">
          <div className="fixed right-4 top-4 z-50" data-template-language-control="">
            <MenuLanguageSwitcher currentLocale={data.locale} enabledLocales={data.enabledLocales} compact />
          </div>
          <section className="brew-chapter-unit brew-chapter-menu-unit" data-brew-unit="empty">
            <div className="brew-chapter-empty-state cafe-a-description-text cafe-a-menu-description">표시할 메뉴가 없습니다.</div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <KoreanFontAssets assets={typographyFontAssets} />
      <main className="menu-typography cafe-a-typography brew-chapter-template" style={typographyStyle} data-brew-chapter-template="">
        <div className="fixed right-4 top-4 z-50" data-template-language-control="">
          <MenuLanguageSwitcher currentLocale={data.locale} enabledLocales={data.enabledLocales} compact />
        </div>
        {activeUnit?.type === "cover" ? <CoverUnit data={data} gestureHandlers={gestureHandlers} /> : null}
        {activeUnit?.type === "category" ? (
          <MenuUnit
            categories={categories}
            activeCategoryId={activeCategoryId}
            onCategorySelect={selectCategory}
            timeSales={data.timeSales}
            priceOptions={data.priceOptions}
            locale={data.locale}
            initialNowMs={data.initialNowMs}
            templateKey={data.menuSite.template_key}
            customBadgeStyles={customBadgeStyles}
            tabsRef={tabsRef}
            panelRef={panelRef}
            gestureHandlers={gestureHandlers}
          />
        ) : null}
        <BrewChapterPagination units={units} activeIndex={safeUnitIndex} onSelect={setPageIndex} />
      </main>
    </>
  );
}
