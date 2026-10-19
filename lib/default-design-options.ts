import type { TemplatePreviewQuery } from "./menu-preview-devices";

export const DEFAULT_DESIGN_OPTION_KEYS = ["widgetsPreview", "coverPreview", "featuredPreview", "imagesPreview", "secondaryNamesPreview", "descriptionsPreview", "priceOptionsPreview", "priceNotesPreview", "timeSalesPreview", "soldOutPreview"] as const;
export type DefaultDesignOptionKey = typeof DEFAULT_DESIGN_OPTION_KEYS[number];
export type DefaultDesignOptions = Record<DefaultDesignOptionKey, boolean>;

export function getDefaultDesignOptions(query: TemplatePreviewQuery): DefaultDesignOptions {
  return Object.fromEntries(DEFAULT_DESIGN_OPTION_KEYS.map(key => [key, (Array.isArray(query[key]) ? query[key][0] : query[key]) !== "off"])) as DefaultDesignOptions;
}
