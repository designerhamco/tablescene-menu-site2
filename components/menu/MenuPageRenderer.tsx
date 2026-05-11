import MenuTemplateRenderer from "@/components/menu-templates/MenuTemplateRenderer";
import type { MenuPageData } from "@/lib/menu-page-data";

type MenuPageRendererProps = MenuPageData & {
  mode: "public" | "preview";
};

export default function MenuPageRenderer({ mode, ...data }: MenuPageRendererProps) {
  return <MenuTemplateRenderer mode={mode} {...data} />;
}
