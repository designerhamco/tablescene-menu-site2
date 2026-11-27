import { matchesMenuName } from "./menu-name-search";
import type { MenuCardVisibility } from "./menu-card-visibility";
import type { ServiceCategory } from "./service-categories";

export const MENU_CARDS_PER_PAGE = 12;

export type MenuCardFilters = {
  serviceCategory: ServiceCategory | "";
  visibility: MenuCardVisibility | "";
};

export const EMPTY_MENU_CARD_FILTERS: MenuCardFilters = { serviceCategory: "", visibility: "" };

/** Apply name and facet filters to the complete selected tab before taking a page. */
export function getMenuCardPage<T extends { title: string; serviceCategory?: ServiceCategory | null; visibility?: MenuCardVisibility | null }>(
  cards: readonly T[],
  query: string,
  requestedPage: number,
  { serviceCategory, visibility }: MenuCardFilters = EMPTY_MENU_CARD_FILTERS,
) {
  const filtered = cards.filter(card =>
    (!serviceCategory || card.serviceCategory === serviceCategory) &&
    (!visibility || card.visibility === visibility) &&
    matchesMenuName(card.title, query)
  );
  const totalPages = Math.ceil(filtered.length / MENU_CARDS_PER_PAGE);
  const page = Math.min(Math.max(1, totalPages), Math.max(1, Math.trunc(requestedPage) || 1));
  return { page, totalPages, totalResults: filtered.length, cards: filtered.slice((page - 1) * MENU_CARDS_PER_PAGE, page * MENU_CARDS_PER_PAGE) };
}
