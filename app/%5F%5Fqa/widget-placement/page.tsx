import { notFound } from "next/navigation";
import type { ComponentProps } from "react";
import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import MenuManagementSection from "@/components/mypage/menu-editor/MenuManagementSection";
import SitePage from "@/components/layout/SitePage";
import { buildWidgetPlacementFixture } from "@/lib/template-demo-data/widget-placement-fixture";
import { getTemplateByKey } from "@/lib/templates";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { getDefaultDesignReview } from "@/lib/menu-design-policy";
import { buildOnePageCallPreviewConfig } from "@/lib/one-page-call-preview";
import { getDefaultBadgeStyles } from "@/lib/template-badge-styles";

export default async function WidgetPlacementQa({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const first = (key: string) => { const value = query[key]; return Array.isArray(value) ? value[0] : value; };
  const key = getTemplateByKey(first("template") ?? "cafe_mocha_forest_a").key;
  const data = buildWidgetPlacementFixture(key, first("variant"));
  if (first("editor") === "on") {
    const capabilities = getTemplateCapabilities(key);
    const usage = { used: 0, limit: 0, period: "QA", last_used_at: null };
    const props = { menuId: data.menuSite.id, templateKey: key, menuPages: data.pages, categories: data.categories, items: data.items,
      priceOptions: data.priceOptions, traits: data.traits, capabilities, initialMenuWidgets: data.widgets,
      menuWidgetCapability: capabilities.menuWidgets, canManagePages: true, aiDescriptionUsage: usage, aiMenuCleanupUsage: usage,
      badgeStyles: getDefaultBadgeStyles(key) } as unknown as ComponentProps<typeof MenuManagementSection>;
    return <SitePage title="위젯 배치 검수"><MenuManagementSection {...props} /></SitePage>;
  }
  const device = first("device") === "mobile" ? "mobile" : first("device") === "tablet" ? "tablet" : "pc";
  const design = getDefaultDesignReview(first("design"), key);
  if (first("cover") === "on") {
    data.pageSettings = { ...data.pageSettings, menu_cover_enabled: true };
    data.menuSite.page_settings = data.pageSettings;
  }
  if (first("coverImage") === "off") data.pageSettings.cover_image_visible = false;
  const noticeCount = Number(first("notices"));
  if (first("notices") !== undefined && [0, 1, 2, 3].includes(noticeCount)) {
    const settings = data.menuSite.settings as Record<string, unknown>;
    for (let index = 1; index <= 3; index++) settings[`footer_notice_${index}`] = index <= noticeCount ? `안내사항 ${index}${first("longNotice") === "on" ? " — 계절과 재료 상황에 따라 일부 메뉴가 변경될 수 있습니다. 자세한 내용은 직원에게 문의해 주세요." : ""}` : "";
  }
  if (first("layout") === "orderedFit") data.previewLayoutMode = "orderedFit";
  const orderCallConfig = buildOnePageCallPreviewConfig({ enabled: first("call") === "on", templateKey: key, menuSiteId: data.menuSite.id, storeName: data.menuSite.name }) ?? (first("call") === "on" && key.startsWith("dining_") ? { mode: "active" as const, callEnabled: true, orderEnabled: false, hasValidTableSession: true, orderingOpen: false, languageSlotEnabled: true, tableLabel: "Table 1", menuSiteId: data.menuSite.id, storeName: data.menuSite.name, previewOnly: true } : undefined);
  if (design) data.menuSite.settings = { ...data.menuSite.settings as Record<string, unknown>, menu_design_id: design.id };
  const renderer = <MenuPageRenderer orderCallConfig={orderCallConfig} {...data} mode="preview" previewDevice={device} initialPreviewPageId={first("cover") === "on" ? undefined : data.pages[0].id} pagePresentation={first("multi") === "on" ? "multi" : "one"} />;
  return renderer;
}
