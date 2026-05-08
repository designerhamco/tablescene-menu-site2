/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

import ImagePlaceholder from "@/components/menu-templates/shared/ImagePlaceholder";
import MenuGnb from "@/components/menu-templates/shared/MenuGnb";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { getMenuItemBadgeLabel } from "@/lib/menu-badges";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
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
    .filter((option) => option.menu_item_id === itemId && option.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MENU_LIMITS.maxPriceOptionsPerItem);
}

function formatPriceOption(option: PublicMenuTemplateProps["priceOptions"][number]) {
  if (option.price_label) return option.price_label;
  if (typeof option.price === "number") return new Intl.NumberFormat("ko-KR").format(option.price) + "원";
  return "";
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

  return (
    <section className="bg-zinc-950 px-5 py-12 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {menuSite.cover_image_url ? (
            <img src={menuSite.cover_image_url} alt="" className="h-64 w-full object-cover opacity-80" />
          ) : (
            <ImagePlaceholder className="h-64 w-full rounded-none border-0 bg-white/5 text-white/25" iconClassName="h-24 w-24" />
          )}
          <div className="p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">{menuSite.restaurant_category || "Restaurant"}</p>
            <h1 className="mt-3 break-words text-4xl font-black tracking-tight">{menuSite.intro_title || displayName}</h1>
            {(menuSite.intro_description || menuSite.brand_description) && (
              <div className="mt-5 space-y-3 break-keep text-sm font-semibold leading-relaxed text-white/70">
                {menuSite.intro_description && <p className="break-words">{menuSite.intro_description}</p>}
                {menuSite.brand_description && <p className="break-words">{menuSite.brand_description}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MenuCoverSection({ data }: { data: PublicMenuTemplateProps }) {
  const { menuSite } = data;
  const displayName = getDisplayName(menuSite);

  return (
    <Section eyebrow="Menu" title={menuSite.menu_cover_title || `${displayName} 메뉴`}>
      <div className="flex min-h-48 flex-col justify-center rounded-lg border border-zinc-100 bg-zinc-50 p-6">
        {menuSite.cover_image_url && <img src={menuSite.cover_image_url} alt="" className="mb-5 aspect-[16/9] w-full rounded-lg object-cover" />}
        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{menuSite.restaurant_category || "Menu"}</p>
        {menuSite.menu_cover_description && (
          <p className="mt-4 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{menuSite.menu_cover_description}</p>
        )}
      </div>
    </Section>
  );
}

function MenuItemCard({
  item,
  priceOptions,
  traits,
}: {
  item: MenuItem;
  priceOptions: PublicMenuTemplateProps["priceOptions"];
  traits: PublicMenuTemplateProps["traits"];
}) {
  const price = formatMenuPrice(item);
  const portion = formatPortionLabel(item);
  const visiblePriceOptions = item.price_visible ? getItemPriceOptions(priceOptions, item.id) : [];
  const badgeLabel = getMenuItemBadgeLabel(item);
  const visibleTraits = shouldShowMenuItemTraits(item, traits)
    ? traits
        .filter((trait) => trait.visible)
        .sort((a, b) => a.sort_order - b.sort_order)
        .slice(0, MENU_LIMITS.maxTraitsPerItem)
    : [];

  return (
    <article className="overflow-hidden rounded-lg border border-zinc-100 bg-white">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="aspect-[16/10] w-full object-cover" loading="lazy" />
      ) : (
        <ImagePlaceholder />
      )}
      <div className="p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {badgeLabel && <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-black text-white">{badgeLabel}</span>}
              {item.is_sold_out && <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-black text-zinc-500">품절</span>}
            </div>
            {item.set_name && <p className="mb-1 text-xs font-black text-zinc-400">{item.set_name}</p>}
            <h3 className="line-clamp-2 break-words text-lg font-black text-zinc-950">{item.name}</h3>
            {item.description && <p className="mt-2 line-clamp-3 break-words text-sm font-semibold leading-relaxed text-zinc-500">{item.description}</p>}
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
        {item.origin_info && <p className="mt-3 line-clamp-2 break-words text-xs font-semibold leading-relaxed text-zinc-400">원산지 {item.origin_info}</p>}
      </div>
    </article>
  );
}

function MenuPagesSection({ data }: { data: PublicMenuTemplateProps }) {
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
                        <div className="mt-3 space-y-3">
                          {items.map((item) => (
                            <MenuItemCard
                              key={item.id}
                              item={item}
                              priceOptions={data.priceOptions}
                              traits={getItemTraits(data.traits, item.id)}
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

function AboutSection({ data }: { data: PublicMenuTemplateProps }) {
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
          { label: "카테고리", value: menuSite.restaurant_category },
          { label: "주소", value: menuSite.restaurant_address || menuSite.business_address },
          { label: "전화번호", value: menuSite.restaurant_phone || menuSite.business_phone },
          { label: "운영시간", value: menuSite.opening_hours },
          { label: "지도", value: menuSite.map_url, href: menuSite.map_url },
        ]}
      />
      {data.chefs.length > 0 && (
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
      {data.socialLinks.length > 0 && (
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

  return (
    <div className="bg-zinc-50 text-zinc-950">
      {pageSettings.intro_enabled && <IntroSection data={data} />}
      <MenuGnb site={data.menuSite} />
      {pageSettings.menu_cover_enabled && <MenuCoverSection data={data} />}
      <MenuPagesSection data={data} />
      {pageSettings.about_enabled && <AboutSection data={data} />}
      <EventsSection data={data} />
    </div>
  );
}
