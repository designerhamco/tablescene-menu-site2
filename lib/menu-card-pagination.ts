import { matchesMenuName } from "./menu-name-search";

export const MENU_CARDS_PER_PAGE = 12;

/** Filter the complete selected tab before taking a page, including staff cards. */
export function getMenuCardPage<T extends { title: string }>(cards: readonly T[], query: string, requestedPage: number) {
  const filtered = cards.filter(card => matchesMenuName(card.title, query));
  const totalPages = Math.ceil(filtered.length / MENU_CARDS_PER_PAGE);
  const page = Math.min(Math.max(1, totalPages), Math.max(1, Math.trunc(requestedPage) || 1));
  return { page, totalPages, totalResults: filtered.length, cards: filtered.slice((page - 1) * MENU_CARDS_PER_PAGE, page * MENU_CARDS_PER_PAGE) };
}
