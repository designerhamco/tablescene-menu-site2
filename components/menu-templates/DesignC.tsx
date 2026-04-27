/* eslint-disable @next/next/no-img-element */
import type { PublicMenuItem, PublicMenuTemplateProps } from "./types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

export default function DesignC({ menuSite, categories, items, chefs, socialLinks }: PublicMenuTemplateProps) {
  const brandColor = menuSite.brand_color || "#f8fafc";

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
              <p className="text-xs font-bold text-white/60">/{menuSite.slug}</p>
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
            {categories.map((category) => (
              <a key={category.id} href={`#category-${category.id}`} className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/70">
                {category.name}
              </a>
            ))}
          </div>
        </section>

        <section className="space-y-12 px-6 py-10">
          {categories.map((category) => {
            const categoryItems = items.filter((item) => item.category_id === category.id);

            if (categoryItems.length === 0) {
              return null;
            }

            return (
              <section key={category.id} id={`category-${category.id}`} className="scroll-mt-20">
                <div className="mb-6">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
                    {String(category.sort_order).padStart(2, "0")}
                  </p>
                  <h2 className="font-serif text-3xl font-black tracking-tight">{category.name}</h2>
                  {category.description && <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-white/50">{category.description}</p>}
                </div>
                <div className="divide-y divide-white/10">
                  {categoryItems.map((item) => (
                    <PremiumItemRow key={item.id} item={item} brandColor={brandColor} />
                  ))}
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
                    {chef.image_url && <img src={chef.image_url} alt={chef.name} className="h-14 w-14 rounded-full object-cover" />}
                    <div>
                      <p className="text-sm font-black">{chef.name}</p>
                      {chef.role && <p className="mt-1 text-xs font-bold text-white/45">{chef.role}</p>}
                      {chef.bio && <p className="mt-2 break-keep text-sm font-medium leading-relaxed text-white/55">{chef.bio}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {items.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
              <h2 className="text-xl font-black">준비 중인 메뉴판입니다</h2>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-white/50">공개된 메뉴 아이템이 아직 없습니다.</p>
            </div>
          )}
        </section>

        <Footer socialLinks={socialLinks} />
      </div>
    </main>
  );
}

function PremiumItemRow({ item, brandColor }: { item: PublicMenuItem; brandColor: string }) {
  return (
    <article className="py-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {item.badge && (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: brandColor }}>
                {item.badge}
              </span>
            )}
            {item.is_best && <span className="rounded-full border border-amber-200/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">Signature</span>}
            {item.is_sold_out && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Sold Out</span>}
          </div>
          <h3 className="break-keep text-lg font-black leading-tight">{item.name}</h3>
          {item.description && <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-white/50">{item.description}</p>}
        </div>
        <p className="shrink-0 text-sm font-black text-white/80">{formatPrice(item.price)}원</p>
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
              {link.label}
            </a>
          ))}
        </div>
      )}
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">Powered by Table Scene</p>
    </footer>
  );
}
