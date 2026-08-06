import MenuTemplateRenderer from "@/components/menu-templates/MenuTemplateRenderer";
import type { OrderCallEntryConfig } from "@/components/public-menu/order-call/types";
import type { MenuPageData } from "@/lib/menu-page-data";

type MenuPageRendererProps = MenuPageData & {
  mode: "public" | "preview";
  initialPreviewPageId?: string | null;
  pagePresentation?: "one" | "multi";
  orderCallConfig?: OrderCallEntryConfig;
};

export default function MenuPageRenderer({ mode, ...data }: MenuPageRendererProps) {
  return <MenuTemplateRenderer key={data.initialPreviewPageId ?? "default-preview-page"} mode={mode} {...data} />;
}
