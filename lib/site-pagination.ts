import { getTemplatePageWindow } from "./template-pagination";

/** Consecutive pages; dedicated first/last controls provide access to both ends. */
export function getSitePageItems(current: number, total: number, count: number): number[] {
  if (!Number.isSafeInteger(total) || total < 1) return [];
  const page = Math.min(total, Math.max(1, Math.trunc(current) || 1));
  return getTemplatePageWindow(page, total, Math.max(1, count));
}
