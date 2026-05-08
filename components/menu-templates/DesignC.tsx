/* eslint-disable @next/next/no-img-element */
import { getBadgeLabel, getMenuItemBadgeType, shouldShowBadge } from "@/lib/menu-badges";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { formatMenuPrice } from "@/types/menu";

import type { PublicMenuItem, PublicMenuTemplateProps } from "./types";

function getCategoriesByPage(categories: PublicMenuTemplateProps["categories"], pageId: string) {
  return categories.filter((category) => category.menu_page_id === pageId);
}

export default function DesignC({ menuSite, pages, categories, items, chefs, socialLinks }: PublicMenuTemplateProps) {
  const brandColor = menuSite.brand_color || "#f8fafc";
  const hasMenuContent = pages.some((page) =>
    getCategoriesByPage(categories, page.id).some((category) => items.some((item) => item.category_id === category.id))
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto min-h-screen w-full max-w-[540px] bg-zinc-950">
        <section className="relative min-h-[440px] overflow-hidden px-6 pb-10 pt-8">
          {menuSite.cover_image_url ? (
            <img src={menuSite.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,_rgba(255,255,255,0.18),_transparent_28%),linear-gradient(145deg,_#18181b,_#09090b)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-zinc-950/40 to-zinc-950" />

          <div className="relative z-10 flex min-h-[380px] flex-col">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/50">Premium Dining</p>
              <p className="break-all text-xs font-bold text-white/60">{getPublicMenuUrl(menuSite.slug)}</p>
            </div>
            <div className="mt-auto">
              <p className="mb-4 h-px w-16 bg-white/40" />
              <h1 className="break-keep text-5xl font-black leading-[0.95] tracking-tight">{menuSite.business_name || menuSite.name}</h1>
              {menuSite.description && <p className="mt-5 break-keep text-base font-medium leading-relaxed text-white/65">{menuSite.description}</p>}
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-20 border-y border-white/10 bg-zinc-950/90 px-6 py-3 backdrop-blur">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto">
            {pages.map((page) => (
              <a key={page.id} href={`#page-${page.id}`} className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/70">
                {page.title}
              </a>
            ))}
          </div>
        </section>

        <section className="space-y-12 px-6 py-10">
          {pages.map((page) => {
            const pageCategories = getCategoriesByPage(categories, page.id);
            const pageHasItems = pageCategories.some((category) => items.some((item) => item.category_id === category.id));

            if (!pageHasItems) {
              return null;
            }

            return (
              <section key={page.id} id={`page-${page.id}`} className="scroll-mt-20">
                <div className="mb-6">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
                    {String(page.sort_order).padStart(2, "0")}
                  </p>
                  <h2 className="font-serif text-3xl font-black tracking-tight">{page.title}</h2>
                  {page.description_visible && page.description && <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-white/50">{page.description}</p>}
                </div>
                <div className="space-y-8">
                  {pageCategories.map((category) => {
                    const categoryItems = items.filter((item) => item.category_id === category.id);

                    if (categoryItems.length === 0) {
                      return null;
                    }

                    return (
                      <section key={category.id}>
                        <div className="mb-3">
                          <h3 className="text-xl font-black tracking-tight">{category.name}</h3>
                          {category.description_visible && category.description && (
                            <p className="mt-2 break-keep text-sm font-medium leading-relaxed text-white/50">{category.description}</p>
                          )}
                        </div>
                        <div className="divide-y divide-white/10">
                          {categoryItems.map((item) => (
                            <PremiumItemRow key={item.id} item={item} brandColor={brandColor} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {chefs.length > 0 && (
            <section className="rounded-[2rem] border border-white/10 p-5">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Chef</p>
              <div className="space-y-4">
                {chefs.map((chef) => (
                  <article key={chef.id} className="flex gap-4">
                    {chef.chef_image_url && <img src={chef.chef_image_url} alt={chef.chef_name} className="h-14 w-14 rounded-full object-cover" />}
                    <div>
                      <p className="text-sm font-black">{chef.chef_name}</p>
                      {chef.chef_role && <p className="mt-1 text-xs font-bold text-white/45">{chef.chef_role}</p>}
                      {chef.chef_description && <p className="mt-2 break-keep text-sm font-medium leading-relaxed text-white/55">{chef.chef_description}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {!hasMenuContent && (
            <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
              <h2 className="text-xl font-black">준비 중인 메뉴판입니다</h2>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-white/50">표시할 메뉴 페이지, 카테고리 또는 아이템이 아직 없습니다.</p>
            </div>
          )}
        </section>

        <Footer socialLinks={socialLinks} />
      </div>
    </main>
  );
}

function PremiumItemRow({ item, brandColor }: { item: PublicMenuItem; brandColor: string }) {
  const badgeLabel = getBadgeLabel(getMenuItemBadgeType(item));
  const price = formatMenuPrice(item);

  return (
    <article className="py-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {shouldShowBadge(item) && (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: brandColor }}>
                {badgeLabel}
              </span>
            )}
            {item.is_sold_out && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Sold Out</span>}
          </div>
          {item.set_name && <p className="mb-1 break-keep text-xs font-black text-white/40">{item.set_name}</p>}
          <h3 className="break-keep text-lg font-black leading-tight">{item.name}</h3>
          {item.description && <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-white/50">{item.description}</p>}
          {item.origin_info && (
            <p className="mt-3 break-keep break-words text-xs font-medium leading-relaxed text-white/35">
              <span className="font-black text-white/55">원산지</span> {item.origin_info}
            </p>
          )}
        </div>
        {price && <p className="shrink-0 text-sm font-black text-white/80">{price}</p>}
      </div>
    </article>
  );
}

function Footer({ socialLinks }: Pick<PublicMenuTemplateProps, "socialLinks">) {
  return (
    <footer className="px-6 pb-8 text-center">
      {socialLinks.length > 0 && (
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {socialLinks.map((link) => (
            <a key={link.id} href={link.url} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/60">
              {link.display_name || link.label}
            </a>
          ))}
        </div>
      )}
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">Powered by Table Scene</p>
    </footer>
  );
}
