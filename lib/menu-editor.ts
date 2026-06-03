import { MENU_SECTION_LABELS, MENU_SECTION_KEYS, type PageSettings } from "@/types/menu";
import type { TemplateEditorTabKey } from "@/lib/template-types";

export const MENU_EDITOR_TABS = [
  { key: "basic", label: "기본 정보" },
  { key: "pages", label: "페이지 설정" },
  { key: "cover", label: "커버 이미지" },
  { key: "menu", label: "메뉴 관리" },
  { key: "design", label: "디자인" },
  { key: "about", label: "소개" },
  { key: "events", label: "이벤트" },
  { key: "publish", label: "공개 설정" },
] as const satisfies readonly { key: Exclude<TemplateEditorTabKey, "schedule">; label: string }[];

const MENU_EDITOR_TAB_KEYS = [
  ...MENU_EDITOR_TABS.map((tab) => tab.key),
  "schedule",
  "localization",
] as const satisfies readonly TemplateEditorTabKey[];

export type MenuEditorTabKey = TemplateEditorTabKey;

export const pageSettingLabels = {
  intro_enabled: "인트로 페이지 사용",
  menu_cover_enabled: "커버 이미지 사용",
  about_enabled: "소개 페이지 사용",
} satisfies Record<keyof Pick<PageSettings, "intro_enabled" | "menu_cover_enabled" | "about_enabled">, string>;

export const pageSettingKeys = Object.keys(pageSettingLabels) as (keyof typeof pageSettingLabels)[];

export const sectionKeyOptions = MENU_SECTION_KEYS.map((key) => ({
  value: key,
  label: MENU_SECTION_LABELS[key],
}));

export function isMenuEditorTabKey(value: string | null | undefined): value is MenuEditorTabKey {
  return MENU_EDITOR_TAB_KEYS.some((key) => key === value);
}
