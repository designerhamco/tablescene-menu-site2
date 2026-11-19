/** Catalog-only navigation protocol. Public displays never receive preview commands. */
export const DISPLAY_PREVIEW_STATE = "artimenu:display-preview-state";
export const DISPLAY_PREVIEW_SELECT = "artimenu:display-preview-select";
export const DISPLAY_PREVIEW_REQUEST = "artimenu:display-preview-request";

export type DisplayPreviewPage = { id: string; title: string; split: boolean };

export function getDisplayPreviewPageNumber(value: unknown, count: number) {
  const number = Number(Array.isArray(value) ? value[0] : value);
  return count > 0 && Number.isSafeInteger(number) && number >= 1 && number <= count ? number : count > 0 ? 1 : 0;
}
