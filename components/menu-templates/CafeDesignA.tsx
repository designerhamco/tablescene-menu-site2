/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, type ReactNode } from "react";

import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { getMenuItemBadgeLabel } from "@/lib/menu-badges";
import { getMenuPublicCapabilities } from "@/lib/menu-public-capabilities";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
import { getBadgeStyleCss, getBadgeStyleForItem, getCustomBadgeStyles } from "@/lib/template-badge-styles";
import { getTemplateCapabilities, type TemplateCapabilities } from "@/lib/template-capabilities";
import {
  getMenuLayoutDensity,
  getTemplateLayoutRules,
  type MenuLayoutDensity,
} from "@/lib/template-layout-rules";
import { getCustomTypographySettings, getTypographyCssVariables, mergeTypographySettings } from "@/lib/template-typography-presets";
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

function getDisplayName(site: PublicMenuTemplateProps["menuSite"]) {
  return site.restaurant_name || site.business_name || site.name;
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
    .filter((option) => option.menu_item_id === itemId && option.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MENU_LIMITS.maxPriceOptionsPerItem);
}

function formatPriceOption(option: PriceOption) {
  if (option.price_label) return option.price_label;
  if (typeof option.price === "number") return new Intl.NumberFormat("ko-KR").format(option.price) + "원";
  return "";
}

function getItemPriceDisplay(item: MenuItem, priceOptions: PublicMenuTemplateProps["priceOptions"], capabilities: TemplateCapabilities) {
  if (item.price_visible === false) return null;
  if (item.price_label?.trim()) return item.price_label.trim();

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
  if (!capabilities.featuredItemHero || !capabilities.menuItemImages) return null;

  const featuredItem = data.items.find((item) => item.id === data.pageSettings.featured_item_id);
  if (!featuredItem || featuredItem.visible === false || !featuredItem.image_url) return null;

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

function getMenuAreaClassName(hasFeaturedItem: boolean) {
  return hasFeaturedItem
    ? "lg:col-span-3 lg:grid-cols-3 2xl:col-span-4 2xl:grid-cols-4"
    : "lg:col-span-4 lg:grid-cols-4 2xl:col-span-5 2xl:grid-cols-5";
}

function getCategorySpanClassName(itemCount: number) {
  if (itemCount >= 15) return "lg:col-span-3";
  if (itemCount >= 7) return "lg:col-span-2";
  return "lg:col-span-1";
}

function getCategoryFlowClassName(itemCount: number, density: MenuLayoutDensity) {
  const columnGapClassName = {
    spacious: "lg:[column-gap:2.25rem]",
    default: "lg:[column-gap:2rem]",
    compact: "lg:[column-gap:1.75rem]",
    ultraCompact: "lg:[column-gap:1.5rem]",
  }[density];

  if (itemCount >= 15) return `lg:columns-3 ${columnGapClassName}`;
  if (itemCount >= 7) return `lg:columns-2 ${columnGapClassName}`;
  return "";
}

function getOuterGridGapClassName(density: MenuLayoutDensity) {
  return {
    spacious: "gap-y-12 md:gap-x-8 lg:gap-x-[clamp(28px,3vw,56px)] lg:gap-y-[clamp(32px,3vh,48px)]",
    default: "gap-y-10 md:gap-x-8 lg:gap-x-[clamp(24px,2.6vw,48px)] lg:gap-y-[clamp(24px,2.6vh,40px)]",
    compact: "gap-y-9 md:gap-x-7 lg:gap-x-[clamp(22px,2.3vw,40px)] lg:gap-y-[clamp(22px,2.3vh,34px)]",
    ultraCompact: "gap-y-8 md:gap-x-6 lg:gap-x-[clamp(20px,2vw,34px)] lg:gap-y-[clamp(20px,2vh,30px)]",
  }[density];
}

function getDesktopGridClassName(hasFeaturedItem: boolean) {
  return hasFeaturedItem
    ? "lg:grid-cols-[minmax(280px,0.8fr)_repeat(3,minmax(0,1fr))] 2xl:grid-cols-[minmax(300px,0.75fr)_repeat(4,minmax(0,1fr))]"
    : "lg:grid-cols-4 2xl:grid-cols-5";
}

function CategoryTitle({ category, density }: { category: MenuCategory; density: MenuLayoutDensity }) {
  const spacingClassName = getCategoryTitleSpacing(density);
  const titleClassName = {
    spacious: "text-[19px]",
    default: "text-lg",
    compact: "text-[17px]",
    ultraCompact: "text-base",
  }[density];

  return (
    <div className={spacingClassName}>
      <h2 className={`break-words font-black uppercase leading-tight text-[#191c1b] ${titleClassName}`}>{category.name}</h2>
      <div className="mt-2 border-b border-[#191c1b]" />
      {category.description_visible && category.description && (
        <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-[#3f4945]">{category.description}</p>
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
    <span className="inline-flex rounded-none px-1.5 py-1 text-[10px] font-black uppercase leading-none" style={getBadgeStyleCss(badgeStyle)}>
      {label}
    </span>
  );
}

function SoldOutBadge() {
  return <span className="inline-flex rounded-none bg-[#e1e3e0] px-1.5 py-1 text-[10px] font-black uppercase leading-none text-[#3f4945]">품절</span>;
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
    spacious: "text-[17px]",
    default: "text-base",
    compact: "text-[15px]",
    ultraCompact: "text-[15px]",
  }[density];
  const descriptionClassName = {
    spacious: "line-clamp-3",
    default: "line-clamp-2",
    compact: "line-clamp-2",
    ultraCompact: "line-clamp-1",
  }[density];
  const priceClassName = {
    spacious: "text-[18px]",
    default: "text-[17px]",
    compact: "text-base",
    ultraCompact: "text-[15px]",
  }[density];
  const itemGridClassName = {
    spacious: "grid-cols-[minmax(0,1fr)_minmax(3.75rem,auto)] gap-4",
    default: "grid-cols-[minmax(0,1fr)_minmax(3.25rem,auto)] gap-3",
    compact: "grid-cols-[minmax(0,1fr)_minmax(3rem,auto)] gap-2.5",
    ultraCompact: "grid-cols-[minmax(0,1fr)_minmax(2.75rem,auto)] gap-2",
  }[density];
  const metaClassName = {
    spacious: "text-xs",
    default: "text-[11px]",
    compact: "text-[10px]",
    ultraCompact: "text-[9px]",
  }[density];
  const descriptionTextClassName = {
    spacious: "text-[11px] leading-[1.5]",
    default: "text-[11px] leading-[1.45]",
    compact: "text-[10px] leading-[1.4]",
    ultraCompact: "text-[10px] leading-[1.35]",
  }[density];

  return (
    <article className={`grid items-start ${itemGridClassName}`}>
      <div className="min-w-0">
        <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
          <h3 className={`break-words font-bold leading-snug text-[#191c1b] ${titleClassName}`}>{item.name}</h3>
          <Badge item={item} capabilities={capabilities} templateKey={templateKey} customBadgeStyles={customBadgeStyles} />
          {item.is_sold_out && <SoldOutBadge />}
        </div>
        {item.set_name && <p className={`mb-0.5 font-medium uppercase leading-snug text-[#5e5e5e] ${metaClassName}`}>{item.set_name}</p>}
        {item.description && (
          <p className={`break-keep font-normal text-[#3f4945] ${descriptionTextClassName} ${descriptionClassName}`}>{item.description}</p>
        )}
        {visibleTraits.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleTraits.map((trait) => (
              <span key={trait.id} className="border border-[#bfc9c4] px-1.5 py-1 text-[10px] font-black text-[#3f4945]">
                {trait.label} {trait.value}/{trait.max_value}
              </span>
            ))}
          </div>
        )}
        {item.origin_info && <p className="mt-2 line-clamp-2 break-words text-[11px] font-semibold leading-relaxed text-[#707975]">원산지 {item.origin_info}</p>}
      </div>
      {priceRows.length > 0 && (
        <div className="flex flex-col items-end gap-1 text-right text-[#191c1b]">
          {priceRows.map((row, index) => (
            <div key={`${row.label}-${row.price}-${index}`} className="grid grid-cols-[auto_auto] items-baseline gap-x-2">
              {row.label && <span className="whitespace-nowrap text-[10px] font-bold uppercase leading-none text-[#191c1b]">{row.label}</span>}
              <span className={`whitespace-nowrap font-bold leading-none ${priceClassName}`}>{row.price}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function FeaturedHero({
  data,
  featuredItem,
  capabilities,
  customBadgeStyles,
  density,
}: {
  data: PublicMenuTemplateProps;
  featuredItem: MenuItem;
  capabilities: TemplateCapabilities;
  customBadgeStyles: unknown;
  density: MenuLayoutDensity;
}) {
  const price = getItemPriceDisplay(featuredItem, data.priceOptions, capabilities);
  const heroMinHeightClassName = {
    spacious: "min-h-[400px]",
    default: "min-h-[380px]",
    compact: "min-h-[340px]",
    ultraCompact: "min-h-[320px]",
  }[density];

  return (
    <section className={`flex min-w-0 ${heroMinHeightClassName} flex-col bg-[#eceeec] md:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-0`}>
      <div className={`relative h-full ${heroMinHeightClassName} flex-1 overflow-hidden lg:min-h-0`}>
        <img src={featuredItem.image_url ?? ""} alt={featuredItem.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="inline-flex rounded-none bg-[#00342b] px-1.5 py-1 text-[10px] font-black uppercase leading-none text-white">대표 추천</span>
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
          {price && <p className="shrink-0 whitespace-nowrap text-xl font-black leading-none">{price}</p>}
        </div>
      </div>
    </section>
  );
}

function HeaderBlock({ data }: { data: PublicMenuTemplateProps }) {
  const displayName = getDisplayName(data.menuSite);
  const title = data.menuSite.menu_cover_title || displayName;
  const description = data.menuSite.menu_cover_description || data.menuSite.description || data.menuSite.brand_description;

  return (
    <header className="w-full shrink-0 border-b border-[#191c1b] px-[clamp(24px,4vw,96px)] py-8 lg:px-[clamp(32px,4vw,96px)] lg:py-[clamp(18px,2.4vh,28px)]">
      <div className="flex min-w-0 items-start justify-between gap-[clamp(16px,2vw,32px)]">
        <div className="min-w-0 max-w-5xl">
          <h1 className="break-words text-5xl font-black uppercase leading-[1.02] text-[#191c1b] lg:text-[clamp(42px,5.2vh,52px)]">{title}</h1>
          {description && <p className="mt-2 break-keep text-[11px] font-normal leading-[1.5] text-[#3f4945]">{description}</p>}
        </div>
        <div className="group relative shrink-0 cursor-default text-right text-[#191c1b]">
          <MenuLanguageSwitcher currentLocale={data.locale} enabledLocales={data.enabledLocales} />
        </div>
      </div>
    </header>
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
}) {
  return (
    <section className={`grid min-w-0 grid-flow-dense grid-cols-1 content-start md:col-span-2 md:grid-cols-2 lg:min-h-0 lg:max-h-full lg:overflow-y-auto lg:pr-1 ${outerGridGapClassName} ${menuAreaClassName}`}>
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
            <section key={`${page.id}-${category.id}`} className={`min-w-0 ${getCategorySpanClassName(items.length)}`}>
              <CategoryTitle category={category} density={density} />
              <div className={getCategoryFlowClassName(items.length, density)}>
                {items.map((item) => (
                  <div key={item.id} className={`break-inside-avoid ${itemStackSpacing}`}>
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

function DesktopPageControls({
  pageIndex,
  pageCount,
  onPrevious,
  onNext,
}: {
  pageIndex: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (pageCount <= 1) return null;

  const isFirstPage = pageIndex <= 0;
  const isLastPage = pageIndex >= pageCount - 1;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 hidden px-[clamp(32px,4vw,96px)] opacity-0 transition-opacity duration-200 group-hover/cafe-board:opacity-100 group-focus-within/cafe-board:opacity-100 lg:block">
      <div className="ml-auto flex w-fit items-center gap-2 border border-[#191c1b] bg-white/90 px-2 py-2 text-[#191c1b] shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstPage}
          aria-label="이전 메뉴 페이지"
          className="pointer-events-auto flex h-8 w-8 items-center justify-center border border-[#191c1b] text-sm font-black transition disabled:cursor-not-allowed disabled:border-[#bfc9c4] disabled:text-[#bfc9c4]"
        >
          ←
        </button>
        <p className="min-w-14 text-center text-[11px] font-black tabular-nums tracking-[0.16em]">
          {String(pageIndex + 1).padStart(2, "0")} / {String(pageCount).padStart(2, "0")}
        </p>
        <button
          type="button"
          onClick={onNext}
          disabled={isLastPage}
          aria-label="다음 메뉴 페이지"
          className="pointer-events-auto flex h-8 w-8 items-center justify-center border border-[#191c1b] text-sm font-black transition disabled:cursor-not-allowed disabled:border-[#bfc9c4] disabled:text-[#bfc9c4]"
        >
          →
        </button>
      </div>
    </div>
  );
}

export default function CafeDesignA(data: PublicMenuTemplateProps) {
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const publicCapabilities = getMenuPublicCapabilities(data.publicServiceType);
  const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(data.menuSite.template_key, customTypography);
  const customBadgeStyles = getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings);
  const featuredItem = getFeaturedItem(data, capabilities);
  const visiblePageGroups = publicCapabilities.menuPages ? getVisibleMenuPageGroups(data) : [];
  const [desktopPageIndex, setDesktopPageIndex] = useState(0);
  const boundedDesktopPageIndex = Math.min(desktopPageIndex, Math.max(visiblePageGroups.length - 1, 0));
  const desktopPageGroups = visiblePageGroups[boundedDesktopPageIndex] ? [visiblePageGroups[boundedDesktopPageIndex]] : [];
  const visibleItemCount = data.items.filter((item) => item.visible !== false).length;
  const layoutRules = getTemplateLayoutRules(data.menuSite.template_key, data.menuSite.template_category);
  const density = getMenuLayoutDensity(visibleItemCount, layoutRules, "desktop");
  const hasFeaturedItem = Boolean(featuredItem);
  const menuAreaClassName = getMenuAreaClassName(hasFeaturedItem);
  const desktopGridClassName = getDesktopGridClassName(hasFeaturedItem);
  const outerGridGapClassName = getOuterGridGapClassName(density);
  const itemStackSpacing = getItemStackSpacing(density);

  return (
    <main className="menu-typography group/cafe-board relative min-h-screen w-full max-w-full min-w-0 bg-white text-[#191c1b] lg:h-screen lg:overflow-y-hidden" style={getTypographyCssVariables(typographySettings)}>
      <div className="flex min-h-screen w-full max-w-none min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-y-hidden">
        <HeaderBlock data={data} />
        <div className={`grid min-w-0 px-[clamp(24px,4vw,96px)] py-8 pb-16 md:grid-cols-2 lg:hidden ${outerGridGapClassName}`}>
          {publicCapabilities.menuCoverPage && data.pageSettings.menu_cover_enabled !== false && featuredItem && (
            <FeaturedHero data={data} featuredItem={featuredItem} capabilities={capabilities} customBadgeStyles={customBadgeStyles} density={density} />
          )}

          {visiblePageGroups.length === 0 ? (
            <section className={featuredItem ? "lg:col-span-3" : "lg:col-span-4"}>
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

        <div className={`hidden min-w-0 lg:grid lg:min-h-0 lg:flex-1 lg:overflow-y-hidden lg:px-[clamp(32px,4vw,96px)] lg:py-[clamp(18px,2.4vh,28px)] ${desktopGridClassName} ${outerGridGapClassName}`}>
          {publicCapabilities.menuCoverPage && data.pageSettings.menu_cover_enabled !== false && featuredItem && (
            <FeaturedHero data={data} featuredItem={featuredItem} capabilities={capabilities} customBadgeStyles={customBadgeStyles} density={density} />
          )}

          {desktopPageGroups.length === 0 ? (
            <section className={featuredItem ? "lg:col-span-3" : "lg:col-span-4"}>
              <EmptyState>표시할 메뉴 페이지, 카테고리 또는 아이템이 없습니다.</EmptyState>
            </section>
          ) : (
            <MenuGroupsGrid
              pageGroups={desktopPageGroups}
              density={density}
              data={data}
              capabilities={capabilities}
              customBadgeStyles={customBadgeStyles}
              itemStackSpacing={itemStackSpacing}
              outerGridGapClassName={outerGridGapClassName}
              menuAreaClassName={menuAreaClassName}
              showPageTitles={false}
            />
          )}
        </div>
      </div>
      <DesktopPageControls
        pageIndex={boundedDesktopPageIndex}
        pageCount={visiblePageGroups.length}
        onPrevious={() => setDesktopPageIndex((currentIndex) => Math.max(0, currentIndex - 1))}
        onNext={() => setDesktopPageIndex((currentIndex) => Math.min(visiblePageGroups.length - 1, currentIndex + 1))}
      />
    </main>
  );
}
