import type { TemplatePreviewQuery } from "./menu-preview-devices";

export const DEFAULT_DESIGN_OPTION_KEYS = ["popupPreview", "coverImagesPreview", "logoPreview", "widgetsPreview", "coverPreview", "featuredPreview", "imagesPreview", "pageDescriptionsPreview", "categoryDescriptionsPreview", "secondaryNamesPreview", "descriptionsPreview", "badgesPreview", "priceOptionsPreview", "priceNotesPreview", "timeSalesPreview", "soldOutPreview"] as const;
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

/** Remove only this tab's temporary choices so starter-owned defaults apply again. */
export function withoutTemplatePreviewFeatureOverrides(query: TemplatePreviewQuery): TemplatePreviewQuery {
  const next = { ...query };
  for (const key of DEFAULT_DESIGN_OPTION_KEYS) delete next[key];
  return next;
}
