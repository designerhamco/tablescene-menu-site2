import { MENU_SECTION_LABELS, MENU_SECTION_KEYS, type PageSettings } from "@/types/menu";

export const MENU_EDITOR_TABS = [
  { key: "basic", label: "기본 정보" },
  { key: "pages", label: "페이지 설정" },
  { key: "intro", label: "인트로" },
  { key: "cover", label: "메뉴 커버" },
  { key: "menu", label: "메뉴 관리" },
  { key: "about", label: "소개" },
  { key: "events", label: "이벤트" },
  { key: "design", label: "디자인" },
  { key: "publish", label: "공개 설정" },
] as const;

export type MenuEditorTabKey = (typeof MENU_EDITOR_TABS)[number]["key"];

export const pageSettingLabels = {
  intro_enabled: "인트로 페이지 사용",
  menu_cover_enabled: "메뉴 커버 페이지 사용",
  about_enabled: "소개 페이지 사용",
} satisfies Pick<PageSettings, "intro_enabled" | "menu_cover_enabled" | "about_enabled">;

export const pageSettingKeys = Object.keys(pageSettingLabels) as (keyof typeof pageSettingLabels)[];

export const sectionKeyOptions = MENU_SECTION_KEYS.map((key) => ({
  value: key,
  label: MENU_SECTION_LABELS[key],
}));

export function isMenuEditorTabKey(value: string | null | undefined): value is MenuEditorTabKey {
  return MENU_EDITOR_TABS.some((tab) => tab.key === value);
}
