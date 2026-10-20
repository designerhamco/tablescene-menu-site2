import type { TemplatePreviewQuery } from "./menu-preview-devices";

export const DEFAULT_DESIGN_OPTION_KEYS = ["widgetsPreview", "coverPreview", "featuredPreview", "imagesPreview", "categoryDescriptionsPreview", "secondaryNamesPreview", "descriptionsPreview", "badgesPreview", "priceOptionsPreview", "priceNotesPreview", "timeSalesPreview", "soldOutPreview"] as const;
export type DefaultDesignOptionKey = typeof DEFAULT_DESIGN_OPTION_KEYS[number];
export type DefaultDesignOptions = Record<DefaultDesignOptionKey, boolean>;

export function getDefaultDesignOptions(query: TemplatePreviewQuery): DefaultDesignOptions {
  return Object.fromEntries(DEFAULT_DESIGN_OPTION_KEYS.map(key => {
    const value = Array.isArray(query[key]) ? query[key][0] : query[key];
    const design = Array.isArray(query.design) ? query.design[0] : query.design;
    return [key, value ? value !== "off" : !(key === "featuredPreview" && design === "basic-upper-left")];
  })) as DefaultDesignOptions;
}
