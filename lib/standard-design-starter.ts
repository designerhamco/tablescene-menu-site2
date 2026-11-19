import { getBasicStandardCategories, translateBasicStandardText } from "./basic-standard-sample";
import { translateDiningStarterText } from "./template-demo-data/starter-preview-localization";
import type { StarterItem, StarterPreset } from "./menu-starter-presets";
import { getDefaultDesignReview } from "./menu-design-policy";
import { getDefaultDesignOptions } from "./default-design-options";
import { getNeutralDesignAppearance } from "./menu-design-mutation";
import { diningSampleNames, getStandardDesignCopy, neutralizeDiningSampleText } from "./standard-design-copy";
import { translateMenuText } from "./menu-ui-copy";
import { getSinglePageStarterTranslations } from "./template-demo-data/single-page-starter-translations";

/** Initial sample generation only. Design switching must preserve customer content. */
export function buildStandardDesignStarter(source: StarterPreset, designId?: string | null, targetTemplateKey = source.template_key): StarterPreset {
  if (!designId) return source;
  const design = getDefaultDesignReview(designId, targetTemplateKey ?? "");
  if (!design) {
    if (designId.startsWith("basic-") || designId.startsWith("dining-")) throw new Error("기본 디자인과 생성할 템플릿이 일치하지 않습니다.");
    return source;
  }
  const preset = structuredClone(source);
  const basic = design.layout.startsWith("basic-");
  const copy = getStandardDesignCopy(design);
  const options = getDefaultDesignOptions({ design: design.id });
  preset.design_id = design.id;
  preset.template_key = design.renderer;
  preset.site = { ...preset.site, restaurant_name: copy.title, intro_title: copy.title,
    brand_description: copy.description, intro_description: copy.description,
    menu_cover_title: copy.title, menu_cover_description: copy.description,
    about_description: copy.description, menu_cover_label: "MENU", cover_image_url: copy.coverImage,
    logo_url: null, logo_path: null, restaurant_address: "", restaurant_phone: "",
    settings: { ...getNeutralDesignAppearance(), ...Object.fromEntries(copy.notices.map((notice, i) => [`footer_notice_${i + 1}`, notice])), logo_replaces_name: false },
  };
  preset.menu_cover_enabled = options.coverPreview;
  preset.menu_cover_visible_pc = true; preset.menu_cover_visible_tablet = true; preset.menu_cover_visible_mobile = true;
  const neutralItem = (item: StarterItem, imageFree: boolean): StarterItem => ({ ...item,
    name: (!basic ? diningSampleNames[item.name]?.[0] : undefined) ?? item.name.replace(/리얼 맛차/g, "말차").replace(/REAL MATCHA/g, "MATCHA"),
    set_name: (!basic ? diningSampleNames[item.name]?.[1] : undefined) ?? item.set_name?.replace(/REAL MATCHA/g, "MATCHA") ?? (!basic ? translateDiningStarterText(source.template_key ?? "", item.name, "en").toUpperCase() : undefined),
    image_url: imageFree ? null : "/placeholders/starter/default-menu-item.svg",
    ...(basic ? {price_options: [], price_column_values: []} : {}),
  });
  if (basic) {
    const page = preset.pages[0];
    page.title = "메뉴";
    page.description = null;
    page.categories = getBasicStandardCategories(design.itemLayout !== "album");
    preset.featured_item_key = "grilled-chicken";
    page.direct_items = [];
    preset.site.restaurant_category = "음식점";
    preset.mixed_content_order = page.categories.map((category, index) => ({ block_type: "category", page_key: page.key!, category_key: category.key!, sort_order: index }));
    const targets = [
      { key: "basic-salad-special", name: "그린 샐러드 특별가", item: "green-salad", itemName: "그린 샐러드", price: 5000 },
      { key: "basic-dessert-special", name: "초콜릿 브라우니 특별가", item: "chocolate-brownie", itemName: "초콜릿 브라우니", price: 4000 },
    ];
    preset.time_sales = preset.time_sales?.map((sale, index) => ({ ...sale, key: targets[index].key, name: targets[index].name,
      badge_text: "특별가", time_display_text: "매일 오전 11시부터 오후 2시까지",
      targets: [{ target_item_key: targets[index].item, target_item_name: targets[index].itemName, sale_price: targets[index].price }],
    }));
  } else {
    for (const page of preset.pages) {
      page.description = page.description ? neutralizeDiningSampleText(page.description) : page.description;
      for (const category of page.categories) {
        category.name = neutralizeDiningSampleText(category.name.replace(/Aube signature/i, "Signature"));
        category.description ||= "정성껏 준비한 메뉴를 만나보세요.";
        category.description_visible = true;
        category.items = category.items.map(item => neutralItem(item, category.course_price != null || Boolean(category.course_price_label)));
      }
      page.direct_items = page.direct_items?.map(item => neutralItem(item, false));
    }
  }
  preset.featured_slides = preset.featured_slides?.map(slide => ({...slide, image_url: copy.coverImage, image_path: null, featured_item_name: undefined, ...(basic && slide.featured_item_key ? { featured_item_key: "grilled-chicken" } : {})}));
  preset.featured_item_name = undefined;
  if (basic) {
    preset.widgets = [{ key: "default-full-widget", page_key: preset.pages[0]?.key, type: "image_text", title: "매장 이용 안내", description: "모든 음료는 포장할 수 있습니다.", image_url: "/placeholders/starter/default-menu-item.svg", visible: false, sort_order: 100, settings: {aspectRatio: "3:1", objectFit: "cover", objectPosition: "center", textAlign: "left", placement: "flow"} }];
    preset.mixed_content_order = preset.mixed_content_order?.filter(block => block.block_type === "category");
    preset.time_sales = preset.time_sales?.map(sale => ({...sale, badge_background_color: "#191c1b"}));
  } else {
    preset.widgets = preset.widgets?.map(widget => ({...widget, image_url: "/placeholders/starter/default-menu-item.svg", image_path: null, visible: false}));
  }
  return preset;
}

/** Translate neutral samples too, without restoring the renderer's sample store identity. */
export function getStarterTranslationCopy(preset: StarterPreset) {
  const source = getSinglePageStarterTranslations(preset.template_key);
  const design = getDefaultDesignReview(preset.design_id, preset.template_key ?? "");
  if (!source || !design) return source;
  const bundle = structuredClone(source);
  const copy = getStandardDesignCopy(design);
  const basic = design.layout.startsWith("basic-");
  for (const locale of ["en", "zh", "ja"] as const) {
    const target = bundle[locale];
    target.site = { ...target.site, restaurantName: copy.title, brandDescription: translateMenuText(copy.description, locale), introDescription: translateMenuText(copy.description, locale), menuCoverDescription: translateMenuText(copy.description, locale), aboutDescription: translateMenuText(copy.description, locale), footerNotices: copy.notices.map(text => translateMenuText(text, locale)) as [string, string, string] };
    if (basic) {
      target.site.restaurantCategory = translateBasicStandardText("음식점", locale);
      target.pageTitle = translateBasicStandardText("메뉴", locale);
      target.items = {};
      target.categoryNames = {};
      target.promotions = Object.fromEntries((preset.time_sales ?? []).map(sale => [sale.key!, { badgeText: translateBasicStandardText(sale.badge_text ?? "", locale), timeDisplayText: translateBasicStandardText(sale.time_display_text ?? "", locale) }]));
    }
    for (const page of preset.pages) for (const category of page.categories) {
      if (category.key) {
        if (basic || locale === "en") target.categoryNames[category.key] = basic ? translateBasicStandardText(category.name, locale) : category.name;
        target.categoryDescriptions ??= {};
        target.categoryDescriptions[category.key] = translateMenuText(category.description ?? "", locale);
      }
      for (const [index, item] of category.items.entries()) {
        if (basic && item.key) {
          target.items[item.key] = { name: translateBasicStandardText(item.name, locale), description: translateBasicStandardText(item.description, locale) };
          continue;
        }
        if (!item.key || !target.items[item.key]) continue;
        const itemCopy = target.items[item.key];
        itemCopy.name = itemCopy.name.replace(/Real Matcha /g, "Matcha ").replace(/真抹茶/g, "抹茶").replace(/リアル抹茶/g, "抹茶");
        if (page === preset.pages[0] && category === page.categories[0] && index === 0) {
          itemCopy.name = translateMenuText("말차 라떼", locale);
          itemCopy.description = translateMenuText("부드러운 말차와 우유의 조화", locale);
        }
      }
    }
  }
  return bundle;
}
