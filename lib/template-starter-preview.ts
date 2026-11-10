import type { MenuPageData } from "./menu-page-data";
import { getTemplateByKey, type TemplateKey } from "./templates";
import { DEFAULT_LOCALE, DEFAULT_ENABLED_LOCALES } from "./locales";
import { getFirstCompleteStarterFeaturedSlide, getFirstStarterFeaturedImageSlide, getStarterPageSettings, getStarterPreset, getStarterLogoUrl, getStarterItemImage, resolveStarterFeaturedSlides } from "./menu-starter-presets";
import { getDefaultPageSettings } from "../types/menu";
import { isAubeTableTemplate } from "./aube-table";
import { DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR, DEFAULT_TIME_SALE_BADGE_TEXT, DEFAULT_TIME_SALE_DISPLAY_MODE, TIME_SALE_TIMEZONE } from "./menu-time-sales";
import { getNextTimeSaleStartMs } from "./menu-time-sale-schedule";
import { MENU_WIDGET_SETTINGS_VERSION, type MenuWidget } from "./menu-widgets";
import { buildDisplayMenuAPreviewData, normalizeDisplayMenuAQaCase } from "./template-demo-data/display-menu-a";

/** Project the provisioning preset into the public renderer without database writes. */
export function buildStarterPreviewData(templateKey: TemplateKey, qaCase: string | null = null, designId?: string): MenuPageData {
  if (templateKey === "display_menu_a") {
    return buildDisplayMenuAPreviewData(normalizeDisplayMenuAQaCase(qaCase));
  }

  const template = getTemplateByKey(templateKey);
  const preset = getStarterPreset(templateKey, template.categoryLabel, template.template_category, designId);
  const initialNowMs = templateKey === "cafe_brew_chapter_a"
    ? Date.UTC(2026, 7, 4, 9, 0, 0)
    : Date.now();
  const now = new Date(initialNowMs).toISOString();
  const siteId = `template-preview-${template.key}`;

  const pages: MenuPageData["pages"] = preset.pages.map((page, pageIndex) => ({
    id: `${siteId}-page-${pageIndex}`,
    title: page.title,
    description: page.description ?? null,
    description_visible: page.description_visible ?? Boolean(page.description),
    display_settings: {},
    legacy_section_key: page.legacy_section_key,
    visible: true,
    sort_order: pageIndex,
    created_at: now,
    layout_columns: page.layout_columns ?? 1,
    text_alignment: page.text_alignment ?? "left",
  }));
  const pageIdByStarterKey = new Map(
    preset.pages.map((page, pageIndex) => [page.key ?? `page-${pageIndex + 1}`, pages[pageIndex]?.id ?? ""]),
  );

  const categories: MenuPageData["categories"] = [];
  const items: MenuPageData["items"] = [];
  const priceOptions: MenuPageData["priceOptions"] = [];
  const priceColumnIdByCategoryKey = new Map<string, string>();
  const itemIdByStarterKey = new Map<string, string>();

  preset.pages.forEach((page, pageIndex) => {
    const pageId = pages[pageIndex]?.id ?? null;

    page.categories.forEach((category, categoryIndex) => {
      const categoryId = `${siteId}-category-${pageIndex}-${categoryIndex}`;
      const priceColumns = (category.price_columns ?? []).map((column, columnIndex) => {
        const priceColumnId = `${categoryId}-price-column-${column.key}`;
        priceColumnIdByCategoryKey.set(`${categoryId}:${column.key}`, priceColumnId);
        return {
          id: priceColumnId,
          categoryId,
          key: column.key,
          label: column.label,
          sortOrder: columnIndex,
          visible: column.visible ?? true,
        };
      });
      categories.push({
        id: categoryId,
        menu_page_id: pageId,
        name: category.name,
        description: category.description ?? null,
        description_visible: category.description_visible ?? Boolean(category.description),
        course_price: category.course_price ?? null,
        course_price_label: category.course_price_label ?? null,
        course_price_visible: category.course_price_visible ?? true,
        course_price_description: category.course_price_description ?? null,
        course_price_description_visible: category.course_price_description_visible ?? true,
        sort_order: categoryIndex + 1,
        visible: true,
        priceColumns,
      });

      category.items.forEach((menuItem, itemIndex) => {
        const itemId = `${siteId}-item-${pageIndex}-${categoryIndex}-${itemIndex}`;
        if (menuItem.key) itemIdByStarterKey.set(menuItem.key, itemId);
        const priceColumnValues = (menuItem.price_column_values ?? []).flatMap((columnValue) => {
          const priceColumnId = priceColumnIdByCategoryKey.get(`${categoryId}:${columnValue.key}`);
          if (!priceColumnId || columnValue.price == null) return [];
          return [{
            id: `${itemId}-price-column-value-${columnValue.key}`,
            priceColumnId,
            price: columnValue.price,
            priceLabel: columnValue.price_label ?? null,
            visible: columnValue.visible ?? true,
          }];
        });
        items.push({
          id: itemId,
          category_id: categoryId,
          menu_page_id: pageId,
          name: menuItem.name,
          set_name: menuItem.set_name ?? null,
          description: menuItem.description,
          price: menuItem.price,
          price_label: menuItem.price_label ?? null,
          priceNote: menuItem.price_note ?? null,
          price_visible:
            menuItem.price_visible ??
            !(isAubeTableTemplate(templateKey) && menuItem.price === 0 && !menuItem.price_label),
          portion_label: menuItem.portion_label ?? null,
          portion_visible: Boolean(menuItem.portion_label),
          image_url: getStarterItemImage(preset, menuItem),
          badge: menuItem.badge_label ?? (menuItem.recommended ? "추천" : null),
          badge_label: menuItem.badge_label ?? (menuItem.recommended ? "추천" : null),
          badge_type: null,
          recommended: menuItem.recommended ?? false,
          origin_info: null,
          is_best: menuItem.recommended ?? false,
          is_sold_out: menuItem.is_sold_out ?? false,
          traits_visible: true,
          visible: true,
          sort_order: itemIndex + 1,
          priceColumnValues,
        });

        menuItem.price_options?.forEach((option, optionIndex) => {
          priceOptions.push({
            id: `${itemId}-price-option-${optionIndex}`,
            menu_item_id: itemId,
            label: option.label,
            price: option.price ?? null,
            price_label: option.price_label ?? null,
            visible: true,
            sort_order: optionIndex + 1,
          });
        });
      });
    });

    (page.direct_items ?? []).forEach((menuItem, itemIndex) => {
      const itemId = `${siteId}-direct-item-${pageIndex}-${itemIndex}`;
      items.push({
        id: itemId,
        category_id: null,
        menu_page_id: pageId,
        name: menuItem.name,
        set_name: menuItem.set_name ?? null,
        description: menuItem.description,
        price: menuItem.price,
        price_label: menuItem.price_label ?? null,
        priceNote: menuItem.price_note ?? null,
        price_visible: menuItem.price_visible ?? true,
        portion_label: menuItem.portion_label ?? null,
        portion_visible: Boolean(menuItem.portion_label),
        image_url: menuItem.image_url ?? null,
        badge: menuItem.badge_label ?? (menuItem.recommended ? "추천" : null),
        badge_label: menuItem.badge_label ?? (menuItem.recommended ? "추천" : null),
        badge_type: null,
        recommended: menuItem.recommended ?? false,
        origin_info: null,
        is_best: menuItem.recommended ?? false,
        is_sold_out: menuItem.is_sold_out ?? false,
        traits_visible: true,
        visible: true,
        sort_order: itemIndex + 1,
        priceColumnValues: [],
      });

      menuItem.price_options?.forEach((option, optionIndex) => {
        priceOptions.push({
          id: `${itemId}-price-option-${optionIndex}`,
          menu_item_id: itemId,
          label: option.label,
          price: option.price ?? null,
          price_label: option.price_label ?? null,
          visible: true,
          sort_order: optionIndex + 1,
        });
      });
    });
  });

  const featuredName = preset.featured_item_name ?? preset.pages.flatMap(page => page.categories.flatMap(category => category.items)).find(item => preset.featured_item_key && item.key === preset.featured_item_key)?.name;
  const featuredItem = items.find(item => item.name === featuredName) ?? items.find(item => item.recommended);
  const featuredSlides = resolveStarterFeaturedSlides(preset, items, itemIdByStarterKey);
  const firstCompleteFeaturedSlide = getFirstCompleteStarterFeaturedSlide(featuredSlides);
  const firstFeaturedImageSlide = getFirstStarterFeaturedImageSlide(featuredSlides);
  const pageSettings = {
    ...getDefaultPageSettings(),
    ...getStarterPageSettings(preset),
    featured_item_enabled: preset.design_id !== "basic-upper-left" && Boolean(firstCompleteFeaturedSlide?.featured_item_id ?? featuredItem?.id),
    featured_item_id: firstCompleteFeaturedSlide?.featured_item_id ?? featuredItem?.id ?? null,
    ...(featuredSlides.length > 0 ? { featured_slides: featuredSlides } : {}),
  };
  const timeSales: MenuPageData["timeSales"] = (preset.time_sales ?? []).flatMap((timeSale, promotionIndex) => {
    const timeSaleDurationMinutes = timeSale.duration_minutes;
    const timeSaleCampaignEnd = new Date(
      new Date(now).getTime() +
        (typeof timeSaleDurationMinutes === "number" && Number.isFinite(timeSaleDurationMinutes) && timeSaleDurationMinutes > 0
          ? timeSaleDurationMinutes * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000)
    ).toISOString();
    const saleItems = (timeSale.targets ?? []).flatMap((saleTarget, targetIndex) => {
      const item = items.find((candidate) => candidate.name === saleTarget.target_item_name);
      if (!item) return [];

      const priceColumnId = saleTarget.target_price_column_key
        ? priceColumnIdByCategoryKey.get(`${item.category_id}:${saleTarget.target_price_column_key}`) ?? null
        : null;
      if (saleTarget.target_price_column_key && !priceColumnId) return [];

      return [{
        id: `${siteId}-time-sale-${promotionIndex}-item-${targetIndex}`,
        menuItemId: item.id,
        priceColumnId,
        salePrice: saleTarget.sale_price,
        salePriceLabel: saleTarget.sale_price_label ?? null,
        visible: true,
      }];
    });
    if (saleItems.length === 0) return [];

    return [{
      id: `${siteId}-time-sale-${promotionIndex}`,
      name: timeSale.name,
      scheduleType: timeSale.schedule_type ?? "daily_window",
      startsAt: now,
      endsAt: timeSaleCampaignEnd,
      dailyStartTime: timeSale.daily_start_time ?? null,
      dailyEndTime: timeSale.daily_end_time ?? null,
      timezone: TIME_SALE_TIMEZONE,
      timeDisplayMode: timeSale.time_display_mode ?? DEFAULT_TIME_SALE_DISPLAY_MODE,
      displayText: timeSale.time_display_text ?? null,
      badgeText: timeSale.badge_text ?? DEFAULT_TIME_SALE_BADGE_TEXT,
      badgeBackgroundColor: timeSale.badge_background_color ?? DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
      items: saleItems,
    }];
  });
  const nextTimeSaleStartMs = timeSales.reduce<number | null>((nextStart, timeSale) => {
    const startMs = getNextTimeSaleStartMs({
      active: true,
      scheduleType: timeSale.scheduleType,
      startsAt: timeSale.startsAt,
      endsAt: timeSale.endsAt,
      dailyStartTime: timeSale.dailyStartTime,
      dailyEndTime: timeSale.dailyEndTime,
      timeZone: "Asia/Seoul",
    }, initialNowMs);
    if (startMs == null) return nextStart;
    return nextStart == null ? startMs : Math.min(nextStart, startMs);
  }, null);
  const widgets = (preset.widgets ?? []).reduce<MenuWidget[]>((resolvedWidgets, widget, widgetIndex) => {
    const menuPageId = widget.page_key
      ? pageIdByStarterKey.get(widget.page_key) ?? null
      : pages[0]?.id ?? null;
    if (!menuPageId) return resolvedWidgets;

    const baseWidget = {
      id: `${siteId}-widget-${widget.key}`,
      menuSiteId: siteId,
      menuPageId,
      sortOrder: widget.sort_order ?? widgetIndex,
      visible: widget.visible ?? templateKey === "cafe_mocha_forest_a",
    };

    if (widget.type === "image") {
      resolvedWidgets.push({
        ...baseWidget,
        type: "image",
        title: null,
        description: null,
        imageUrl: widget.image_url ?? null,
        imagePath: widget.image_path ?? null,
        settings: {
          schemaVersion: MENU_WIDGET_SETTINGS_VERSION,
          aspectRatio: widget.settings?.aspectRatio ?? "2:1",
          objectFit: widget.settings?.objectFit ?? "cover",
          objectPosition: widget.settings?.objectPosition ?? "center",
          placement: "flow",
          altText: widget.settings?.altText ?? "메뉴 이미지",
        },
      });
      return resolvedWidgets;
    }

    if (widget.type === "text") {
      resolvedWidgets.push({
        ...baseWidget,
        type: "text",
        title: widget.title ?? null,
        description: widget.description ?? "",
        imageUrl: null,
        imagePath: null,
        settings: {
          schemaVersion: MENU_WIDGET_SETTINGS_VERSION,
          textAlign: widget.settings?.textAlign ?? "left",
          placement: "flow",
        },
      });
      return resolvedWidgets;
    }

    resolvedWidgets.push({
      ...baseWidget,
      type: "image_text",
      title: widget.title ?? null,
      description: widget.description ?? "",
      imageUrl: widget.image_url ?? null,
      imagePath: widget.image_path ?? null,
      settings: {
        schemaVersion: MENU_WIDGET_SETTINGS_VERSION,
        aspectRatio: widget.settings?.aspectRatio ?? "2:1",
        objectFit: widget.settings?.objectFit ?? "cover",
        objectPosition: widget.settings?.objectPosition ?? "center",
        textAlign: widget.settings?.textAlign ?? "left",
        placement: "flow",
        altText: widget.settings?.altText ?? "메뉴 이미지",
      },
    });
    return resolvedWidgets;
  }, []);

  return {
    locale: DEFAULT_LOCALE,
    enabledLocales: [...DEFAULT_ENABLED_LOCALES],
    publicServiceType: "menu",
    menuSite: {
      id: siteId,
      user_id: "template-preview",
      name: template.name,
      slug: `preview-${template.key}`,
      template_key: template.key,
      template_category: template.template_category,
      status: "published",
      description: template.description,
      logo_url: getStarterLogoUrl(preset),
      cover_image_url: firstFeaturedImageSlide?.image_url ?? preset.site.cover_image_url,
      intro_image_url: null,
      brand_color: "#111111",
      business_name: preset.site.restaurant_name,
      business_address: preset.site.restaurant_address,
      business_phone: preset.site.restaurant_phone,
      restaurant_name: preset.site.restaurant_name,
      restaurant_category: preset.site.restaurant_category,
      restaurant_type: preset.site.restaurant_type,
      restaurant_address: preset.site.restaurant_address,
      restaurant_phone: preset.site.restaurant_phone,
      intro_title: preset.site.intro_title,
      intro_description: preset.site.intro_description,
      brand_description: preset.site.brand_description,
      menu_cover_label: preset.site.menu_cover_label,
      menu_cover_title: preset.site.menu_cover_title,
      menu_cover_description: preset.site.menu_cover_description,
      about_description: preset.site.about_description,
      opening_hours: preset.site.opening_hours,
      map_url: null,
      page_settings: pageSettings,
      settings: { ...preset.site.settings, ...(designId ? { menu_design_id: designId } : {}) },
    },
    pageSettings,
    pages,
    categories,
    items,
    priceOptions,
    traits: [],
    events: preset.events.map((event, index) => ({
      id: `${siteId}-event-${index}`,
      event_title: event.event_title,
      event_subtitle: event.event_subtitle,
      event_description: event.event_description,
      event_period: event.event_period,
      event_image_url: null,
      event_benefit: event.event_benefit,
      event_detail: event.event_detail,
      event_regular_price_label: event.event_regular_price_label,
      event_sale_price_label: event.event_sale_price_label,
      event_price_visible: true,
      visible: true,
      sort_order: index + 1,
    })),
    chefs: preset.chefs.map((chef, index) => ({
      id: `${siteId}-chef-${index}`,
      chef_name: chef.chef_name,
      chef_role: chef.chef_role,
      chef_description: chef.chef_description,
      chef_image_url: null,
      visible: true,
      sort_order: index + 1,
    })),
    socialLinks: preset.socialLinks.map((link, index) => ({
      id: `${siteId}-social-${index}`,
      type: link.type,
      label: link.label,
      display_name: link.display_name,
      url: link.url,
      visible: true,
      sort_order: index + 1,
    })),
    timeSales,
    nextTimeSaleStartAt: nextTimeSaleStartMs == null ? null : new Date(nextTimeSaleStartMs).toISOString(),
    initialNowMs,
    widgets,
    featuredSlides: featuredSlides.flatMap((slide) => {
      const item = slide.featured_item_id ? items.find((menuItem) => menuItem.id === slide.featured_item_id) : null;
      if (!slide.image_url || item?.visible === false) return [];
      return [
        {
          id: slide.id,
          imageUrl: slide.image_url,
          featuredItemId: item?.id ?? null,
          sortOrder: slide.sort_order,
        },
      ];
    }),
  };
}

