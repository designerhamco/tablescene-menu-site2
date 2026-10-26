import { getTemplatePageWindow } from "./template-pagination";
export type PageItem = number | "start-ellipsis" | "end-ellipsis";

export function getSitePageItems(current: number, total: number, count: number): PageItem[] {
  if (!Number.isSafeInteger(total) || total < 1) return [];
  const page = Math.min(total, Math.max(1, Math.trunc(current) || 1));
  const window = getTemplatePageWindow(page, total, Math.max(1, count));
  const pages = [...new Set([1, ...window, total])].sort((a, b) => a - b);
  return pages.flatMap<PageItem>((value, index) => {
    const previous = pages[index - 1];
    if (previous === undefined || value === previous + 1) return [value];
    if (value === previous + 2) return [previous + 1, value];
    return [value <= page ? "start-ellipsis" : "end-ellipsis", value];
  });
}
