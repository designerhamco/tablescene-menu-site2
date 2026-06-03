"use client";

import { useMemo, useState } from "react";

import {
  normalizeMenuPageDisplaySettings,
  type MenuPageDisplaySettings,
} from "@/lib/display-page-settings";
import { getMenuItemBadgeLabel } from "@/lib/menu-badges";
import { formatMenuPrice, sortMenuPages } from "@/types/menu";

import type { PublicMenuTemplateProps } from "./types";

type DisplayPage = PublicMenuTemplateProps["pages"][number];
type DisplayCategory = PublicMenuTemplateProps["categories"][number];
type DisplayItem = PublicMenuTemplateProps["items"][number];
type DisplayPriceOption = PublicMenuTemplateProps["priceOptions"][number];
type DisplayPriceRow = {
  label: string | null;
  price: string;
};

const numberFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

function sortByOrder<T extends { sort_order: number }>(rows: T[]) {
  return [...rows].sort((left, right) => left.sort_order - right.sort_order);
}

function getDisplayName(site: PublicMenuTemplateProps["menuSite"]) {
  return site.restaurant_name || site.business_name || site.name || "";
}

function normalizeDisplayText(value: string | null | undefined) {
  return value?.trim() || null;
}

function getPriceOptionRow(option: DisplayPriceOption): DisplayPriceRow | null {
  const label = normalizeDisplayText(option.label);
  const price = option.price_label?.trim() || (typeof option.price === "number" ? numberFormatter.format(option.price) : "");

  if (!label && !price) return null;
  if (!price && label) return { label: null, price: label };

  return {
    label,
    price,
  };
}

function getItemPriceRows(item: DisplayItem, priceOptions: DisplayPriceOption[]): DisplayPriceRow[] {
  if (item.price_visible === false) return [];

  const options = sortByOrder(priceOptions.filter((option) => option.menu_item_id === item.id && option.visible));
  if (options.length > 0) return options.map(getPriceOptionRow).filter((row): row is DisplayPriceRow => Boolean(row));

  const price = formatMenuPrice(item);
  if (!price) return [];

  return [
    {
      label: item.portion_visible === false ? null : normalizeDisplayText(item.portion_label),
      price,
    },
  ];
}

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const videoId = parsed.hostname.includes("youtu.be")
      ? parsed.pathname.replace("/", "")
      : parsed.hostname.includes("youtube.com")
        ? parsed.searchParams.get("v")
        : null;

    return videoId ? `https://www.youtube.com/embed/${videoId}?mute=1&playsinline=1&loop=1&playlist=${videoId}` : null;
  } catch {
    return null;
  }
}

function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function EmptyDisplayPage() {
  return (
    <div
      className="h-full rounded-[2rem] border border-[#d6dfd7]/15 bg-[radial-gradient(circle_at_30%_20%,rgba(214,223,215,0.08),transparent_30%),linear-gradient(135deg,rgba(236,238,236,0.05),rgba(236,238,236,0.015))]"
      aria-hidden="true"
    />
  );
}

function MenuItemRow({
  item,
  priceOptions,
}: {
  item: DisplayItem;
  priceOptions: DisplayPriceOption[];
}) {
  const badge = getMenuItemBadgeLabel(item);
  const priceRows = getItemPriceRows(item, priceOptions);

  return (
    <div className="min-w-0 rounded-[1.35rem] border border-[#d6dfd7]/15 bg-[#f5f3e8]/[0.065] px-[clamp(18px,1.45vw,30px)] py-[clamp(16px,1.1vw,24px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(clamp(132px,14vw,260px),auto)] items-start gap-[clamp(18px,1.6vw,34px)]">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h4 className="min-w-0 break-keep text-[clamp(28px,2.25vw,48px)] font-black leading-[1.08] tracking-normal text-[#f4f0dc]">
              {item.name}
            </h4>
            {badge && (
              <span className="rounded-full border border-[#d9e37a]/40 bg-[#d9e37a] px-3 py-1 text-[clamp(16px,0.9vw,20px)] font-black uppercase tracking-[0.08em] text-[#172019]">
                {badge}
              </span>
            )}
          </div>
          {item.set_name && (
            <p className="mt-1 truncate text-[clamp(18px,1.2vw,24px)] font-bold uppercase tracking-[0.08em] text-[#c9d5c8]/75">
              {item.set_name}
            </p>
          )}
        </div>
        {priceRows.length > 0 && (
          <div className="grid shrink-0 justify-items-end gap-1 text-right">
            {priceRows.map((row, index) => (
              <div key={`${row.label ?? "price"}-${row.price}-${index}`} className="grid grid-cols-[auto_auto] items-baseline gap-x-3">
                {row.label ? (
                  <span className="whitespace-nowrap text-[clamp(16px,1vw,22px)] font-black uppercase tracking-[0.08em] text-[#c9d5c8]/70">
                    {row.label}
                  </span>
                ) : null}
                <span className="whitespace-nowrap text-[clamp(30px,2.35vw,52px)] font-black leading-[1.05] text-[#d9e37a]">
                  {row.price}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {item.description && (
        <p className="mt-3 line-clamp-2 break-keep text-[clamp(18px,1.32vw,28px)] font-semibold leading-snug text-[#e6e2d1]/58">
          {item.description}
        </p>
      )}
    </div>
  );
}

function CategoryBlock({
  category,
  items,
  priceOptions,
}: {
  category: DisplayCategory;
  items: DisplayItem[];
  priceOptions: DisplayPriceOption[];
}) {
  return (
    <section className="min-w-0">
      <div className="mb-[clamp(14px,1.1vw,24px)] border-b border-[#d9e37a]/42 pb-3">
        <h3 className="break-keep text-[clamp(34px,3.05vw,64px)] font-black leading-none tracking-normal text-[#d9e37a]">
          {category.name}
        </h3>
        {category.description_visible && category.description ? (
          <p className="mt-2 line-clamp-1 break-keep text-[clamp(18px,1.15vw,24px)] font-semibold text-[#e6e2d1]/55">
            {category.description}
          </p>
        ) : null}
      </div>
      <div className="grid gap-[clamp(12px,0.9vw,20px)]">
        {items.map((item) => (
          <MenuItemRow key={item.id} item={item} priceOptions={priceOptions} />
        ))}
      </div>
    </section>
  );
}

function MenuList({
  page,
  categories,
  items,
  priceOptions,
  columns = "auto",
}: {
  page: DisplayPage;
  categories: DisplayCategory[];
  items: DisplayItem[];
  priceOptions: DisplayPriceOption[];
  columns?: "auto" | "single";
}) {
  const categoriesForPage = sortByOrder(categories.filter((category) => category.menu_page_id === page.id && category.visible));
  const categoryBlocks = categoriesForPage
    .map((category) => ({
      category,
      items: sortByOrder(items.filter((item) => item.category_id === category.id && item.visible)),
    }))
    .filter((group) => group.items.length > 0);

  if (categoryBlocks.length === 0) {
    return <EmptyDisplayPage />;
  }

  const gridClassName = columns === "single"
    ? "grid-cols-1"
    : categoryBlocks.length <= 1
      ? "grid-cols-1"
      : "grid-cols-2";

  return (
    <div
      className={`grid h-full min-h-0 content-start gap-[clamp(22px,1.9vw,40px)] overflow-hidden ${gridClassName}`}
      data-display-column-policy={columns === "single" ? "single" : "max-2"}
    >
      {categoryBlocks.map((group) => (
        <CategoryBlock
          key={group.category.id}
          category={group.category}
          items={group.items}
          priceOptions={priceOptions}
        />
      ))}
    </div>
  );
}

function SplitImagePanel({ settings }: { settings: MenuPageDisplaySettings }) {
  const { splitImage } = settings;
  const title = normalizeDisplayText(splitImage.title);
  const description = normalizeDisplayText(splitImage.description);
  const hasOverlay = Boolean(title || description);

  return (
    <aside className="relative min-h-0 overflow-hidden rounded-[1.8rem] border border-[#d6dfd7]/15 bg-[#f5f3e8]/[0.055]">
      {splitImage.url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={splitImage.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {hasOverlay ? <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-transparent" /> : null}
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(217,227,122,0.18),transparent_32%),linear-gradient(135deg,#16201a,#050807)]" aria-hidden="true" />
      )}
      {hasOverlay ? (
        <div className="relative flex h-full flex-col justify-end p-8">
          {title ? (
            <h3 className="break-keep text-[clamp(34px,3.8vw,72px)] font-black leading-none text-[#f4f0dc]">
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="mt-4 line-clamp-3 break-keep text-[clamp(18px,1.45vw,28px)] font-semibold leading-relaxed text-[#f4f0dc]/72">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function FullMenuPageView(props: {
  page: DisplayPage;
  categories: DisplayCategory[];
  items: DisplayItem[];
  priceOptions: DisplayPriceOption[];
}) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-[clamp(22px,1.8vw,34px)]">
      <div className="flex shrink-0 items-end justify-between gap-8">
        <div>
          <p className="text-[clamp(20px,1.5vw,30px)] font-black uppercase tracking-[0.14em] text-[#d9e37a]">{props.page.title}</p>
          {props.page.description_visible && props.page.description && (
            <p className="mt-2 max-w-4xl break-keep text-[clamp(18px,1.32vw,28px)] font-semibold leading-relaxed text-[#e6e2d1]/58">{props.page.description}</p>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <MenuList {...props} />
      </div>
    </section>
  );
}

function SplitMenuPageView(props: {
  page: DisplayPage;
  settings: MenuPageDisplaySettings;
  categories: DisplayCategory[];
  items: DisplayItem[];
  priceOptions: DisplayPriceOption[];
}) {
  return (
    <section className="grid h-full min-h-0 grid-cols-[40fr_60fr] gap-[clamp(24px,2vw,40px)]" data-display-split-ratio="40-60">
      <SplitImagePanel settings={props.settings} />
      <div className="min-h-0">
        <MenuList {...props} columns="single" />
      </div>
    </section>
  );
}

function VideoPromotion({ videoUrl }: { videoUrl: string }) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  if (isDirectVideoUrl(videoUrl)) {
    return (
      <video
        src={videoUrl}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  if (embedUrl) {
    // TODO: YouTube/Vimeo autoplay loop behavior depends on the provider's iframe policy.
    return (
      <iframe
        src={embedUrl}
        title="프로모션 영상"
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
      <span className="sr-only">{videoUrl}</span>
    </div>
  );
}

function PromotionPageView({ settings }: { settings: MenuPageDisplaySettings }) {
  const { promotion } = settings;
  const hasImage = promotion.mediaType === "image" && Boolean(promotion.mediaUrl);
  const hasVideo = promotion.mediaType === "video" && Boolean(promotion.videoUrl);
  const title = normalizeDisplayText(promotion.title);
  const description = normalizeDisplayText(promotion.description);
  const hasOverlay = Boolean(title || description);

  return (
    <section className="relative h-full w-full overflow-hidden bg-zinc-950">
      {hasImage && promotion.mediaUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={promotion.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {hasOverlay ? <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/82 via-zinc-950/24 to-zinc-950/12" /> : null}
        </>
      ) : hasVideo && promotion.videoUrl ? (
        <VideoPromotion videoUrl={promotion.videoUrl} />
      ) : (
        <div className="absolute inset-0 bg-zinc-950" aria-hidden="true" />
      )}
      {hasOverlay ? (
        <div className="relative flex h-full max-w-3xl flex-col justify-end p-12">
          {title ? (
            <h2 className="break-keep text-[clamp(3rem,6vw,6.5rem)] font-black leading-none tracking-normal text-white">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-6 line-clamp-3 break-keep text-[clamp(20px,2vw,40px)] font-semibold leading-relaxed text-white/70">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function DisplayPageView({
  page,
  data,
}: {
  page: DisplayPage;
  data: PublicMenuTemplateProps;
}) {
  const settings = normalizeMenuPageDisplaySettings(page.display_settings);

  if (settings.pageType === "promotion") {
    return <PromotionPageView settings={settings} />;
  }

  if (settings.menuLayoutType === "split_image_menu") {
    return (
      <SplitMenuPageView
        page={page}
        settings={settings}
        categories={data.categories}
        items={data.items}
        priceOptions={data.priceOptions}
      />
    );
  }

  return (
    <FullMenuPageView
      page={page}
      categories={data.categories}
      items={data.items}
      priceOptions={data.priceOptions}
    />
  );
}

export default function DisplayMenuA(props: PublicMenuTemplateProps) {
  const pages = useMemo(
    () => sortMenuPages(props.pages.filter((page) => page.visible)),
    [props.pages]
  );
  const [selectedPageId, setSelectedPageId] = useState(pages[0]?.id ?? "");
  const activePage = pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? null;
  const showPreviewSelector = props.mode === "preview" && pages.length > 1;
  const activeSettings = activePage ? normalizeMenuPageDisplaySettings(activePage.display_settings) : null;
  const isPromotionPage = activeSettings?.pageType === "promotion";
  const displayName = getDisplayName(props.menuSite);

  if (!activePage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] p-8 text-white">
        <div className="aspect-video w-full max-w-6xl">
          <EmptyDisplayPage />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050807] p-4 text-white">
      {showPreviewSelector && (
        <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#d6dfd7]/15 bg-[#050807]/82 px-2 py-1 shadow-xl backdrop-blur">
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedPageId(page.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                activePage.id === page.id ? "bg-[#d9e37a] text-[#172019]" : "text-[#e6e2d1]/55 hover:bg-white/10 hover:text-[#f4f0dc]"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1800px] items-center justify-center">
        <section className={`relative aspect-video w-full max-h-[calc(100vh-2rem)] overflow-hidden bg-[#07100d] ${
          isPromotionPage ? "" : "rounded-[2.15rem] border border-[#d6dfd7]/15 p-[clamp(28px,2.4vw,48px)] shadow-2xl"
        }`}>
          {!isPromotionPage ? <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(217,227,122,0.13),transparent_24%),radial-gradient(circle_at_95%_90%,rgba(214,223,215,0.08),transparent_26%)]" /> : null}
          <div className={`relative flex h-full min-h-0 flex-col ${isPromotionPage ? "" : "gap-[clamp(22px,1.8vw,36px)]"}`}>
            {!isPromotionPage && displayName ? (
              <header className="flex shrink-0 items-center justify-between gap-8 border-b border-[#d6dfd7]/15 pb-[clamp(18px,1.5vw,30px)]">
              <div className="min-w-0">
                <h1 className="truncate text-[clamp(2.2rem,4.15vw,5rem)] font-black leading-none tracking-normal text-[#f4f0dc]">
                    {displayName}
                </h1>
              </div>
            </header>
            ) : null}
            <div className="min-h-0 flex-1">
              <DisplayPageView page={activePage} data={props} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
