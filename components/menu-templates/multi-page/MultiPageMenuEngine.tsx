"use client";

import { useEffect, useMemo, useState } from "react";

import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";

import MultiPageDesktopPresentation from "./MultiPageDesktopPresentation";
import MultiPageStackPresentation from "./MultiPageStackPresentation";
import type { MultiPageEngineProps, MultiPageMenuPage } from "./types";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

function sortVisiblePages(pages: PublicMenuTemplateProps["pages"]) {
  return pages
    .filter((page) => page.visible !== false)
    .sort((left, right) => left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at));
}

function useIsDesktopPresentation() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const update = () => setIsDesktop(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export function getMultiPageDataForPage(
  data: PublicMenuTemplateProps,
  page: MultiPageMenuPage,
): PublicMenuTemplateProps {
  const categories = data.categories
    .filter((category) => category.visible !== false && category.menu_page_id === page.id)
    .sort((left, right) => left.sort_order - right.sort_order || (left.name ?? "").localeCompare(right.name ?? "", "ko"));
  const categoryIds = new Set(categories.map((category) => category.id));
  const items = data.items
    .filter((item) => item.visible !== false && typeof item.category_id === "string" && categoryIds.has(item.category_id))
    .sort((left, right) => left.sort_order - right.sort_order || (left.name ?? "").localeCompare(right.name ?? "", "ko"));
  const itemIds = new Set(items.map((item) => item.id));
  const widgets = (data.widgets ?? [])
    .filter((widget) => widget.visible && widget.menuPageId === page.id)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const pageFeaturedSlides = (data.featuredSlides ?? [])
    .filter((slide) => itemIds.has(slide.featuredItemId))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const nextPageSettings = {
    ...data.pageSettings,
    featured_item_enabled: pageFeaturedSlides.length > 0,
    featured_item_id: pageFeaturedSlides[0]?.featuredItemId ?? null,
    featured_slides: pageFeaturedSlides.map((slide) => ({
      id: slide.id,
      image_url: slide.imageUrl,
      image_path: null,
      featured_item_id: slide.featuredItemId,
      sort_order: slide.sortOrder,
    })),
  };
  const nextTimeSales = data.timeSales
    .map((timeSale) => ({
      ...timeSale,
      items: timeSale.items.filter((timeSaleItem) => itemIds.has(timeSaleItem.menuItemId)),
    }))
    .filter((timeSale) => timeSale.items.length > 0);

  return {
    ...data,
    pageSettings: nextPageSettings,
    menuSite: {
      ...data.menuSite,
      page_settings: nextPageSettings,
    },
    pages: [page],
    categories,
    items,
    priceOptions: data.priceOptions.filter((option) => itemIds.has(option.menu_item_id)),
    traits: data.traits.filter((trait) => itemIds.has(trait.menu_item_id)),
    timeSales: nextTimeSales,
    widgets,
    featuredSlides: pageFeaturedSlides,
    initialPreviewPageId: page.id,
  };
}

export default function MultiPageMenuEngine(data: MultiPageEngineProps) {
  const visiblePages = useMemo(() => sortVisiblePages(data.pages), [data.pages]);
  const isDesktop = useIsDesktopPresentation();

  if (visiblePages.length <= 1) {
    return <MultiPageStackPresentation pages={visiblePages.map((page) => ({ page, data: getMultiPageDataForPage(data, page) }))} />;
  }

  const pageData = visiblePages.map((page) => ({
    page,
    data: getMultiPageDataForPage(data, page),
  }));

  if (isDesktop) {
    return <MultiPageDesktopPresentation pages={pageData} />;
  }

  return <MultiPageStackPresentation pages={pageData} />;
}
