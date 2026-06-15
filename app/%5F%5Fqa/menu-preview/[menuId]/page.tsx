import { notFound } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { normalizeLocale } from "@/lib/locales";
import { normalizeMenuPageData } from "@/lib/menu-page-data";
import { createAdminClient } from "@/lib/supabase/admin";

import QaMenuPreviewDebugOverlay from "./QaMenuPreviewDebugOverlay";

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams?: Promise<{
    debugLayout?: string | string[];
    lang?: string | string[];
    layoutMode?: string | string[];
  }>;
};

const baseSiteSelect =
  "id, user_id, name, slug, template_key, status, description, logo_url, cover_image_url, intro_image_url, brand_color, business_name, business_address, business_phone, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, intro_title, intro_description, brand_description, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, settings, page_settings";
const siteSelect = baseSiteSelect
  .replace("template_key", "template_key, template_category")
  .replace("restaurant_category", "restaurant_category, restaurant_type")
  .replace("menu_cover_title", "menu_cover_label, menu_cover_title");

export const dynamic = "force-dynamic";

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPreviewLayoutMode(value: string | string[] | undefined) {
  const layoutMode = getSearchParamValue(value);
  return layoutMode === "orderedFit" || layoutMode === "balancedExperimental" || layoutMode === "orderedBalancedFit"
    ? layoutMode
    : undefined;
}

export default async function QaMenuPreviewPage({ params, searchParams }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { menuId } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = normalizeLocale(getSearchParamValue(query.lang));
  const previewLayoutMode = getPreviewLayoutMode(query.layoutMode);
  const debugEnabled = getSearchParamValue(query.debugLayout) === "1";
  const admin = createAdminClient();
  const primarySiteResult = await admin.from("menu_sites").select(siteSelect).eq("id", menuId).maybeSingle();
  let site = primarySiteResult.data as unknown;
  let error = primarySiteResult.error;

  const siteErrorMessage = error?.message.toLowerCase() ?? "";
  if (error && ["template_category", "restaurant_type", "menu_cover_label"].some((column) => siteErrorMessage.includes(column))) {
    const fallbackResult = await admin.from("menu_sites").select(baseSiteSelect).eq("id", menuId).maybeSingle();
    site = fallbackResult.data as unknown;
    error = fallbackResult.error;
  }

  if (error || !site) {
    notFound();
  }

  const data = await normalizeMenuPageData(
    site as Parameters<typeof normalizeMenuPageData>[0],
    { locale },
    admin as Parameters<typeof normalizeMenuPageData>[2],
  );

  if (!data) {
    notFound();
  }

  const route = `/__qa/menu-preview/${menuId}`;
  const restaurantName = data.menuSite.restaurant_name || data.menuSite.name || menuId;

  return (
    <>
      <MenuPageRenderer mode="preview" previewLayoutMode={previewLayoutMode} {...data} />
      <QaMenuPreviewDebugOverlay debugEnabled={debugEnabled} menuId={menuId} restaurantName={restaurantName} route={route} />
    </>
  );
}
