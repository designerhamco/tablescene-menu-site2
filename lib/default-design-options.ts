import type { TemplatePreviewQuery } from "./menu-preview-devices";

export const DEFAULT_DESIGN_OPTION_KEYS = ["popupPreview", "coverImagesPreview", "logoPreview", "widgetsPreview", "coverPreview", "featuredPreview", "imagesPreview", "categoryDescriptionsPreview", "secondaryNamesPreview", "descriptionsPreview", "badgesPreview", "priceOptionsPreview", "priceNotesPreview", "timeSalesPreview", "soldOutPreview"] as const;
export type DefaultDesignOptionKey = typeof DEFAULT_DESIGN_OPTION_KEYS[number];
export type DefaultDesignOptions = Record<DefaultDesignOptionKey, boolean>;

export function getDefaultDesignOptions(query: TemplatePreviewQuery): DefaultDesignOptions {
  const design = Array.isArray(query.design) ? query.design[0] : query.design;
  const coverEnabled = !["basic-top-row", "basic-top-row-left-logo", "basic-top-row-album"].includes(design ?? "");
  return Object.fromEntries(DEFAULT_DESIGN_OPTION_KEYS.map(key => {
    const value = Array.isArray(query[key]) ? query[key][0] : query[key];
    return [key, value ? value !== "off" : !(key === "popupPreview" || key === "widgetsPreview" || key === "logoPreview" || key === "coverImagesPreview" || (key === "featuredPreview" && design === "basic-upper-left") || (key === "coverPreview" && !coverEnabled))];
  })) as DefaultDesignOptions;
}
