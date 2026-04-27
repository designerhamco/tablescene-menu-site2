/* eslint-disable @next/next/no-img-element */
import type { PublicMenuItem, PublicMenuTemplateProps } from "./types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function getItemsByCategory(items: PublicMenuItem[], categoryId: string) {
  return items.filter((item) => item.category_id === categoryId);
}

export default function DesignA({ menuSite, categories, items, socialLinks }: PublicMenuTemplateProps) {
  const uncategorizedItems = items.filter((item) => !item.category_id);
  const brandColor = menuSite.brand_color || "#18181b";
  const heroImage = menuSite.cover_image_url;

  return (
    <main className="min-h-screen bg-[#f6f2ea] text-zinc-950">
      <div className="mx-auto min-h-screen w-full max-w-[520px] bg-[#fbfaf6] shadow-2xl shadow-zinc-900/10">
        <section className="relative overflow-hidden bg-zinc-950 px-6 pb-8 pt-8 text-white">
          {heroImage ? (
            <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_34%),linear-gradient(135deg,_#18181b,_#3f3f46)]" />
          )}
          <div className="absolute inset-0 bg-black/35" />

          <div className="relative z-10">
            <div className="mb-14 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {menuSite.logo_url ? (
                  <img src={menuSite.logo_url} alt={`${menuSite.name} logo`} className="h-11 w-11 rounded-full object-cover ring-1 ring-white/30" />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white ring-1 ring-white/30"
                    style={{ backgroundColor: brandColor }}
                  >
                    {menuSite.name.slice(0, 1)}
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">TABLE SCENE MENU</p>
                  <p className="mt-1 text-sm font-bold text-white/85">/{menuSite.slug}</p>
                </div>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
                {menuSite.template_key}
              </span>
            </div>

            <h1 className="break-keep text-4xl font-black leading-[1.05] tracking-tight">{menuSite.business_name || menuSite.name}</h1>
            {menuSite.description && (
              <p className="mt-4 break-keep text-base font-medium leading-relaxed text-white/78">{menuSite.description}</p>
            )}

            {(menuSite.business_address || menuSite.business_phone) && (
              <div className="mt-6 space-y-2 rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-semibold text-white/80 backdrop-blur">
                {menuSite.business_address && <p>{menuSite.business_address}</p>}
                {menuSite.business_phone && <p>{menuSite.business_phone}</p>}
              </div>
            )}
          </div>
        </section>

        <section className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[#fbfaf6]/95 px-5 py-3 backdrop-blur">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#category-${category.id}`}
                className="shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-700 shadow-sm"
              >
                {category.name}
              </a>
            ))}
            {uncategorizedItems.length > 0 && (
              <a
                href="#category-uncategorized"
                className="shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-700 shadow-sm"
              >
                Other
              </a>
            )}
          </div>
        </section>

        <section className="space-y-8 px-5 py-7">
          {categories.map((category) => {
            const categoryItems = getItemsByCategory(items, category.id);

            if (categoryItems.length === 0) {
              return null;
            }

            return (
              <section key={category.id} id={`category-${category.id}`} className="scroll-mt-20">
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                    {String(category.sort_order).padStart(2, "0")}
                  </p>
                  <h2 className="text-2xl font-black tracking-tight">{category.name}</h2>
                  {category.description && (
                    <p className="mt-2 break-keep text-sm font-medium leading-relaxed text-zinc-500">{category.description}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {categoryItems.map((item) => (
                    <MenuItemCard key={item.id} item={item} brandColor={brandColor} />
                  ))}
                </div>
              </section>
            );
          })}

          {uncategorizedItems.length > 0 && (
            <section id="category-uncategorized" className="scroll-mt-20">
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">ETC</p>
                <h2 className="text-2xl font-black tracking-tight">Other Menu</h2>
              </div>
              <div className="space-y-3">
                {uncategorizedItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} brandColor={brandColor} />
                ))}
              </div>
            </section>
          )}

          {items.length === 0 && (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-8 text-center">
              <h2 className="text-xl font-black">준비 중인 메뉴판입니다</h2>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                공개된 메뉴 아이템이 아직 없습니다.
              </p>
            </div>
          )}
        </section>

        <MenuFooter socialLinks={socialLinks} />
      </div>
    </main>
  );
}

function MenuItemCard({ item, brandColor }: { item: PublicMenuItem; brandColor: string }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm">
      {item.image_url && (
        <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {item.badge && (
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  {item.badge}
                </span>
              )}
              {item.is_best && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
                  Best
                </span>
              )}
              {item.is_sold_out && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  Sold Out
                </span>
              )}
            </div>
            <h3 className="break-keep text-lg font-black leading-tight">{item.name}</h3>
          </div>
          <p className="shrink-0 text-base font-black">{formatPrice(item.price)}원</p>
        </div>

        {item.description && (
          <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">{item.description}</p>
        )}
      </div>
    </article>
  );
}

function MenuFooter({ socialLinks }: Pick<PublicMenuTemplateProps, "socialLinks">) {
  return (
    <footer className="px-5 pb-8 pt-4 text-center">
      {socialLinks.length > 0 && (
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {socialLinks.map((link) => (
            <a key={link.id} href={link.url} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-500">
              {link.label}
            </a>
          ))}
        </div>
      )}
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-300">Powered by Table Scene</p>
    </footer>
  );
}
