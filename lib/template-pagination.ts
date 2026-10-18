/** Keep the current page visible within a bounded, consecutive page window. */
export function getTemplatePageWindow(current: number, total: number, count: number): number[] {
  const start = Math.max(1, Math.min(current - Math.floor(count / 2), total - count + 1));
  return Array.from({ length: Math.min(count, total) }, (_, index) => start + index);
}
