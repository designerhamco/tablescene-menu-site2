import MenuTemplateRenderer from "@/components/menu-templates/MenuTemplateRenderer";
import type { MenuPageData } from "@/lib/menu-page-data";

type MenuPageRendererProps = MenuPageData & {
  mode: "public" | "preview";
  initialPreviewPageId?: string | null;
};

export default function MenuPageRenderer({ mode, ...data }: MenuPageRendererProps) {
  return <MenuTemplateRenderer key={data.initialPreviewPageId ?? "default-preview-page"} mode={mode} {...data} />;
}
