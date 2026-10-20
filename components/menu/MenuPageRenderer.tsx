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
  return <MenuLocaleScope locale={data.locale}><MenuTemplateRenderer key={data.initialPreviewPageId ?? "default-preview-page"} mode={mode} {...data} />{data.menuSite.template_key !== "display_menu_a" && popup.enabled && popup.images.length > 0 ? <MenuAdvertisementPopup settings={popup} /> : null}</MenuLocaleScope>;
}
