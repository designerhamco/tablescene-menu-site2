/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

import ImagePlaceholder from "@/components/menu-templates/shared/ImagePlaceholder";
import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import MenuGnb from "@/components/menu-templates/shared/MenuGnb";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { getMenuItemBadgeLabel } from "@/lib/menu-badges";
import { getMenuPublicCapabilities, type MenuPublicCapabilities } from "@/lib/menu-public-capabilities";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
import { getBadgeStyleCss, getBadgeStyleForItem, getCustomBadgeStyles } from "@/lib/template-badge-styles";
import { getResolvedBackgroundColor } from "@/lib/template-background-colors";
import { getTemplateCapabilities, type TemplateCapabilities } from "@/lib/template-capabilities";
import {
  getMenuGridClassName,
  getMenuLayoutDensity,
  getTemplateLayoutRules,
  type MenuLayoutDensity,
} from "@/lib/template-layout-rules";
import { getCustomTypographySettings, getEnglishFontLoadAssets, getKoreanFontLoadAssets, getTypographyCssVariables, mergeTypographySettings } from "@/lib/template-typography-presets";
import {
  formatEventPricePair,
  formatMenuPrice,
  formatPortionLabel,
  shouldShowMenuItemTraits,
} from "@/types/menu";

type MenuItem = PublicMenuTemplateProps["items"][number];

function getDisplayName(site: PublicMenuTemplateProps["menuSite"]) {
  return site.restaurant_name || site.business_name || site.name;
}

function getMenuCoverLabel(site: PublicMenuTemplateProps["menuSite"]) {
  return site.menu_cover_label || site.restaurant_category;
}

function getCategoryItems(items: PublicMenuTemplateProps["items"], categoryId: string) {
  return items.filter((item) => item.category_id === categoryId);
}

function getItemTraits(traits: PublicMenuTemplateProps["traits"], itemId: string) {
  return traits
    .filter((trait) => trait.menu_item_id === itemId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MENU_LIMITS.maxTraitsPerItem);
}

function getItemPriceOptions(priceOptions: PublicMenuTemplateProps["priceOptions"], itemId: string) {
  return priceOptions
    .filter((option) => option.menu_item_id === itemId && option.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MENU_LIMITS.maxPriceOptionsPerItem);
}

function formatPriceOption(option: PublicMenuTemplateProps["priceOptions"][number]) {
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

function getFeaturedPrice(data: PublicMenuTemplateProps, item: MenuItem, capabilities: TemplateCapabilities) {
  if (item.price_visible === false) return null;

  const visiblePriceOptions = capabilities.priceOptions ? getItemPriceOptions(data.priceOptions, item.id) : [];
  const optionSummary = visiblePriceOptions
    .map((option) => {
      const optionPrice = formatPriceOption(option);
      return optionPrice ? `${option.label} ${optionPrice}` : option.label;
    })
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");

  if (optionSummary) return optionSummary;

  if (item.price_label?.trim()) return item.price_label.trim();

  return formatMenuPrice(item) ?? "문의";
}

function getFeaturedItem(data: PublicMenuTemplateProps, capabilities: TemplateCapabilities) {
  if (!data.pageSettings.featured_item_enabled || !data.pageSettings.featured_item_id) return null;
  if (!capabilities.featuredItemHero || !capabilities.menuItemImages) return null;

  const featuredItem = data.items.find((item) => item.id === data.pageSettings.featured_item_id);
  if (!featuredItem || featuredItem.visible === false || !featuredItem.image_url) return null;

  return featuredItem;
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="border-b border-zinc-200 bg-white px-5 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{eyebrow}</p>
        <h2 className="break-words text-3xl font-black tracking-tight text-zinc-950">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm font-bold leading-relaxed text-zinc-400">
      {children}
    </div>
  );
}

function DetailList({ rows }: { rows: { label: string; value: string | null | undefined; href?: string | null }[] }) {
  const visibleRows = rows.filter((row) => row.value);

  if (visibleRows.length === 0) {
    return <EmptyState>표시할 상세 정보가 없습니다.</EmptyState>;
  }

  return (
    <dl className="grid gap-3">
      {visibleRows.map((row) => (
        <div key={row.label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <dt className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{row.label}</dt>
          <dd className="mt-1 break-keep text-sm font-bold leading-relaxed text-zinc-700">
            {row.href ? (
              <a href={row.href} target="_blank" rel="noopener noreferrer" className="underline decoration-zinc-300 underline-offset-4">
                {row.value}
              </a>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function IntroSection({ data }: { data: PublicMenuTemplateProps }) {
  const { menuSite } = data;
  const displayName = getDisplayName(menuSite);
  const hasBackgroundImage = Boolean(menuSite.intro_image_url);

  return (
    <section className={`relative overflow-hidden px-5 py-16 ${hasBackgroundImage ? "min-h-[520px] text-white" : "bg-zinc-50 text-zinc-950"}`}>
      {hasBackgroundImage && (
        <>
          <img src={menuSite.intro_image_url ?? ""} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/65" />
        </>
      )}
      <div className="relative mx-auto flex min-h-80 w-full max-w-3xl items-center">
        <div className={`w-full rounded-lg p-6 ${hasBackgroundImage ? "border border-white/15 bg-black/10 backdrop-blur-[2px]" : "border border-zinc-100 bg-white"}`}>
          <p className={`text-xs font-black uppercase tracking-[0.22em] ${hasBackgroundImage ? "text-white/65" : "text-zinc-400"}`}>
            Welcome
          </p>
          <h1 className="mt-3 break-words text-4xl font-black tracking-tight">{menuSite.intro_title || displayName}</h1>
          {(menuSite.intro_description || menuSite.brand_description) && (
            <div className={`mt-5 space-y-3 break-keep text-sm font-semibold leading-relaxed ${hasBackgroundImage ? "text-white/78" : "text-zinc-500"}`}>
              {menuSite.intro_description && <p className="break-words">{menuSite.intro_description}</p>}
              {menuSite.brand_description && <p className="break-words">{menuSite.brand_description}</p>}
            </div>
          )}
          </div>
      </div>
    </section>
  );
}

function MenuCoverSection({ data, capabilities }: { data: PublicMenuTemplateProps; capabilities: TemplateCapabilities }) {
  const { menuSite } = data;
  const displayName = getDisplayName(menuSite);
  const menuCoverLabel = getMenuCoverLabel(menuSite);
  const featuredItem = getFeaturedItem(data, capabilities);
  const featuredPrice = featuredItem ? getFeaturedPrice(data, featuredItem, capabilities) : null;
  const featuredBadge = featuredItem && capabilities.itemBadges ? getMenuItemBadgeLabel(featuredItem) : null;
  const customBadgeStyles = getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings);
  const featuredBadgeStyle = featuredItem ? getBadgeStyleForItem(featuredItem, data.menuSite.template_key, customBadgeStyles) : null;

  return (
    <section className="bg-zinc-950 px-5 py-14 text-white">
      <div className={`mx-auto grid min-h-64 w-full max-w-5xl items-center gap-8 ${featuredItem ? "lg:grid-cols-[0.95fr_1.05fr]" : ""}`}>
        <div className="flex flex-col justify-center">
          {menuCoverLabel && <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">{menuCoverLabel}</p>}
          <h2 className="mt-4 break-words text-4xl font-black tracking-tight">{menuSite.menu_cover_title || `${displayName} 메뉴`}</h2>
          {menuSite.menu_cover_description && (
            <p className="mt-5 max-w-2xl break-keep text-sm font-semibold leading-relaxed text-white/65">{menuSite.menu_cover_description}</p>
          )}
        </div>
        {featuredItem && (
          <article className="overflow-hidden rounded-lg border border-white/10 bg-white text-zinc-950 shadow-2xl shadow-black/20">
            <img src={featuredItem.image_url ?? ""} alt={featuredItem.name} className="aspect-[16/10] w-full object-cover" />
            <div className="p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-black text-white">대표 추천</span>
                {featuredBadge && featuredBadgeStyle && (
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={getBadgeStyleCss(featuredBadgeStyle)}>
                    {featuredBadge}
                  </span>
                )}
              </div>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <h3 className="break-words text-2xl font-black tracking-tight">{featuredItem.name}</h3>
                  {featuredItem.description && <p className="mt-2 line-clamp-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{featuredItem.description}</p>}
                </div>
                {featuredPrice && <p className="shrink-0 whitespace-nowrap text-sm font-black text-zinc-950">{featuredPrice}</p>}
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function MenuItemCard({
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
  const price = formatMenuPrice(item);
  const portion = formatPortionLabel(item);
  const visiblePriceOptions = capabilities.priceOptions && item.price_visible !== false ? getItemPriceOptions(priceOptions, item.id) : [];
  const badgeLabel = capabilities.itemBadges ? getMenuItemBadgeLabel(item) : null;
  const badgeStyle = badgeLabel ? getBadgeStyleForItem(item, templateKey, customBadgeStyles) : null;
  const visibleTraits = capabilities.itemTraits && shouldShowMenuItemTraits(item, traits)
    ? traits
        .filter((trait) => trait.visible)
        .sort((a, b) => a.sort_order - b.sort_order)
        .slice(0, MENU_LIMITS.maxTraitsPerItem)
    : [];

  const cardPaddingClassName = {
    spacious: "p-5",
    default: "p-4",
    compact: "p-3.5",
    ultraCompact: "p-3",
  }[density];
  const titleClassName = {
    spacious: "text-lg",
    default: "text-lg",
    compact: "text-base",
    ultraCompact: "text-[15px]",
  }[density];
  const descriptionClassName = {
    spacious: "line-clamp-3",
    default: "line-clamp-3",
    compact: "line-clamp-2",
    ultraCompact: "line-clamp-2",
  }[density];

  return (
    <article className="overflow-hidden rounded-lg border border-zinc-100 bg-white">
      {capabilities.menuItemImages && (
        item.image_url ? (
          <img src={item.image_url} alt={item.name} className="aspect-[16/10] w-full object-cover" loading="lazy" />
        ) : (
          <ImagePlaceholder />
        )
      )}
      <div className={cardPaddingClassName}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {badgeLabel && badgeStyle && (
                <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={getBadgeStyleCss(badgeStyle)}>
                  {badgeLabel}
                </span>
              )}
              {item.is_sold_out && <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-black text-zinc-500">품절</span>}
            </div>
            {item.set_name && <p className="mb-1 text-xs font-black text-zinc-400">{item.set_name}</p>}
            <h3 className={`line-clamp-2 break-words font-black text-zinc-950 ${titleClassName}`}>{item.name}</h3>
            {item.description && <p className={`mt-2 break-words text-sm font-semibold leading-relaxed text-zinc-500 ${descriptionClassName}`}>{item.description}</p>}
          </div>
          {price && visiblePriceOptions.length === 0 && <p className="shrink-0 whitespace-nowrap text-sm font-black text-zinc-950">{price}</p>}
        </div>
        {portion && <p className="mt-3 text-xs font-black text-zinc-400">{portion}</p>}
        {visiblePriceOptions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {visiblePriceOptions.map((option) => {
              const optionPrice = formatPriceOption(option);
              return (
                <span key={option.id} className="rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-black text-zinc-500">
                  {option.label}
                  {optionPrice && <span className="ml-1 text-zinc-700">{optionPrice}</span>}
                </span>
              );
            })}
          </div>
        )}
        {visibleTraits.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleTraits.map((trait) => (
              <span key={trait.id} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-500">
                {trait.label} {trait.value}/{trait.max_value}
              </span>
            ))}
          </div>
        )}
        {capabilities.originInfo && item.origin_info && <p className="mt-3 line-clamp-2 break-words text-xs font-semibold leading-relaxed text-zinc-400">원산지 {item.origin_info}</p>}
      </div>
    </article>
  );
}

function MenuPagesSection({
  data,
  capabilities,
}: {
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
}) {
  const totalVisibleItemCount = data.items.filter((item) => item.visible).length;
  const layoutRules = getTemplateLayoutRules(data.menuSite.template_key, data.menuSite.template_category);
  const density = getMenuLayoutDensity(totalVisibleItemCount, layoutRules, "desktop");
  const gridClassName = getMenuGridClassName(layoutRules, density);
  const customBadgeStyles = getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings);
  const hasVisibleMenu = data.pages.some((page) =>
    data.categories.some((category) => category.menu_page_id === page.id && getCategoryItems(data.items, category.id).length > 0)
  );

  return (
    <Section eyebrow="Menu Pages" title="메뉴">
      {!hasVisibleMenu ? (
        <EmptyState>표시할 메뉴 페이지, 카테고리 또는 아이템이 없습니다.</EmptyState>
      ) : (
        <div className="space-y-8">
          {data.pages.map((page) => {
            const categories = data.categories.filter((category) => category.menu_page_id === page.id);
            const hasPageItems = categories.some((category) => getCategoryItems(data.items, category.id).length > 0);

            if (!hasPageItems) {
              return null;
            }

            return (
              <section key={page.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                <h3 className="break-words text-2xl font-black text-zinc-950">{page.title}</h3>
                {page.description_visible && page.description && <p className="mt-2 break-keep text-sm font-semibold text-zinc-500">{page.description}</p>}
                <div className="mt-5 space-y-5">
                  {categories.map((category) => {
                    const items = getCategoryItems(data.items, category.id);

                    if (items.length === 0) {
                      return null;
                    }

                    return (
                      <section key={category.id}>
                        <h4 className="break-words text-lg font-black text-zinc-900">{category.name}</h4>
                        {category.description_visible && category.description && (
                          <p className="mt-1 break-keep text-sm font-semibold text-zinc-500">{category.description}</p>
                        )}
                        <div className={`mt-3 ${gridClassName}`}>
                          {items.map((item) => (
                            <MenuItemCard
                              key={item.id}
                              item={item}
                              priceOptions={data.priceOptions}
                              traits={getItemTraits(data.traits, item.id)}
                              capabilities={capabilities}
                              density={density}
                              templateKey={data.menuSite.template_key}
                              customBadgeStyles={customBadgeStyles}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function AboutSection({
  data,
  capabilities,
  publicCapabilities,
}: {
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  publicCapabilities: MenuPublicCapabilities;
}) {
  const { menuSite } = data;

  return (
    <Section eyebrow="About" title="소개">
      {(menuSite.about_description || menuSite.brand_description) && (
        <div className="mb-6 space-y-3 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
          {menuSite.about_description && <p>{menuSite.about_description}</p>}
          {menuSite.brand_description && <p>{menuSite.brand_description}</p>}
        </div>
      )}
      <DetailList
        rows={[
          { label: "매장명", value: getDisplayName(menuSite) },
          { label: "주소", value: menuSite.restaurant_address || menuSite.business_address },
          { label: "전화번호", value: menuSite.restaurant_phone || menuSite.business_phone },
          { label: "운영시간", value: menuSite.opening_hours },
          { label: "지도", value: menuSite.map_url, href: menuSite.map_url },
        ]}
      />
      {publicCapabilities.chefs && capabilities.chefs && data.pageSettings.chefs_enabled && data.chefs.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-black text-zinc-950">셰프 / 인물</h3>
          <div className="mt-4 grid gap-4">
            {data.chefs.map((chef) => (
              <article key={chef.id} className="flex gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                {chef.chef_image_url ? (
                  <img src={chef.chef_image_url} alt={chef.chef_name} className="h-20 w-20 rounded-lg object-cover" />
                ) : (
                  <ImagePlaceholder className="h-20 w-20 shrink-0" iconClassName="h-9 w-9" />
                )}
                <div>
                  <h4 className="text-lg font-black text-zinc-950">{chef.chef_name}</h4>
                  {chef.chef_role && <p className="mt-1 text-sm font-black text-zinc-400">{chef.chef_role}</p>}
                  {chef.chef_description && <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{chef.chef_description}</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {publicCapabilities.socialLinks && capabilities.socialLinks && data.pageSettings.social_links_enabled && data.socialLinks.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-black text-zinc-950">SNS</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 hover:bg-zinc-50"
              >
                {link.display_name || link.label || link.type}
              </a>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function EventsSection({ data }: { data: PublicMenuTemplateProps }) {
  if (data.events.length === 0) return null;

  return (
    <Section eyebrow="Events" title="이벤트">
      <div className="grid gap-4">
        {data.events.map((event) => {
          const pricePair = formatEventPricePair(event);

          return (
            <article key={event.id} className="overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
              {event.event_image_url ? (
                <img src={event.event_image_url} alt={event.event_title ?? ""} className="aspect-[16/9] w-full object-cover" />
              ) : (
                <ImagePlaceholder className="aspect-[16/9] w-full rounded-none border-0" iconClassName="h-20 w-20" />
              )}
              <div className="p-4">
                {event.event_period && <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{event.event_period}</p>}
                <h3 className="break-keep text-xl font-black text-zinc-950">{event.event_title || "이벤트"}</h3>
                {event.event_subtitle && <p className="mt-1 break-keep text-sm font-black text-zinc-500">{event.event_subtitle}</p>}
                {event.event_description && <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{event.event_description}</p>}
                {pricePair && (
                  <div className="mt-4 flex flex-wrap gap-2 text-sm font-black">
                    {pricePair.regular && <span className="rounded-full bg-white px-3 py-1 text-zinc-400">{pricePair.regular}</span>}
                    {pricePair.sale && <span className="rounded-full bg-zinc-950 px-3 py-1 text-white">{pricePair.sale}</span>}
                  </div>
                )}
                {event.event_benefit && <p className="mt-3 break-keep text-sm font-bold text-emerald-700">{event.event_benefit}</p>}
                {event.event_detail && <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-400">{event.event_detail}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

export default function BasicMenuTemplate(data: PublicMenuTemplateProps) {
  const { pageSettings } = data;
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const publicCapabilities = getMenuPublicCapabilities(data.publicServiceType);
  const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(data.menuSite.template_key, customTypography);
  const koreanFontAssets = getKoreanFontLoadAssets(typographySettings.korean_font_key);
  const englishFontAssets = getEnglishFontLoadAssets(typographySettings.english_font_key);
  const backgroundColor = getResolvedBackgroundColor(data.menuSite.template_key, data.menuSite.page_settings);
  const shouldRenderMenuCover =
    publicCapabilities.menuCoverPage &&
    capabilities.menuCover.coverMode !== "none" &&
    pageSettings.menu_cover_enabled !== false;

  return (
    <>
      <KoreanFontAssets assets={[koreanFontAssets, englishFontAssets]} />
      <div id="intro" className="menu-typography text-zinc-950" style={{ ...getTypographyCssVariables(typographySettings), backgroundColor }}>
        {publicCapabilities.introPage && pageSettings.intro_enabled && <IntroSection data={data} />}
        <MenuGnb site={data.menuSite} currentLocale={data.locale} enabledLocales={data.enabledLocales} />
        {shouldRenderMenuCover && <MenuCoverSection data={data} capabilities={capabilities} />}
        {publicCapabilities.menuPages && <MenuPagesSection data={data} capabilities={capabilities} />}
        {publicCapabilities.aboutPage && pageSettings.about_enabled && (
          <AboutSection data={data} capabilities={capabilities} publicCapabilities={publicCapabilities} />
        )}
        {publicCapabilities.eventPage && capabilities.events && pageSettings.events_enabled && <EventsSection data={data} />}
      </div>
    </>
  );
}
