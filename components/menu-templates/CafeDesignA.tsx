/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { getMenuItemBadgeLabel } from "@/lib/menu-badges";
import { getMenuPublicCapabilities } from "@/lib/menu-public-capabilities";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
import { getBadgeStyleCss, getBadgeStyleForItem, getCustomBadgeStyles } from "@/lib/template-badge-styles";
import { getResolvedBackgroundColor } from "@/lib/template-background-colors";
import { getTemplateCapabilities, type TemplateCapabilities } from "@/lib/template-capabilities";
import {
  getMenuLayoutDensity,
  getTemplateLayoutRules,
  type MenuLayoutDensity,
} from "@/lib/template-layout-rules";
import { getCustomTypographySettings, getEnglishFontLoadAssets, getKoreanFontLoadAssets, getTypographyCssVariables, mergeTypographySettings } from "@/lib/template-typography-presets";
import { formatMenuPrice, shouldShowMenuItemTraits } from "@/types/menu";

type MenuItem = PublicMenuTemplateProps["items"][number];
type MenuCategory = PublicMenuTemplateProps["categories"][number];
type MenuPage = PublicMenuTemplateProps["pages"][number];
type PriceOption = PublicMenuTemplateProps["priceOptions"][number];
type MenuGroup = {
  page: MenuPage;
  category: MenuCategory;
  items: MenuItem[];
};
type MenuPageGroup = {
  page: MenuPage;
  groups: MenuGroup[];
};
type CafeDesignAFitState = {
  columns: number;
  fontScale: number;
  gapScale: number;
  status: "idle" | "fit" | "warning";
};

const FIT_COLUMN_CANDIDATES = [2, 3, 4, 5, 6] as const;
const FIT_FONT_SCALE_CANDIDATES = [1.28, 1.24, 1.2, 1.16, 1.12, 1.08, 1.04, 1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.72, 0.68, 0.64] as const;
const FIT_WARNING_FONT_SCALE = 0.75;
const DEFAULT_FIT_STATE: CafeDesignAFitState = {
  columns: 4,
  fontScale: 1,
  gapScale: 1,
  status: "idle",
};

function getMaxFitColumns(width: number) {
  if (width < 720) return 2;
  if (width < 1120) return 3;
  if (width < 1500) return 4;
  if (width < 1800) return 5;
  return 6;
}

function getFitColumnCandidates(width: number) {
  const maxColumns = getMaxFitColumns(width);
  const minColumns = width < 720 ? 2 : 3;
  return FIT_COLUMN_CANDIDATES.filter((columns) => columns >= minColumns && columns <= maxColumns).sort((a, b) => b - a);
}

function getFitGapScale(fontScale: number) {
  return Math.max(0.68, Math.min(1.16, fontScale + 0.04));
}

function getFitStyle(fitState: CafeDesignAFitState): CSSProperties {
  return {
    "--fit-columns": String(fitState.columns),
    "--fit-font-scale": String(fitState.fontScale),
    "--fit-gap-scale": String(fitState.gapScale),
  } as CSSProperties;
}

function getFitGapStyle(density: MenuLayoutDensity): CSSProperties {
  const gapByDensity = {
    spacious: { x: "clamp(48px, 3.4vw, 68px)", y: "2.5rem", stack: "1.5rem", line: "1.5", inline: "0.5rem" },
    default: { x: "clamp(40px, 3.2vw, 58px)", y: "2rem", stack: "1.25rem", line: "1.45", inline: "0.375rem" },
    compact: { x: "clamp(34px, 2.7vw, 50px)", y: "1.65rem", stack: "1rem", line: "1.4", inline: "0.3125rem" },
    ultraCompact: { x: "clamp(30px, 2.4vw, 44px)", y: "1.35rem", stack: "0.75rem", line: "1.35", inline: "0.25rem" },
  } satisfies Record<MenuLayoutDensity, { x: string; y: string; stack: string; line: string; inline: string }>;
  const gap = gapByDensity[density];

  return {
    "--menu-board-column-gap": gap.x,
    "--fit-gap-y": gap.y,
    "--fit-stack-gap": gap.stack,
    "--menu-line-gap": gap.line,
    "--menu-inline-gap": gap.inline,
  } as CSSProperties;
}

function getDisplayName(site: PublicMenuTemplateProps["menuSite"]) {
  return site.restaurant_name || site.name || "MenuLink";
}

function getCategoryItems(items: PublicMenuTemplateProps["items"], categoryId: string) {
  return items
    .filter((item) => item.category_id === categoryId && item.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
}

function getItemTraits(traits: PublicMenuTemplateProps["traits"], itemId: string) {
  return traits
    .filter((trait) => trait.menu_item_id === itemId && trait.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MENU_LIMITS.maxTraitsPerItem);
}

function getItemPriceOptions(priceOptions: PublicMenuTemplateProps["priceOptions"], itemId: string) {
  return priceOptions
    .filter((option) => option.menu_item_id === itemId && option.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MENU_LIMITS.maxPriceOptionsPerItem);
}

function formatPriceOption(option: PriceOption) {
  const priceLabel = option.price_label?.trim();
  if (priceLabel) return priceLabel;

  const rawPrice = option.price as unknown;
  if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) {
    return new Intl.NumberFormat("ko-KR").format(rawPrice) + "원";
  }
  if (typeof rawPrice === "string" && rawPrice.trim()) {
    const numericPrice = Number(rawPrice.replace(/,/g, ""));
    return Number.isFinite(numericPrice) ? new Intl.NumberFormat("ko-KR").format(numericPrice) + "원" : rawPrice.trim();
  }

  return "";
}

function getItemPriceDisplay(item: MenuItem, priceOptions: PublicMenuTemplateProps["priceOptions"], capabilities: TemplateCapabilities) {
  if (item.price_visible === false) return null;

  const visibleOptions = capabilities.priceOptions ? getItemPriceOptions(priceOptions, item.id) : [];
  if (visibleOptions.length > 0) {
    return visibleOptions
      .map((option) => {
        const optionPrice = formatPriceOption(option);
        return optionPrice ? `${option.label} ${optionPrice}` : option.label;
      })
      .filter(Boolean)
      .slice(0, 2)
      .join(" / ");
  }

  if (item.price_label?.trim()) return item.price_label.trim();

  return formatMenuPrice(item);
}

function getItemPriceRows(item: MenuItem, priceOptions: PublicMenuTemplateProps["priceOptions"], capabilities: TemplateCapabilities) {
  if (item.price_visible === false) return [];

  const visibleOptions = capabilities.priceOptions ? getItemPriceOptions(priceOptions, item.id) : [];
  if (visibleOptions.length > 0) {
    return visibleOptions
      .map((option) => ({
        label: option.label,
        price: formatPriceOption(option),
      }))
      .filter((row) => row.label || row.price)
      .slice(0, 3);
  }

  const price = item.price_label?.trim() || formatMenuPrice(item);
  if (!price) return [];

  return [
    {
      label: item.portion_visible === false ? "" : item.portion_label?.trim() ?? "",
      price,
    },
  ];
}

function getFeaturedItem(data: PublicMenuTemplateProps, capabilities: TemplateCapabilities) {
  if (!data.pageSettings.featured_item_enabled || !data.pageSettings.featured_item_id) return null;
  if (!capabilities.featuredItemHero) return null;

  const featuredItem = data.items.find((item) => item.id === data.pageSettings.featured_item_id);
  if (!featuredItem || featuredItem.visible === false) return null;

  return featuredItem;
}

function getVisibleMenuPageGroups(data: PublicMenuTemplateProps): MenuPageGroup[] {
  const visiblePages = data.pages
    .filter((page) => page.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  return visiblePages
    .map((page) => {
    const pageCategories = data.categories
      .filter((category) => category.visible !== false && category.menu_page_id === page.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));

      const groups = pageCategories
        .map((category) => ({
        page,
        category,
        items: getCategoryItems(data.items, category.id),
      }))
      .filter((group) => group.items.length > 0);

      return { page, groups };
    })
    .filter((pageGroup) => pageGroup.groups.length > 0);
}

function isDefaultPageTitle(page: MenuPage) {
  const title = page.title.trim();
  return /^메뉴 페이지\s*\d+$/i.test(title) || /^page\s*\d+$/i.test(title);
}

function getCategoryTitleSpacing(density: MenuLayoutDensity) {
  return {
    spacious: "mb-4",
    default: "mb-3",
    compact: "mb-3",
    ultraCompact: "mb-2",
  }[density];
}

function getItemStackSpacing(density: MenuLayoutDensity) {
  return {
    spacious: "mb-6",
    default: "mb-5",
    compact: "mb-4",
    ultraCompact: "mb-3",
  }[density];
}

function getMenuAreaClassName(hasCoverSection: boolean) {
  return hasCoverSection ? "lg:col-span-1" : "lg:col-span-1";
}

function getOuterGridGapClassName(density: MenuLayoutDensity) {
  return {
    spacious: "gap-y-12 md:gap-x-8 lg:gap-x-[clamp(28px,3vw,56px)] lg:gap-y-[clamp(32px,3vh,48px)]",
    default: "gap-y-10 md:gap-x-8 lg:gap-x-[clamp(24px,2.6vw,48px)] lg:gap-y-[clamp(24px,2.6vh,40px)]",
    compact: "gap-y-9 md:gap-x-7 lg:gap-x-[clamp(22px,2.3vw,40px)] lg:gap-y-[clamp(22px,2.3vh,34px)]",
    ultraCompact: "gap-y-8 md:gap-x-6 lg:gap-x-[clamp(20px,2vw,34px)] lg:gap-y-[clamp(20px,2vh,30px)]",
  }[density];
}

function getDesktopGridClassName(hasCoverSection: boolean) {
  return hasCoverSection
    ? "lg:grid-cols-[minmax(170px,0.42fr)_minmax(0,2.8fr)] xl:grid-cols-[minmax(220px,0.55fr)_minmax(0,2.8fr)] 2xl:grid-cols-[minmax(260px,0.55fr)_minmax(0,4fr)]"
    : "lg:grid-cols-1";
}

function CategoryTitle({ category, density }: { category: MenuCategory; density: MenuLayoutDensity }) {
  const spacingClassName = getCategoryTitleSpacing(density);
  const titleClassName = {
    spacious: "cafe-a-category-title-size-spacious",
    default: "cafe-a-category-title-size-default",
    compact: "cafe-a-category-title-size-compact",
    ultraCompact: "cafe-a-category-title-size-ultra-compact",
  }[density];
  const descriptionClassName = {
    spacious: "cafe-a-menu-description-size-spacious",
    default: "cafe-a-menu-description-size-default",
    compact: "cafe-a-menu-description-size-compact",
    ultraCompact: "cafe-a-menu-description-size-ultra-compact",
  }[density];

  return (
    <div className={`cafe-a-category-heading ${spacingClassName}`}>
      <h2 className={`cafe-a-category-title break-words font-black uppercase leading-tight text-[#191c1b] ${titleClassName}`}>{category.name}</h2>
      <div className="cafe-a-category-rule mt-2 border-b border-[#191c1b]" />
      {category.description_visible && category.description && (
        <p className={`cafe-a-menu-description mt-2 break-keep font-semibold leading-relaxed text-[#3f4945] ${descriptionClassName}`}>{category.description}</p>
      )}
    </div>
  );
}

function Badge({
  item,
  capabilities,
  templateKey,
  customBadgeStyles,
}: {
  item: MenuItem;
  capabilities: TemplateCapabilities;
  templateKey: string | null;
  customBadgeStyles: unknown;
}) {
  if (!capabilities.itemBadges) return null;

  const label = getMenuItemBadgeLabel(item);
  if (!label) return null;

  const badgeStyle = getBadgeStyleForItem(item, templateKey, customBadgeStyles);

  return (
    <span className="menu-badge cafe-a-menu-badge inline-flex rounded-none px-1.5 py-1 font-black uppercase leading-none" style={getBadgeStyleCss(badgeStyle)}>
      {label}
    </span>
  );
}

function SoldOutBadge() {
  return <span className="menu-badge cafe-a-menu-badge inline-flex rounded-none bg-[#e1e3e0] px-1.5 py-1 font-black uppercase leading-none text-[#3f4945]">품절</span>;
}

function MenuItemRow({
  item,
  priceOptions,
  traits,
  capabilities,
  density,
  templateKey,
  customBadgeStyles,
}: {
  item: MenuItem;
  priceOptions: PublicMenuTemplateProps["priceOptions"];
  traits: PublicMenuTemplateProps["traits"];
  capabilities: TemplateCapabilities;
  density: MenuLayoutDensity;
  templateKey: string | null;
  customBadgeStyles: unknown;
}) {
  const priceRows = getItemPriceRows(item, priceOptions, capabilities);
  const visibleTraits = capabilities.itemTraits && shouldShowMenuItemTraits(item, traits) ? traits.filter((trait) => trait.visible) : [];
  const titleClassName = {
    spacious: "cafe-a-menu-title-size-spacious",
    default: "cafe-a-menu-title-size-default",
    compact: "cafe-a-menu-title-size-compact",
    ultraCompact: "cafe-a-menu-title-size-ultra-compact",
  }[density];
  const descriptionClassName = {
    spacious: "line-clamp-3",
    default: "line-clamp-2",
    compact: "line-clamp-2",
    ultraCompact: "line-clamp-1",
  }[density];
  const priceClassName = {
    spacious: "cafe-a-menu-price-size-spacious",
    default: "cafe-a-menu-price-size-default",
    compact: "cafe-a-menu-price-size-compact",
    ultraCompact: "cafe-a-menu-price-size-ultra-compact",
  }[density];
  const itemGridClassName = {
    spacious: "grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(3.75rem,auto)] sm:gap-4 lg:grid-cols-[minmax(0,1fr)_auto]",
    default: "grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(3.25rem,auto)] sm:gap-3 lg:grid-cols-[minmax(0,1fr)_auto]",
    compact: "grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(3rem,auto)] sm:gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto]",
    ultraCompact: "grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(2.75rem,auto)] sm:gap-2 lg:grid-cols-[minmax(0,1fr)_auto]",
  }[density];
  const metaClassName = {
    spacious: "cafe-a-menu-meta-size-spacious",
    default: "cafe-a-menu-meta-size-default",
    compact: "cafe-a-menu-meta-size-compact",
    ultraCompact: "cafe-a-menu-meta-size-ultra-compact",
  }[density];
  const descriptionTextClassName = {
    spacious: "cafe-a-menu-description-size-spacious leading-[1.5]",
    default: "cafe-a-menu-description-size-default leading-[1.45]",
    compact: "cafe-a-menu-description-size-compact leading-[1.4]",
    ultraCompact: "cafe-a-menu-description-size-ultra-compact leading-[1.35]",
  }[density];

  return (
    <article className={`cafe-a-menu-item grid items-start ${itemGridClassName}`}>
      <div className="min-w-0">
        <div className="cafe-a-menu-title-row mb-0.5 flex flex-wrap items-center gap-1.5">
          <h3 className={`cafe-a-menu-title break-words font-bold leading-snug text-[#191c1b] ${titleClassName}`}>{item.name}</h3>
          <Badge item={item} capabilities={capabilities} templateKey={templateKey} customBadgeStyles={customBadgeStyles} />
          {item.is_sold_out && <SoldOutBadge />}
        </div>
        {/* TODO(i18n): Avoid duplicate helper names when the current locale matches set_name language. */}
        {item.set_name && <p className={`menu-font-en cafe-a-menu-meta mb-0.5 break-words font-medium uppercase leading-snug text-[#5e5e5e] ${metaClassName}`}>{item.set_name}</p>}
        {item.description && (
          <p className={`cafe-a-menu-description break-keep font-normal text-[#3f4945] ${descriptionTextClassName} ${descriptionClassName}`}>{item.description}</p>
        )}
        {visibleTraits.length > 0 && (
          <div className="cafe-a-trait-list mt-2 flex flex-wrap gap-1.5">
            {visibleTraits.map((trait) => (
              <span key={trait.id} className="menu-chip cafe-a-menu-chip border border-[#bfc9c4] px-1.5 py-1 font-black text-[#3f4945]">
                {trait.label} {trait.value}/{trait.max_value}
              </span>
            ))}
          </div>
        )}
        {capabilities.originInfo && item.origin_info && <p className="cafe-a-menu-description cafe-a-menu-description-size-default mt-2 line-clamp-2 break-words font-semibold leading-relaxed text-[#707975]">원산지 {item.origin_info}</p>}
      </div>
      {priceRows.length > 0 && (
        <div className="menu-price cafe-a-price-stack flex flex-col items-start gap-1 text-left text-[#191c1b] sm:items-end sm:text-right lg:justify-self-end lg:text-right">
          {priceRows.map((row, index) => (
            <div key={`${row.label}-${row.price}-${index}`} className="cafe-a-price-row grid grid-cols-[auto_auto] items-baseline gap-x-2">
              {row.label && <span className="cafe-a-price-label whitespace-nowrap font-bold uppercase leading-none text-[#191c1b]">{row.label}</span>}
              <span className={`cafe-a-menu-price whitespace-nowrap font-bold leading-none ${priceClassName}`}>{row.price}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function CoverHero({
  data,
  featuredItem,
  capabilities,
  customBadgeStyles,
  density,
  desktopClassName = "",
}: {
  data: PublicMenuTemplateProps;
  featuredItem: MenuItem | null;
  capabilities: TemplateCapabilities;
  customBadgeStyles: unknown;
  density: MenuLayoutDensity;
  desktopClassName?: string;
}) {
  const price = featuredItem ? getItemPriceDisplay(featuredItem, data.priceOptions, capabilities) : null;
  const coverImageUrl = data.menuSite.cover_image_url;
  const heroMinHeightClassName = {
    spacious: "min-h-[400px]",
    default: "min-h-[380px]",
    compact: "min-h-[340px]",
    ultraCompact: "min-h-[320px]",
  }[density];

  return (
    <section className={`cafe-a-cover-hero flex min-w-0 ${heroMinHeightClassName} flex-col bg-[#eceeec] md:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-0 ${desktopClassName}`}>
      <div className={`cafe-a-cover-frame relative h-full ${heroMinHeightClassName} flex-1 overflow-hidden lg:min-h-0`}>
        {coverImageUrl ? (
          <img src={coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef1ef_0%,#dfe6e2_42%,#f7f8f6_100%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {featuredItem && (
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="menu-badge cafe-a-menu-badge inline-flex rounded-none bg-[#00342b] px-1.5 py-1 font-black uppercase leading-none text-white">대표 추천</span>
                <Badge
                  item={featuredItem}
                  capabilities={capabilities}
                  templateKey={data.menuSite.template_key}
                  customBadgeStyles={customBadgeStyles}
                />
              </div>
              <h2 className="break-words text-2xl font-bold leading-tight">{featuredItem.name}</h2>
              {featuredItem.description && <p className="mt-2 line-clamp-2 break-keep text-xs font-semibold leading-relaxed text-white/82">{featuredItem.description}</p>}
            </div>
            {price && <p className="menu-price shrink-0 whitespace-nowrap text-xl font-black leading-none">{price}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function HeaderBlock({ data, className = "" }: { data: PublicMenuTemplateProps; className?: string }) {
  const displayName = getDisplayName(data.menuSite);
  const title = displayName || "MenuLink";
  const description = data.menuSite.brand_description || data.menuSite.description;

  return (
    <header className={`w-full shrink-0 border-b border-[#191c1b] px-[clamp(24px,4vw,96px)] py-8 lg:px-[var(--board-padding)] lg:py-[var(--board-padding)] ${className}`}>
      <div className="flex min-w-0 items-start justify-between gap-[clamp(16px,2vw,32px)]">
        <div className="min-w-0 max-w-5xl">
          <h1 className="break-words text-5xl font-black uppercase leading-[1.02] text-[#191c1b] lg:text-[clamp(42px,5.2vh,52px)]">{title}</h1>
          {description && <p className="mt-2 break-keep text-[11px] font-normal leading-[1.5] text-[#3f4945]">{description}</p>}
        </div>
        <div className="menu-font-en group relative shrink-0 cursor-default text-right text-[#191c1b]">
          <MenuLanguageSwitcher currentLocale={data.locale} enabledLocales={data.enabledLocales} />
        </div>
      </div>
    </header>
  );
}

function DesktopFixedRail({
  data,
  children,
}: {
  data: PublicMenuTemplateProps;
  children: ReactNode;
}) {
  const displayName = getDisplayName(data.menuSite);
  const title = displayName || "MenuLink";
  const description = data.menuSite.brand_description || data.menuSite.description;

  return (
    <aside className="cafe-a-fixed-rail hidden min-w-0 lg:flex lg:flex-col">
      <div className="cafe-a-fixed-rail-copy min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h1 className="cafe-a-rail-title break-words font-black uppercase leading-[0.96] text-[#191c1b]">{title}</h1>
          <div className="menu-font-en shrink-0 text-right text-[#191c1b]">
            <MenuLanguageSwitcher currentLocale={data.locale} enabledLocales={data.enabledLocales} />
          </div>
        </div>
        {description && <p className="cafe-a-rail-description mt-3 break-keep font-normal leading-[1.55] text-[#3f4945]">{description}</p>}
      </div>
      {children}
    </aside>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-[#bfc9c4] bg-white p-8 text-sm font-bold leading-relaxed text-[#707975]">
      {children}
    </div>
  );
}

function MenuGroupsGrid({
  pageGroups,
  density,
  data,
  capabilities,
  customBadgeStyles,
  itemStackSpacing,
  outerGridGapClassName,
  menuAreaClassName,
  showPageTitles,
  fitRef,
}: {
  pageGroups: MenuPageGroup[];
  density: MenuLayoutDensity;
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  customBadgeStyles: unknown;
  itemStackSpacing: string;
  outerGridGapClassName: string;
  menuAreaClassName: string;
  showPageTitles: boolean;
  fitRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <section ref={fitRef} className={`cafe-a-fit-menu-grid grid min-w-0 grid-flow-dense grid-cols-1 content-start md:col-span-2 md:grid-cols-2 lg:min-h-0 lg:max-h-full lg:overflow-hidden lg:pr-0 ${outerGridGapClassName} ${menuAreaClassName}`}>
      {pageGroups.map((pageGroup) => (
        <div key={pageGroup.page.id} className="contents">
          {showPageTitles && !isDefaultPageTitle(pageGroup.page) && (
            <section className="md:col-span-2 lg:col-span-full">
              <h2 className="border-b border-[#191c1b] pb-2 text-sm font-black uppercase tracking-[0.18em] text-[#3f4945]">
                {pageGroup.page.title}
              </h2>
            </section>
          )}
          {pageGroup.groups.map(({ page, category, items }) => (
            <section key={`${page.id}-${category.id}`} className="cafe-a-menu-category-block min-w-0">
              <CategoryTitle category={category} density={density} />
              <div className="cafe-a-category-items">
                {items.map((item) => (
                  <div key={item.id} className={`cafe-a-menu-item-stack break-inside-avoid ${itemStackSpacing}`}>
                    <MenuItemRow
                      item={item}
                      priceOptions={data.priceOptions}
                      traits={getItemTraits(data.traits, item.id)}
                      capabilities={capabilities}
                      density={density}
                      templateKey={data.menuSite.template_key}
                      customBadgeStyles={customBadgeStyles}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}
    </section>
  );
}

export default function CafeDesignA(data: PublicMenuTemplateProps) {
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const publicCapabilities = getMenuPublicCapabilities(data.publicServiceType);
  const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(data.menuSite.template_key, customTypography);
  const koreanFontAssets = getKoreanFontLoadAssets(typographySettings.korean_font_key);
  const englishFontAssets = getEnglishFontLoadAssets(typographySettings.english_font_key);
  const customBadgeStyles = getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings);
  const backgroundColor = getResolvedBackgroundColor(data.menuSite.template_key, data.menuSite.page_settings);
  const featuredItem = getFeaturedItem(data, capabilities);
  const visiblePageGroups = publicCapabilities.menuPages ? getVisibleMenuPageGroups(data) : [];
  const desktopFitBoardRef = useRef<HTMLDivElement | null>(null);
  const desktopFitMenuRef = useRef<HTMLElement | null>(null);
  const [fitState, setFitState] = useState<CafeDesignAFitState>(DEFAULT_FIT_STATE);
  const visibleItemCount = data.items.filter((item) => item.visible !== false).length;
  const layoutRules = getTemplateLayoutRules(data.menuSite.template_key, data.menuSite.template_category);
  const density = getMenuLayoutDensity(visibleItemCount, layoutRules, "desktop");
  const hasCoverSection =
    publicCapabilities.menuCoverPage &&
    capabilities.menuCover.coverMode === "section" &&
    data.pageSettings.menu_cover_enabled !== false;
  const shouldRenderMenuCoverSection =
    hasCoverSection;
  const menuAreaClassName = getMenuAreaClassName(hasCoverSection);
  const desktopGridClassName = getDesktopGridClassName(hasCoverSection);
  const outerGridGapClassName = getOuterGridGapClassName(density);
  const itemStackSpacing = getItemStackSpacing(density);
  const typographyStyle = getTypographyCssVariables(typographySettings);
  const fitStyle = useMemo(() => getFitStyle(fitState), [fitState]);
  const fitGapStyle = useMemo(() => getFitGapStyle(density), [density]);

  useEffect(() => {
    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;
    const fitBoardElement = boardElement;
    const fitMenuElement = menuElement;

    let frameId = 0;
    let cancelled = false;

    function updateFitState(nextState: CafeDesignAFitState) {
      setFitState((currentState) =>
        currentState.columns === nextState.columns &&
        currentState.fontScale === nextState.fontScale &&
        currentState.gapScale === nextState.gapScale &&
        currentState.status === nextState.status
          ? currentState
          : nextState
      );
    }

    function applyFitCandidate(columns: number, fontScale: number) {
      fitBoardElement.style.setProperty("--fit-columns", String(columns));
      fitBoardElement.style.setProperty("--fit-font-scale", String(fontScale));
      fitBoardElement.style.setProperty("--fit-gap-scale", String(getFitGapScale(fontScale)));
    }

    function getColumnFillScore(columns: number, fontScale: number) {
      const menuRect = fitMenuElement.getBoundingClientRect();
      const menuHeight = fitMenuElement.clientHeight || menuRect.height;
      if (menuHeight <= 0) return Number.POSITIVE_INFINITY;

      const flowElements = Array.from(
        fitMenuElement.querySelectorAll<HTMLElement>(".cafe-a-category-heading, .cafe-a-menu-item-stack")
      );
      const columnBottoms: { left: number; bottom: number }[] = [];

      for (const element of flowElements) {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;

        const relativeLeft = rect.left - menuRect.left;
        const relativeBottom = rect.bottom - menuRect.top;
        const existingColumn = columnBottoms.find((column) => Math.abs(column.left - relativeLeft) <= 8);

        if (existingColumn) {
          existingColumn.bottom = Math.max(existingColumn.bottom, relativeBottom);
        } else {
          columnBottoms.push({ left: relativeLeft, bottom: relativeBottom });
        }
      }

      if (columnBottoms.length === 0) return 0;

      const sortedColumns = columnBottoms
        .sort((a, b) => a.left - b.left)
        .slice(0, columns)
        .map((column) => Math.min(1, Math.max(0, column.bottom / menuHeight)));
      const nonLastColumns = sortedColumns.slice(0, Math.max(1, sortedColumns.length - 1));
      const nonLastBlank = nonLastColumns.reduce((totalBlank, fillRatio) => totalBlank + Math.max(0, 1 - fillRatio), 0);
      const averageFill = sortedColumns.reduce((totalFill, fillRatio) => totalFill + fillRatio, 0) / sortedColumns.length;
      const lowFillPenalty = nonLastColumns.filter((fillRatio) => fillRatio < 0.82).length * 18;
      const unusedColumnPenalty = Math.max(0, columns - sortedColumns.length) * 28;
      const excessiveColumnPenalty = Math.max(0, columns - 4) * 8 + columns * 1.5;
      const priceRows = Array.from(fitMenuElement.querySelectorAll<HTMLElement>(".cafe-a-price-stack"));
      const horizontalBlankRatios = priceRows
        .map((priceElement) => {
          const itemElement = priceElement.closest<HTMLElement>(".cafe-a-menu-item");
          if (!itemElement) return 0;
          const itemRect = itemElement.getBoundingClientRect();
          const priceRect = priceElement.getBoundingClientRect();
          if (itemRect.width <= 0 || priceRect.width <= 0) return 0;
          return Math.max(0, Math.min(1, (itemRect.right - priceRect.right) / itemRect.width));
        })
        .filter((ratio) => Number.isFinite(ratio));
      const averageHorizontalBlank =
        horizontalBlankRatios.length > 0
          ? horizontalBlankRatios.reduce((totalBlank, ratio) => totalBlank + ratio, 0) / horizontalBlankRatios.length
          : 0;
      const headingWrapPenalty = Array.from(fitMenuElement.querySelectorAll<HTMLElement>(".cafe-a-category-title")).reduce((penalty, heading) => {
        const headingStyle = window.getComputedStyle(heading);
        const lineHeight = Number.parseFloat(headingStyle.lineHeight);
        if (!Number.isFinite(lineHeight) || lineHeight <= 0) return penalty;
        const lineCount = heading.getBoundingClientRect().height / lineHeight;
        return penalty + Math.max(0, lineCount - 1.35) * 8;
      }, 0);
      const underusedAreaPenalty = Math.max(0, 0.84 - averageFill) * 42;
      const horizontalBlankPenalty = averageHorizontalBlank * 50;
      const smallTextPenalty = Math.max(0, 1.04 - fontScale) * 42;
      const veryLargeTextPenalty = Math.max(0, fontScale - 1.24) * 18;

      return (
        nonLastBlank * 85 +
        lowFillPenalty +
        underusedAreaPenalty +
        horizontalBlankPenalty +
        headingWrapPenalty +
        unusedColumnPenalty +
        excessiveColumnPenalty +
        smallTextPenalty +
        veryLargeTextPenalty
      );
    }

    function measureFit() {
      if (cancelled) return;
      const isDesktopFitActive = window.matchMedia("(min-width: 1024px)").matches;
      if (!isDesktopFitActive) {
        updateFitState(DEFAULT_FIT_STATE);
        return;
      }

      const menuWidth = fitMenuElement.clientWidth;
      if (menuWidth <= 0 || fitMenuElement.clientHeight <= 0) return;

      const previousColumns = fitBoardElement.style.getPropertyValue("--fit-columns");
      const previousFontScale = fitBoardElement.style.getPropertyValue("--fit-font-scale");
      const previousGapScale = fitBoardElement.style.getPropertyValue("--fit-gap-scale");
      let selectedState: CafeDesignAFitState | null = null;
      let selectedScore = Number.POSITIVE_INFINITY;
      const columnCandidates = getFitColumnCandidates(menuWidth);

      for (const columns of columnCandidates) {
        for (const fontScale of FIT_FONT_SCALE_CANDIDATES) {
          applyFitCandidate(columns, fontScale);
          const fitsHeight = fitMenuElement.scrollHeight <= fitMenuElement.clientHeight + 1;
          const fitsWidth = fitMenuElement.scrollWidth <= fitMenuElement.clientWidth + 1;

          if (fitsHeight && fitsWidth) {
            const score = getColumnFillScore(columns, fontScale);

            if (score < selectedScore) {
              selectedScore = score;
              selectedState = {
                columns,
                fontScale,
                gapScale: getFitGapScale(fontScale),
                status: fontScale <= FIT_WARNING_FONT_SCALE ? "warning" : "fit",
              };
            }
          }
        }
      }

      if (!selectedState) {
        const fallbackFontScale = FIT_FONT_SCALE_CANDIDATES[FIT_FONT_SCALE_CANDIDATES.length - 1] ?? 0.64;
        const fallbackColumns = columnCandidates[0] ?? DEFAULT_FIT_STATE.columns;
        selectedState = {
          columns: fallbackColumns,
          fontScale: fallbackFontScale,
          gapScale: getFitGapScale(fallbackFontScale),
          status: "warning",
        };
      }

      if (previousColumns) {
        fitBoardElement.style.setProperty("--fit-columns", previousColumns);
      } else {
        fitBoardElement.style.removeProperty("--fit-columns");
      }
      if (previousFontScale) {
        fitBoardElement.style.setProperty("--fit-font-scale", previousFontScale);
      } else {
        fitBoardElement.style.removeProperty("--fit-font-scale");
      }
      if (previousGapScale) {
        fitBoardElement.style.setProperty("--fit-gap-scale", previousGapScale);
      } else {
        fitBoardElement.style.removeProperty("--fit-gap-scale");
      }

      updateFitState(selectedState);
    }

    function scheduleMeasure() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measureFit);
    }

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(fitBoardElement);
    resizeObserver.observe(fitMenuElement);
    scheduleMeasure();

    if ("fonts" in document) {
      void document.fonts.ready.then(scheduleMeasure);
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [density, hasCoverSection, visibleItemCount, visiblePageGroups.length]);

  return (
    <>
      <KoreanFontAssets assets={[koreanFontAssets, englishFontAssets]} />
      <main
        className="menu-typography cafe-a-typography group/cafe-board relative min-h-screen w-full max-w-full min-w-0 text-[#191c1b] lg:h-screen lg:overflow-y-hidden"
        style={{ ...typographyStyle, backgroundColor }}
      >
        <div className="flex min-h-screen w-full max-w-none min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-y-hidden">
          <HeaderBlock data={data} className="lg:hidden" />
          <div className={`grid min-w-0 px-[clamp(24px,4vw,96px)] py-8 pb-16 md:grid-cols-2 lg:hidden ${outerGridGapClassName}`}>
            {shouldRenderMenuCoverSection && (
              <CoverHero data={data} featuredItem={featuredItem} capabilities={capabilities} customBadgeStyles={customBadgeStyles} density={density} />
            )}

            {visiblePageGroups.length === 0 ? (
              <section className={hasCoverSection ? "lg:col-span-3" : "lg:col-span-4"}>
                <EmptyState>표시할 메뉴 페이지, 카테고리 또는 아이템이 없습니다.</EmptyState>
              </section>
            ) : (
              <MenuGroupsGrid
                pageGroups={visiblePageGroups}
                density={density}
                data={data}
                capabilities={capabilities}
                customBadgeStyles={customBadgeStyles}
                itemStackSpacing={itemStackSpacing}
                outerGridGapClassName={outerGridGapClassName}
                menuAreaClassName={menuAreaClassName}
                showPageTitles
              />
            )}
          </div>

          <div
            ref={desktopFitBoardRef}
            className={`cafe-a-desktop-fit-board hidden min-w-0 lg:grid lg:min-h-0 lg:flex-1 lg:overflow-y-hidden lg:p-[var(--board-padding)] ${desktopGridClassName}`}
            data-fit-status={fitState.status}
            style={{ ...fitGapStyle, ...fitStyle }}
          >
            <DesktopFixedRail data={data}>
              {shouldRenderMenuCoverSection && (
                <CoverHero
                  data={data}
                  featuredItem={featuredItem}
                  capabilities={capabilities}
                  customBadgeStyles={customBadgeStyles}
                  density={density}
                />
              )}
            </DesktopFixedRail>

            {visiblePageGroups.length === 0 ? (
              <section className={hasCoverSection ? "lg:col-span-3" : "lg:col-span-4"}>
                <EmptyState>표시할 메뉴 페이지, 카테고리 또는 아이템이 없습니다.</EmptyState>
              </section>
            ) : (
              <MenuGroupsGrid
                fitRef={desktopFitMenuRef}
                pageGroups={visiblePageGroups}
                density={density}
                data={data}
                capabilities={capabilities}
                customBadgeStyles={customBadgeStyles}
                itemStackSpacing={itemStackSpacing}
                outerGridGapClassName={outerGridGapClassName}
                menuAreaClassName={menuAreaClassName}
                showPageTitles
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
