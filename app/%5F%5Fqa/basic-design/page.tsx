import { notFound } from "next/navigation";
import TypographySettingsForm from "@/components/mypage/menu-editor/TypographySettingsForm";
import MenuSurfaceSettingsForm from "@/components/mypage/menu-editor/MenuSurfaceSettingsForm";
import { getKoreanFontOption, getEnglishFontOption } from "@/lib/font-options";
import { normalizeTypographyRoleSettings } from "@/lib/template-typography-presets";
import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import DefaultDesignScope from "@/components/menu-templates/defaults/DefaultDesignScope";
import styles from "@/components/menu-templates/defaults/DefaultDesignPreview.module.css";
import { buildCafeAWidgetLengthFixture, parseCafeAWidgetLengthFixtureOptions } from "@/lib/template-demo-data/cafe-a-widget-length-fixture";
import { buildDefaultDesignPreview } from "@/lib/default-design-preview";
import { getDefaultDesignReview } from "@/lib/menu-design-policy";
import { getDefaultDesignOptions } from "@/lib/default-design-options";
import { applyPreviewDesign, readPreviewDesign } from "@/lib/menu-preview-design";

export const metadata = { title: "Basic shared design fixture", robots: { index: false, follow: false } };

/** Local sample data only; never reads or writes a customer menu. */
export default async function BasicDesignFixture({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const query = await searchParams;
  const first = (key: string) => { const value = query[key]; return Array.isArray(value) ? value[0] : value; };
  if (first("editor") === "on") return <main className="mx-auto max-w-5xl p-6"><h1>공통 디자인 설정 검증</h1><form id="fixture-design" />
    <MenuSurfaceSettingsForm pageSettings={{}} settings={{}} templateKey="cafe_design_a" formId="fixture-design" />
    <TypographySettingsForm formId="fixture-design" initialFont={getKoreanFontOption("pretendard")!} defaultFont={getKoreanFontOption("pretendard")!} initialEnglishFont={getEnglishFontOption("alata")!} defaultEnglishFont={getEnglishFontOption("outfit")!} hasCustomKoreanFont hasCustomEnglishFont initialFontSizeScale="m" pageSettings={{design:{textColors:readPreviewDesign(first("designPreview")).textColors}}} initialRoleSettings={normalizeTypographyRoleSettings({ brand: { font_en_key: "mogra", color: "#123456" }, category: { font_en_key: "carme", color: "#654321" } })} templateType="menu" templateKey="cafe_design_a" />
  </main>;
  const device = first("device") === "mobile" ? "mobile" : first("device") === "tablet" ? "tablet" : "pc";
  const design = getDefaultDesignReview(first("design") ?? "basic-first-column", "cafe_design_a");
  if (!design) notFound();
  const fixture = buildCafeAWidgetLengthFixture(parseCafeAWidgetLengthFixtureOptions({}));
  let data = buildDefaultDesignPreview(fixture.data, design, getDefaultDesignOptions({ design: design.id, widgetsPreview: "off" }));
  const title = (first("title") ?? "CAFE ARTIMENU").slice(0, 100);
  data.menuSite = { ...data.menuSite, name: title, restaurant_name: title, business_name: title, intro_title: title, menu_cover_title: title };
  data = applyPreviewDesign(data, { fontFamily: { ko: first("ko") ?? "pretendard", en: first("font") ?? "alata" }, ...(first("panel") === "off" ? {} : { auxiliaryBackground: "#F8D689" }) }, design.itemLayout === "album");
  return <DefaultDesignScope layout={design.layout} itemLayout={design.itemLayout}><div className={styles.surface} data-default-design={design.id} data-menu-item-layout={design.itemLayout}><MenuPageRenderer mode="preview" previewDevice={device} {...data} /></div></DefaultDesignScope>;
}
