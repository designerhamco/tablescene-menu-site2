import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { DEFAULT_LOCALE, DEFAULT_ENABLED_LOCALES } from "@/lib/locales";
import type { MenuPageData } from "@/lib/menu-page-data";
import { getStarterPreset } from "@/lib/menu-starter-presets";
import { getTemplateByKey, isValidTemplateKey, type TemplateKey } from "@/lib/templates";
import { getDefaultPageSettings } from "@/types/menu";

type PageProps = {
  params: Promise<{ templateKey: string }>;
  searchParams?: Promise<{ layoutMode?: string | string[] }>;
};

function buildPreviewData(templateKey: TemplateKey): MenuPageData {
  const template = getTemplateByKey(templateKey);
  const preset = getStarterPreset(templateKey, template.categoryLabel, template.template_category);
  const now = new Date().toISOString();
  const siteId = `template-preview-${template.key}`;

  const pages: MenuPageData["pages"] = preset.pages.map((page, pageIndex) => ({
    id: `${siteId}-page-${pageIndex}`,
    title: page.title,
    description: null,
    description_visible: true,
    legacy_section_key: page.legacy_section_key,
    visible: true,
    sort_order: pageIndex,
    created_at: now,
  }));

  const categories: MenuPageData["categories"] = [];
  const items: MenuPageData["items"] = [];
  const priceOptions: MenuPageData["priceOptions"] = [];

  preset.pages.forEach((page, pageIndex) => {
    const pageId = pages[pageIndex]?.id ?? null;

    page.categories.forEach((category, categoryIndex) => {
      const categoryId = `${siteId}-category-${pageIndex}-${categoryIndex}`;
      categories.push({
        id: categoryId,
        menu_page_id: pageId,
        name: category.name,
        description: null,
        description_visible: true,
        sort_order: categoryIndex + 1,
        visible: true,
      });

      category.items.forEach((menuItem, itemIndex) => {
        const itemId = `${siteId}-item-${pageIndex}-${categoryIndex}-${itemIndex}`;
        items.push({
          id: itemId,
          category_id: categoryId,
          name: menuItem.name,
          set_name: menuItem.set_name ?? null,
          description: menuItem.description,
          price: menuItem.price,
          price_label: menuItem.price_label ?? null,
          price_visible: true,
          portion_label: menuItem.portion_label ?? null,
          portion_visible: Boolean(menuItem.portion_label),
          image_url: menuItem.image_url ?? null,
          badge: menuItem.badge_label ?? null,
          badge_label: menuItem.badge_label ?? null,
          badge_type: null,
          recommended: menuItem.recommended ?? false,
          origin_info: null,
          is_best: menuItem.recommended ?? false,
          is_sold_out: false,
          traits_visible: true,
          visible: true,
          sort_order: itemIndex + 1,
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
  });

  const featuredItem = preset.featured_item_name
    ? items.find((item) => item.name === preset.featured_item_name)
    : null;
  const pageSettings = {
    ...getDefaultPageSettings(),
    featured_item_enabled: Boolean(featuredItem?.id),
    featured_item_id: featuredItem?.id ?? null,
  };

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
      logo_url: null,
      cover_image_url: preset.site.cover_image_url,
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
      settings: {},
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
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { templateKey } = await params;

  if (!isValidTemplateKey(templateKey)) {
    return {
      title: "템플릿 미리보기 | MenuLink",
      robots: { index: false, follow: false },
    };
  }

  const template = getTemplateByKey(templateKey);

  return {
    title: `${template.name} 미리보기 | MenuLink`,
    description: `${template.name} 템플릿 화면을 미리 확인해보세요.`,
    robots: { index: false, follow: false },
  };
}

export default async function TemplatePreviewPage({ params, searchParams }: PageProps) {
  const { templateKey } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const layoutModeParam = Array.isArray(resolvedSearchParams.layoutMode)
    ? resolvedSearchParams.layoutMode[0]
    : resolvedSearchParams.layoutMode;
  const previewLayoutMode =
    templateKey === "cafe_design_a" && layoutModeParam === "balancedExperimental"
      ? "balancedExperimental"
      : undefined;

  if (!isValidTemplateKey(templateKey)) {
    notFound();
  }

  const data = buildPreviewData(templateKey);

  return <MenuPageRenderer mode="preview" previewLayoutMode={previewLayoutMode} {...data} />;
}
