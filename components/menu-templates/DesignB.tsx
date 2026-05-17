/* eslint-disable @next/next/no-img-element */
import { getMenuItemBadgeLabel, shouldShowBadge } from "@/lib/menu-badges";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { formatMenuPrice } from "@/types/menu";

import type { PublicMenuItem, PublicMenuTemplateProps } from "./types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function getCategoriesByPage(categories: PublicMenuTemplateProps["categories"], pageId: string) {
  return categories.filter((category) => category.menu_page_id === pageId);
}

export default function DesignB({ menuSite, pages, categories, items, events, socialLinks }: PublicMenuTemplateProps) {
  const brandColor = menuSite.brand_color || "#d97706";
  const heroItems = items.filter((item) => item.image_url).slice(0, 3);
  const hasMenuContent = pages.some((page) =>
    getCategoriesByPage(categories, page.id).some((category) => items.some((item) => item.category_id === category.id))
  );

  return (
    <main className="min-h-screen bg-[#fff7ed] text-zinc-950">
      <div className="mx-auto min-h-screen w-full max-w-[560px] bg-[#fffbf5]">
        <section className="px-5 pb-6 pt-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-zinc-950 p-5 text-white shadow-2xl shadow-orange-900/20">
            {menuSite.cover_image_url && <img src={menuSite.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/15" />
            <div className="relative z-10 min-h-72">
              <div className="flex items-center justify-between gap-4">
                <p className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur">
                  Visual Menu
                </p>
                <p className="break-all text-xs font-bold text-white/70">{getPublicMenuUrl(menuSite.slug)}</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0">
                <h1 className="break-keep text-4xl font-black leading-[1.02] tracking-tight">{menuSite.business_name || menuSite.name}</h1>
                {menuSite.description && <p className="mt-4 break-keep text-sm font-semibold leading-relaxed text-white/78">{menuSite.description}</p>}
              </div>
            </div>
          </div>
        </section>

        {heroItems.length > 0 && (
          <section className="px-5 pb-4">
            <div className="scrollbar-hide flex gap-3 overflow-x-auto">
              {heroItems.map((item) => (
                <article key={item.id} className="w-44 shrink-0 overflow-hidden rounded-3xl bg-white shadow-sm">
                  {item.image_url && <img src={item.image_url} alt={item.name} className="aspect-square w-full object-cover" />}
                  <div className="p-4">
                    <p className="line-clamp-1 text-sm font-black">{item.name}</p>
                    <p className="mt-1 text-xs font-bold text-zinc-400">{formatPrice(item.price)}원</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="sticky top-0 z-20 border-y border-orange-100 bg-[#fffbf5]/95 px-5 py-3 backdrop-blur">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto">
            {pages.map((page) => (
              <a key={page.id} href={`#page-${page.id}`} className="shrink-0 rounded-full bg-orange-100 px-4 py-2 text-xs font-black text-orange-800">
                {page.title}
              </a>
            ))}
          </div>
        </section>

        <section className="space-y-7 px-5 py-7">
          {pages.map((page) => {
            const pageCategories = getCategoriesByPage(categories, page.id);
            const pageHasItems = pageCategories.some((category) => items.some((item) => item.category_id === category.id));

            if (!pageHasItems) {
              return null;
            }

            return (
              <section key={page.id} id={`page-${page.id}`} className="scroll-mt-20">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-500">Page</p>
                    <h2 className="text-2xl font-black tracking-tight">{page.title}</h2>
                    {page.description_visible && page.description && <p className="mt-2 break-keep text-sm font-semibold text-orange-900/60">{page.description}</p>}
                  </div>
                </div>
                <div className="space-y-5">
                  {pageCategories.map((category) => {
                    const categoryItems = items.filter((item) => item.category_id === category.id);

                    if (categoryItems.length === 0) {
                      return null;
                    }

                    return (
                      <section key={category.id}>
                        <div className="mb-3 flex items-end justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-black">{category.name}</h3>
                            {category.description_visible && category.description && (
                              <p className="mt-1 break-keep text-sm font-medium text-orange-900/60">{category.description}</p>
                            )}
                          </div>
                          <span className="text-xs font-black text-zinc-300">{categoryItems.length} items</span>
                        </div>
                        <div className="grid gap-3">
                          {categoryItems.map((item) => (
                            <VisualItemCard key={item.id} item={item} brandColor={brandColor} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {events.length > 0 && (
            <section className="rounded-[2rem] bg-orange-100 p-5">
              <h2 className="text-xl font-black">Event</h2>
              <div className="mt-4 space-y-3">
                {events.map((event) => (
                  <article key={event.id}>
                    <p className="text-sm font-black">{event.event_title}</p>
                    {event.event_description && <p className="mt-1 break-keep text-sm font-medium text-orange-900/70">{event.event_description}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {!hasMenuContent && (
            <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-8 text-center">
              <h2 className="text-xl font-black">준비 중인 메뉴판입니다</h2>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">표시할 메뉴 페이지, 카테고리 또는 아이템이 아직 없습니다.</p>
            </div>
          )}
        </section>

        <Footer socialLinks={socialLinks} />
      </div>
    </main>
  );
}

function VisualItemCard({ item, brandColor }: { item: PublicMenuItem; brandColor: string }) {
  const badgeLabel = getMenuItemBadgeLabel(item);
  const price = formatMenuPrice(item);

  return (
    <article className="grid grid-cols-[88px_1fr] overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="bg-orange-50">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-full min-h-28 w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full min-h-28 w-full" style={{ backgroundColor: `${brandColor}22` }} />
        )}
      </div>
      <div className="p-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {shouldShowBadge(item) && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700">{badgeLabel}</span>}
          {item.is_sold_out && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-500">Sold Out</span>}
        </div>
        {item.set_name && <p className="mb-1 break-keep text-xs font-black text-orange-700/70">{item.set_name}</p>}
        <div className="flex items-start justify-between gap-3">
          <h3 className="break-keep text-base font-black leading-tight">{item.name}</h3>
          {price && <p className="shrink-0 text-sm font-black">{price}</p>}
        </div>
        {item.description && <p className="mt-2 line-clamp-2 break-keep text-xs font-medium leading-relaxed text-zinc-500">{item.description}</p>}
        {item.origin_info && (
          <p className="mt-2 break-keep break-words text-[11px] font-semibold leading-relaxed text-zinc-400">
            <span className="font-black text-zinc-500">원산지</span> {item.origin_info}
          </p>
        )}
      </div>
    </article>
  );
}

function Footer({ socialLinks }: Pick<PublicMenuTemplateProps, "socialLinks">) {
  return (
    <footer className="px-5 pb-8 text-center">
      {socialLinks.length > 0 && (
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {socialLinks.map((link) => (
            <a key={link.id} href={link.url} className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-800">
              {link.display_name || link.label}
            </a>
          ))}
        </div>
      )}
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">Powered by Table Scene</p>
    </footer>
  );
}
