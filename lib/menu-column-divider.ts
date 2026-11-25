/** Visible menu-column separators reserve a full page inset on EACH side. */
import { readMenuDecorations, supportsMenuDecorations } from "./menu-decorations";
export const MENU_COLUMN_DIVIDER_WIDTH = 1;
export function hasMenuColumnDivider(templateKey: string | null | undefined, pageSettings?: unknown) {
  if (!supportsMenuDecorations(templateKey)) return false;
  return readMenuDecorations(pageSettings).columnDivider?.visible ?? templateKey === "cafe_mocha_forest_a";
}
export function getMenuColumnDividerGeometry(inset: string, width: number = MENU_COLUMN_DIVIDER_WIDTH) {
  return { gap: `calc(2 * ${inset} + ${width}px)`, offset: `calc(-1 * (${inset} + ${width}px))`, width: `${width}px` };
}
