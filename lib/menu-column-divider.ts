/** Visible menu-column separators reserve a full page inset on EACH side. */
export const MENU_COLUMN_DIVIDER_WIDTH = 1;
export function hasMenuColumnDivider(templateKey: string | null | undefined) {
  return templateKey === "cafe_mocha_forest_a";
}
export function getMenuColumnDividerGeometry(inset: string) {
  return { gap: `calc(2 * ${inset} + ${MENU_COLUMN_DIVIDER_WIDTH}px)`, offset: `calc(-1 * (${inset} + ${MENU_COLUMN_DIVIDER_WIDTH}px))`, width: `${MENU_COLUMN_DIVIDER_WIDTH}px` };
}
