import MenuTemplateRenderer from "@/components/menu-templates/MenuTemplateRenderer";
import type { MenuPageData } from "@/lib/menu-page-data";

type MenuPageRendererProps = MenuPageData & {
  mode: "public" | "preview";
};

export default function MenuPageRenderer({ mode, ...data }: MenuPageRendererProps) {
  return (
    <>
      {mode === "preview" && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold leading-relaxed text-amber-900 shadow-sm">
          미리보기 모드입니다. 아직 공개되지 않은 메뉴판도 이 화면에서는 확인할 수 있습니다.
        </div>
      )}
      <MenuTemplateRenderer mode={mode} {...data} />
    </>
  );
}
