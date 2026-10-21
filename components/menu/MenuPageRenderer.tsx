import MenuAppearanceScope from "@/components/menu-templates/shared/MenuAppearanceScope";
import { readMenuAppearance } from "@/lib/menu-appearance";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { isAubeTableTemplate } from "@/lib/aube-table";
import MenuAdvertisementPopup from "@/components/public-menu/MenuAdvertisementPopup";
import { readMenuPopupSettings } from "@/lib/menu-popup";
import MenuLocaleScope from "@/components/menu-templates/shared/MenuLocaleScope";
import MenuTemplateRenderer from "@/components/menu-templates/MenuTemplateRenderer";
import type { OrderCallEntryConfig } from "@/components/public-menu/order-call/types";
import type { MenuPageData } from "@/lib/menu-page-data";
import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";

type MenuPageRendererProps = MenuPageData & {
  mode: "public" | "preview";
  initialPreviewPageId?: string | null;
  pagePresentation?: "one" | "multi";
  orderCallConfig?: OrderCallEntryConfig;
  previewDevice?: MenuPreviewDevice;
};

export default function MenuPageRenderer({ mode, ...data }: MenuPageRendererProps) {
  const popup = readMenuPopupSettings(data.menuSite.settings);
  const basic = getTemplateCapabilities(data.menuSite.template_key).menuCover.coverMode === "section";
  const supportsShapes = basic || isAubeTableTemplate(data.menuSite.template_key);
  const appearance = readMenuAppearance(data.menuSite.page_settings);
  return <MenuLocaleScope locale={data.locale}><MenuAppearanceScope pageSettings={data.menuSite.page_settings} templateKey={data.menuSite.template_key}><MenuTemplateRenderer key={data.initialPreviewPageId ?? "default-preview-page"} mode={mode} {...data} />{data.menuSite.template_key !== "display_menu_a" && popup.enabled && popup.images.length > 0 ? <MenuAdvertisementPopup settings={popup} imageRadius={supportsShapes ? appearance.imageRadii.advertisement : undefined} /> : null}</MenuAppearanceScope></MenuLocaleScope>;
}
