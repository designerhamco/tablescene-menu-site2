import { getTemplateCapabilities } from "@/lib/template-capabilities";
import type { FeaturedSlideSettings } from "@/types/menu";

export type PublicFeaturedSlideData = {
  id: string;
  imageUrl: string;
  featuredItemId: string | null;
  sortOrder: number;
};

export function buildPublicFeaturedSlides({
  templateKey,
  featuredItemEnabled,
  featuredSlides,
  legacyCoverImageUrl,
  legacyFeaturedItemId,
  items,
}: {
  templateKey: string | null | undefined;
  featuredItemEnabled: boolean;
  featuredSlides: FeaturedSlideSettings[] | undefined;
  legacyCoverImageUrl: string | null;
  legacyFeaturedItemId: string | null;
  items: Array<{ id: string; visible?: boolean | null }>;
}): PublicFeaturedSlideData[] {
  const capabilities = getTemplateCapabilities(templateKey);
  const maxSlides = !capabilities.featuredItemHero
    ? 0
    : capabilities.featuredItemCarousel
      ? Math.max(0, Math.trunc(capabilities.featuredItemMaxSlides ?? 5))
      : 1;
  if (maxSlides <= 0) return [];

  const visibleItemIds = new Set(items.filter((item) => item.visible !== false).map((item) => item.id));
  const seenFeaturedItemIds = new Set<string>();
  const publicSlides: PublicFeaturedSlideData[] = [];

  const addSlide = ({
    id,
    imageUrl,
    featuredItemId,
  }: {
    id: string;
    imageUrl: string | null;
    featuredItemId: string | null;
  }) => {
    const normalizedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
    const requestedItemId = typeof featuredItemId === "string" ? featuredItemId.trim() : "";
    const normalizedItemId = featuredItemEnabled && visibleItemIds.has(requestedItemId) ? requestedItemId : null;
    if (!id || !normalizedImageUrl) return;
    if (normalizedItemId && seenFeaturedItemIds.has(normalizedItemId)) return;
    if (publicSlides.length >= maxSlides) return;

    if (normalizedItemId) seenFeaturedItemIds.add(normalizedItemId);
    publicSlides.push({
      id,
      imageUrl: normalizedImageUrl,
      featuredItemId: normalizedItemId,
      sortOrder: publicSlides.length,
    });
  };

  if (featuredSlides !== undefined) {
    for (const slide of featuredSlides) {
      addSlide({
        id: slide.id,
        imageUrl: slide.image_url,
        featuredItemId: slide.featured_item_id,
      });
    }

    return publicSlides;
  }

  addSlide({
    id: "legacy-featured-slide",
    imageUrl: legacyCoverImageUrl,
    featuredItemId: legacyFeaturedItemId,
  });

  return publicSlides;
}
