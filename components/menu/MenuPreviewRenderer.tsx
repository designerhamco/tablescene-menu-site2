/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import { getMenuItemBadgeLabel } from "@/lib/menu-badges";
import { getMenuPublicCapabilities } from "@/lib/menu-public-capabilities";
import { getBadgeStyleCss, getBadgeStyleForItem, getCustomBadgeStyles } from "@/lib/template-badge-styles";
import { getTemplateCapabilities, type TemplateCapabilities } from "@/lib/template-capabilities";
import { getCustomTypographySettings, getEnglishFontLoadAssets, getKoreanFontLoadAssets, getTypographyCssVariables, mergeTypographySettings } from "@/lib/template-typography-presets";
import { formatMenuPrice, formatPortionLabel, shouldShowMenuItemTraits } from "@/types/menu";
import type { MenuPageData } from "@/lib/menu-page-data";

type MenuPreviewRendererProps = MenuPageData;
type MenuItem = MenuPageData["items"][number];

function getDisplayName(menuSite: MenuPageData["menuSite"]) {
  return menuSite.restaurant_name || menuSite.business_name || menuSite.name;
}

function getMenuCoverLabel(menuSite: MenuPageData["menuSite"]) {
  return menuSite.menu_cover_label || menuSite.restaurant_category;
}

function getCategoryItems(items: MenuPageData["items"], categoryId: string) {
  return items.filter((item) => item.category_id === categoryId);
}

function getItemTraits(traits: MenuPageData["traits"], itemId: string) {
  return traits.filter((trait) => trait.menu_item_id === itemId);
}

function formatPriceOption(option: MenuPageData["priceOptions"][number]) {
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

function getItemPriceOptions(priceOptions: MenuPageData["priceOptions"], itemId: string) {
  return priceOptions.filter((option) => option.menu_item_id === itemId && option.visible !== false).sort((a, b) => a.sort_order - b.sort_order);
}

function getFeaturedPrice(data: MenuPreviewRendererProps, item: MenuItem, capabilities: TemplateCapabilities) {
  if (item.price_visible === false) return null;

  const optionSummary = capabilities.priceOptions
    ? getItemPriceOptions(data.priceOptions, item.id)
        .map((option) => {
          const optionPrice = formatPriceOption(option);
          return optionPrice ? `${option.label} ${optionPrice}` : option.label;
        })
        .filter(Boolean)
        .slice(0, 2)
        .join(" / ")
    : "";

  if (optionSummary) return optionSummary;
  if (item.price_label?.trim()) return item.price_label.trim();

  return formatMenuPrice(item) || "문의";
}

function getFeaturedItem(data: MenuPreviewRendererProps, capabilities: TemplateCapabilities) {
  if (!data.pageSettings.featured_item_enabled || !data.pageSettings.featured_item_id) return null;
  if (!capabilities.featuredItemHero || !capabilities.menuItemImages) return null;

  const featuredItem = data.items.find((item) => item.id === data.pageSettings.featured_item_id);
  if (!featuredItem || featuredItem.visible === false || !featuredItem.image_url) return null;

  return featuredItem;
}

function PreviewSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-zinc-200 bg-white px-5 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{eyebrow}</p>
        <h2 className="text-3xl font-black tracking-tight text-zinc-950">{title}</h2>
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
    return <EmptyState>입력된 상세 정보가 없습니다.</EmptyState>;
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

function IntroSection({ data }: { data: MenuPreviewRendererProps }) {
  const { menuSite } = data;
  const displayName = getDisplayName(menuSite);
  const title = menuSite.intro_title || displayName;
  const hasBackgroundImage = Boolean(menuSite.intro_image_url);

  return (
    <section className={`relative overflow-hidden px-5 py-10 ${hasBackgroundImage ? "text-white" : "bg-white text-zinc-950"}`}>
      {hasBackgroundImage && (
        <>
          <img src={menuSite.intro_image_url ?? ""} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/65" />
        </>
      )}
      <div className="relative mx-auto w-full max-w-3xl">
        <p className={`mb-3 text-xs font-black uppercase tracking-[0.22em] ${hasBackgroundImage ? "text-white/60" : "text-zinc-400"}`}>Intro</p>
        <div className={`rounded-lg p-6 ${hasBackgroundImage ? "border border-white/15 bg-black/10" : "border border-zinc-100 bg-zinc-50"}`}>
          <p className={`text-xs font-black uppercase tracking-[0.22em] ${hasBackgroundImage ? "text-white/50" : "text-zinc-400"}`}>
            Intro
          </p>
          <h3 className="mt-3 break-keep text-4xl font-black tracking-tight">{title}</h3>
          {(menuSite.intro_description || menuSite.brand_description) && (
            <div className={`mt-5 space-y-3 break-keep text-sm font-semibold leading-relaxed ${hasBackgroundImage ? "text-white/70" : "text-zinc-500"}`}>
              {menuSite.intro_description && <p>{menuSite.intro_description}</p>}
              {menuSite.brand_description && <p>{menuSite.brand_description}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MenuCoverSection({ data, capabilities }: { data: MenuPreviewRendererProps; capabilities: TemplateCapabilities }) {
  const { menuSite } = data;
  const displayName = getDisplayName(menuSite);
  const menuCoverLabel = getMenuCoverLabel(menuSite);
  const featuredItem = getFeaturedItem(data, capabilities);
  const featuredPrice = featuredItem ? getFeaturedPrice(data, featuredItem, capabilities) : null;
  const customBadgeStyles = getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings);
  const featuredBadge = featuredItem && capabilities.itemBadges ? getMenuItemBadgeLabel(featuredItem) : null;
  const featuredBadgeStyle = featuredItem ? getBadgeStyleForItem(featuredItem, data.menuSite.template_key, customBadgeStyles) : null;

  return (
    <PreviewSection eyebrow="Menu Cover" title="메뉴 커버">
      <div className={`grid gap-5 rounded-lg bg-zinc-950 p-6 text-white ${featuredItem ? "lg:grid-cols-[0.95fr_1.05fr] lg:items-center" : ""}`}>
        <div>
          {menuCoverLabel && <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">{menuCoverLabel}</p>}
          <h3 className="mt-3 break-keep text-3xl font-black tracking-tight">{menuSite.menu_cover_title || `${displayName} 메뉴`}</h3>
          {menuSite.menu_cover_description && (
            <p className="mt-4 break-keep text-sm font-semibold leading-relaxed text-white/65">{menuSite.menu_cover_description}</p>
          )}
        </div>
        {featuredItem && (
          <article className="overflow-hidden rounded-lg bg-white text-zinc-950">
            <img src={featuredItem.image_url ?? ""} alt={featuredItem.name} className="aspect-[16/10] w-full object-cover" />
            <div className="p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-black text-white">대표 추천</span>
                {featuredBadge && featuredBadgeStyle && (
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={getBadgeStyleCss(featuredBadgeStyle)}>
                    {featuredBadge}
                  </span>
                )}
              </div>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h4 className="break-keep text-xl font-black tracking-tight">{featuredItem.name}</h4>
                  {featuredItem.description && <p className="mt-2 line-clamp-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{featuredItem.description}</p>}
                </div>
                {featuredPrice && <p className="shrink-0 whitespace-nowrap text-sm font-black text-zinc-950">{featuredPrice}</p>}
              </div>
            </div>
          </article>
        )}
      </div>
    </PreviewSection>
  );
}

function MenuItemCard({
  item,
  priceOptions,
  traits,
  capabilities,
  templateKey,
  customBadgeStyles,
}: {
  item: MenuItem;
  priceOptions: MenuPageData["priceOptions"];
  traits: MenuPageData["traits"];
  capabilities: TemplateCapabilities;
  templateKey: string | null;
  customBadgeStyles: unknown;
}) {
  const price = formatMenuPrice(item);
  const portion = formatPortionLabel(item);
  const visiblePriceOptions = capabilities.priceOptions && item.price_visible !== false ? getItemPriceOptions(priceOptions, item.id) : [];
  const badgeLabel = capabilities.itemBadges ? getMenuItemBadgeLabel(item) : null;
  const badgeStyle = badgeLabel ? getBadgeStyleForItem(item, templateKey, customBadgeStyles) : null;
  const visibleTraits = capabilities.itemTraits && shouldShowMenuItemTraits(item, traits) ? traits.filter((trait) => trait.visible) : [];

  return (
    <article className="overflow-hidden rounded-lg border border-zinc-100 bg-white">
      {capabilities.menuItemImages && item.image_url && (
        <img src={item.image_url} alt={item.name} className="aspect-[16/10] w-full object-cover" loading="lazy" />
      )}
      <div className="p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            {badgeLabel && badgeStyle && (
              <span className="mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black" style={getBadgeStyleCss(badgeStyle)}>
                {badgeLabel}
              </span>
            )}
            {item.set_name && <p className="mb-1 text-xs font-black text-zinc-400">{item.set_name}</p>}
            <h5 className="break-keep text-lg font-black text-zinc-950">{item.name}</h5>
            {item.description && <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{item.description}</p>}
          </div>
          {price && visiblePriceOptions.length === 0 && <p className="shrink-0 text-sm font-black text-zinc-950">{price}</p>}
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
        {capabilities.originInfo && item.origin_info && <p className="mt-3 break-keep text-xs font-semibold leading-relaxed text-zinc-400">원산지 {item.origin_info}</p>}
      </div>
    </article>
  );
}

function MenuPagesSection({ data, capabilities }: { data: MenuPreviewRendererProps; capabilities: TemplateCapabilities }) {
  const customBadgeStyles = getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings);
  const hasVisibleMenu = data.pages.some((page) =>
    data.categories.some((category) => category.menu_page_id === page.id && getCategoryItems(data.items, category.id).length > 0)
  );

  return (
    <PreviewSection eyebrow="Menu" title="메뉴">
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
                <h3 className="break-keep text-2xl font-black text-zinc-950">{page.title}</h3>
                {page.description_visible && page.description && <p className="mt-2 break-keep text-sm font-semibold text-zinc-500">{page.description}</p>}
                <div className="mt-5 space-y-5">
                  {categories.map((category) => {
                    const items = getCategoryItems(data.items, category.id);

                    if (items.length === 0) {
                      return null;
                    }

                    return (
                      <section key={category.id}>
                        <h4 className="text-lg font-black text-zinc-900">{category.name}</h4>
                        {category.description_visible && category.description && (
                          <p className="mt-1 break-keep text-sm font-semibold text-zinc-500">{category.description}</p>
                        )}
                        <div className="mt-3 space-y-3">
                          {items.map((item) => (
                            <MenuItemCard
                              key={item.id}
                              item={item}
                              priceOptions={data.priceOptions}
                              traits={getItemTraits(data.traits, item.id)}
                              capabilities={capabilities}
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
    </PreviewSection>
  );
}

function AboutSection({ data }: { data: MenuPreviewRendererProps }) {
  const { menuSite } = data;

  return (
    <PreviewSection eyebrow="About" title="소개">
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
    </PreviewSection>
  );
}

function ChefsSection({ data }: { data: MenuPreviewRendererProps }) {
  if (data.chefs.length === 0) {
    return null;
  }

  return (
    <PreviewSection eyebrow="People" title="셰프 / 인물">
      <div className="grid gap-4">
        {data.chefs.map((chef) => (
          <article key={chef.id} className="flex gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            {chef.chef_image_url && <img src={chef.chef_image_url} alt={chef.chef_name} className="h-20 w-20 rounded-lg object-cover" />}
            <div>
              <h3 className="text-lg font-black text-zinc-950">{chef.chef_name}</h3>
              {chef.chef_role && <p className="mt-1 text-sm font-black text-zinc-400">{chef.chef_role}</p>}
              {chef.chef_description && <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{chef.chef_description}</p>}
            </div>
          </article>
        ))}
      </div>
    </PreviewSection>
  );
}

function EventsSection({ data }: { data: MenuPreviewRendererProps }) {
  if (data.events.length === 0) {
    return null;
  }

  return (
    <PreviewSection eyebrow="Events" title="이벤트">
      <div className="grid gap-4">
        {data.events.map((event) => (
          <article key={event.id} className="overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
            {event.event_image_url && <img src={event.event_image_url} alt={event.event_title ?? ""} className="aspect-[16/9] w-full object-cover" />}
            <div className="p-4">
              {event.event_period && <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{event.event_period}</p>}
              <h3 className="break-keep text-xl font-black text-zinc-950">{event.event_title || "이벤트"}</h3>
              {event.event_subtitle && <p className="mt-1 break-keep text-sm font-black text-zinc-500">{event.event_subtitle}</p>}
              {event.event_description && <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{event.event_description}</p>}
              {event.event_price_visible && (event.event_regular_price_label || event.event_sale_price_label) && (
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-black">
                  {event.event_regular_price_label && <span className="rounded-full bg-white px-3 py-1 text-zinc-400">{event.event_regular_price_label}</span>}
                  {event.event_sale_price_label && <span className="rounded-full bg-zinc-950 px-3 py-1 text-white">{event.event_sale_price_label}</span>}
                </div>
              )}
              {event.event_benefit && <p className="mt-3 break-keep text-sm font-bold text-emerald-700">{event.event_benefit}</p>}
              {event.event_detail && <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-400">{event.event_detail}</p>}
            </div>
          </article>
        ))}
      </div>
    </PreviewSection>
  );
}

function SocialLinksSection({ data }: { data: MenuPreviewRendererProps }) {
  if (data.socialLinks.length === 0) {
    return null;
  }

  return (
    <PreviewSection eyebrow="Social" title="SNS">
      <div className="flex flex-wrap gap-2">
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
    </PreviewSection>
  );
}

export default function MenuPreviewRenderer(data: MenuPreviewRendererProps) {
  const { pageSettings } = data;
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const publicCapabilities = getMenuPublicCapabilities(data.publicServiceType);
  const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(data.menuSite.template_key, customTypography);
  const koreanFontAssets = getKoreanFontLoadAssets(typographySettings.korean_font_key);
  const englishFontAssets = getEnglishFontLoadAssets(typographySettings.english_font_key);
  const shouldRenderMenuCover =
    publicCapabilities.menuCoverPage &&
    capabilities.menuCover.coverMode !== "none" &&
    pageSettings.menu_cover_enabled !== false;

  return (
    <>
      <KoreanFontAssets assets={[koreanFontAssets, englishFontAssets]} />
      <div className="menu-typography bg-zinc-50" style={getTypographyCssVariables(typographySettings)}>
        {publicCapabilities.introPage && pageSettings.intro_enabled && <IntroSection data={data} />}
        {shouldRenderMenuCover && <MenuCoverSection data={data} capabilities={capabilities} />}
        {publicCapabilities.menuPages && <MenuPagesSection data={data} capabilities={capabilities} />}
        {publicCapabilities.aboutPage && pageSettings.about_enabled && <AboutSection data={data} />}
        {publicCapabilities.chefs && capabilities.chefs && pageSettings.chefs_enabled && <ChefsSection data={data} />}
        {publicCapabilities.eventPage && capabilities.events && pageSettings.events_enabled && <EventsSection data={data} />}
        {publicCapabilities.socialLinks && capabilities.socialLinks && pageSettings.social_links_enabled && <SocialLinksSection data={data} />}
      </div>
    </>
  );
}
