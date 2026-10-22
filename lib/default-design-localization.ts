import { neutralizeDiningSampleText } from "./standard-design-copy";
import type { MenuPageData } from "./menu-page-data";
import type { SupportedLocale } from "./locales";
import { translateMenuText } from "./menu-ui-copy";
import { applyStarterPreviewLocalization } from "./template-demo-data/starter-preview-localization";

/** Localize the neutral examples after creation, using stable source IDs. */
export function localizeDefaultDesignPreview(data: MenuPageData, source: MenuPageData, locale: SupportedLocale): MenuPageData {
  if (locale === "ko") return data;
  const t = (text: string) => translateMenuText(text, locale);
  const basic = data.menuSite.template_key === "cafe_design_a";
  const translated = applyStarterPreviewLocalization(source, locale);
  const items = new Map(translated.items.map(item => [item.id, item]));
  const categories = new Map(translated.categories.map(category => [category.id, category]));
  const pages = new Map(translated.pages.map(page => [page.id, page]));
  const sales = new Map(translated.timeSales.map(sale => [sale.id, sale]));
  const settings = data.menuSite.settings as Record<string, string>;
  return {
    ...data, locale,
    menuSite: { ...data.menuSite,
      description: t(data.menuSite.description ?? ""),
      intro_description: t(data.menuSite.intro_description ?? ""),
      brand_description: t(data.menuSite.brand_description ?? ""),
      menu_cover_description: t(data.menuSite.menu_cover_description ?? ""),
      settings: { ...settings, ...Object.fromEntries([1, 2, 3].map(n => [`footer_notice_${n}`, t(String(settings[`footer_notice_${n}`] ?? ""))])) },
    },
    pages: data.pages.map(page => ({ ...page, title: pages.get(page.id)?.title ?? page.title,
      description: page.description ? neutralizeDiningSampleText(pages.get(page.id)?.description ?? page.description) : null })),
    categories: data.categories.map(category => ({ ...category,
      name: neutralizeDiningSampleText(categories.get(category.id)?.name ?? category.name),
      description: category.description ? basic ? t(category.description) : categories.get(category.id)?.description ?? category.description : null,
      course_price_description: category.course_price_description ? categories.get(category.id)?.course_price_description ?? category.course_price_description : null,
      priceColumns: category.priceColumns.map(column => ({ ...column, label: t(column.label) })),
    })),
    items: data.items.map((item, index) => ({ ...item,
      name: basic && index === 0 ? t("말차 라떼") : items.get(item.id)?.name?.replace(/Real Matcha /g, "Matcha ") ?? item.name,
      description: item.description ? basic && index === 0 ? t("부드러운 말차와 우유의 조화") : items.get(item.id)?.description ?? item.description : null,
      priceNote: item.priceNote ? t(item.priceNote) : null,
      badge: item.badge ? t(item.badge) : null, badge_label: item.badge_label ? t(item.badge_label) : null,
    })),
    priceOptions: data.priceOptions.map(option => ({ ...option, label: t(option.label) })),
    timeSales: data.timeSales.map(sale => ({ ...sale,
      name: sales.get(sale.id)?.name ?? sale.name,
      displayText: sale.displayText ? sales.get(sale.id)?.displayText ?? sale.displayText : null,
      badgeText: t(sale.badgeText),
    })),
    widgets: (data.widgets ?? []).map(widget => {
      if (widget.type === "image") return { ...widget, settings: { ...widget.settings, altText: t(widget.settings.altText ?? "") } };
      if (widget.type === "text") return { ...widget, title: widget.title ? t(widget.title) : null, description: t(widget.description) };
      return { ...widget, title: widget.title ? t(widget.title) : null, description: t(widget.description),
        settings: { ...widget.settings, altText: t(widget.settings.altText ?? "") } };
    }),
  };
}
