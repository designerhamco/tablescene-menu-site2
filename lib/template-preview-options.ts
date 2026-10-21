import type { DefaultDesignOptionKey, DefaultDesignOptions } from "./default-design-options";
import { getDefaultDesignOptions } from "./default-design-options";
import type { DefaultDesignReview } from "./menu-design-policy";
import type { MenuPageData } from "./menu-page-data";
import type { TemplatePreviewQuery } from "./menu-preview-devices";
import { getTemplateCapabilities } from "./template-capabilities";

export type PreviewOptionGroup = { label: string; choices: [DefaultDesignOptionKey, string][] };

/** The toolbar and data adapter share the template's real supported features. */
export function getTemplatePreviewOptionGroups(templateKey: string, design?: DefaultDesignReview): PreviewOptionGroup[] {
  if (templateKey === "display_menu_a") return [];
  const capabilities = getTemplateCapabilities(templateKey);
  const basic = design ? design.layout.startsWith("basic-") : capabilities.menuCover.coverMode === "section";
  const groups: PreviewOptionGroup[] = [
    { label: "영역·이미지", choices: [
      ["popupPreview", "광고"],
      ...(capabilities.brandLogo ? [["logoPreview", "로고"] as [DefaultDesignOptionKey, string]] : []),
      ...(capabilities.menuCover.coverMode !== "none" ? [["coverPreview", basic ? "대표 영역" : "커버 페이지"] as [DefaultDesignOptionKey, string]] : []),
      ...(!basic && capabilities.menuCover.usesCoverImage ? [["coverImagesPreview", "커버 이미지"] as [DefaultDesignOptionKey, string]] : []),
      ...(capabilities.menuCover.usesFeaturedItem ? [["featuredPreview", "대표 상품"] as [DefaultDesignOptionKey, string]] : []),
      ...(capabilities.menuItemImages ? [["imagesPreview", "상품 이미지"] as [DefaultDesignOptionKey, string]] : []),
      ...(capabilities.menuWidgets.enabled ? [["widgetsPreview", "위젯"] as [DefaultDesignOptionKey, string]] : []),
    ] },
    { label: "메뉴 정보", choices: [
      ...(capabilities.categoryDescription ? [["categoryDescriptionsPreview", "카테고리 설명"] as [DefaultDesignOptionKey, string]] : []),
      ["secondaryNamesPreview", "보조 언어명"],
      ...(capabilities.itemDescription ? [["descriptionsPreview", "메뉴 설명"] as [DefaultDesignOptionKey, string]] : []),
      ...(basic && capabilities.itemBadges ? [["badgesPreview", "일반 텍스트칩"] as [DefaultDesignOptionKey, string]] : []),
    ] },
    { label: "가격·판매 상태", choices: [
      ...((capabilities.priceOptions || capabilities.supportsBasicPriceColumns) && !(basic && design?.itemLayout === "album") ? [["priceOptionsPreview", "가격 옵션"] as [DefaultDesignOptionKey, string]] : []),
      ...(capabilities.supportsPriceNote ? [["priceNotesPreview", "가격 설명"] as [DefaultDesignOptionKey, string]] : []),
      ...(basic ? [["timeSalesPreview", "기간 할인"] as [DefaultDesignOptionKey, string]] : []),
      ["soldOutPreview", "품절"],
    ] },
  ];
  return groups.filter(group => group.choices.length > 0);
}

export function getTemplatePreviewOptionOverride(query: TemplatePreviewQuery, key: DefaultDesignOptionKey) {
  const value = Array.isArray(query[key]) ? query[key][0] : query[key];
  return value === "on" ? true : value === "off" ? false : undefined;
}

/** No query overrides means exactly the original starter presentation. */
export function getTemplatePreviewOptions(source: MenuPageData, query: TemplatePreviewQuery): DefaultDesignOptions {
  const basic = getTemplateCapabilities(source.menuSite.template_key).menuCover.coverMode === "section";
  const defaults: DefaultDesignOptions = {
    ...getDefaultDesignOptions({}),
    popupPreview: false,
    logoPreview: Boolean(source.menuSite.logo_url),
    coverImagesPreview: source.pageSettings.cover_image_visible !== false && Boolean(source.menuSite.cover_image_url),
    coverPreview: source.pageSettings.menu_cover_enabled !== false,
    featuredPreview: source.pageSettings.featured_item_enabled === true,
    imagesPreview: source.items.some(item => Boolean(item.image_url)),
    widgetsPreview: source.menuSite.template_key === "cafe_mocha_forest_a",
    categoryDescriptionsPreview: source.categories.some(category => category.description_visible !== false && Boolean(category.description)),
    secondaryNamesPreview: source.items.some(item => basic && source.locale !== "ko" ? Boolean(item.default_name && item.default_name !== item.name) : Boolean(item.set_name)),
    descriptionsPreview: source.items.some(item => Boolean(item.description)),
    badgesPreview: source.items.some(item => Boolean(item.badge_label || item.badge || item.recommended || item.is_best)),
    priceOptionsPreview: source.priceOptions.length > 0 || source.categories.some(category => category.priceColumns.length > 0),
    priceNotesPreview: source.items.some(item => Boolean(item.priceNote || (item.portion_visible && item.portion_label))),
    timeSalesPreview: source.timeSales.length > 0,
    soldOutPreview: source.items.some(item => item.is_sold_out),
  };
  for (const key of Object.keys(defaults) as DefaultDesignOptionKey[]) defaults[key] = getTemplatePreviewOptionOverride(query, key) ?? defaults[key];
  return defaults;
}
