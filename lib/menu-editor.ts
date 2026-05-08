import { MENU_SECTION_LABELS, MENU_SECTION_KEYS, type PageSettings } from "@/types/menu";

export const MENU_EDITOR_TABS = [
  { key: "basic", label: "기본 정보" },
  { key: "pages", label: "페이지 설정" },
  { key: "intro", label: "인트로" },
  { key: "cover", label: "메뉴 커버" },
  { key: "menu", label: "메뉴 관리" },
  { key: "about", label: "소개" },
  { key: "chefs", label: "셰프 / 인물" },
  { key: "events", label: "이벤트" },
  { key: "social", label: "SNS" },
  { key: "design", label: "디자인" },
  { key: "publish", label: "공개 설정" },
] as const;

export type MenuEditorTabKey = (typeof MENU_EDITOR_TABS)[number]["key"];

export const pageSettingLabels: Record<keyof PageSettings, string> = {
  intro_enabled: "인트로 페이지 사용",
  menu_cover_enabled: "메뉴 커버 페이지 사용",
  set_menu_enabled: "세트 메뉴 페이지 사용",
  main_menu_enabled: "메인 메뉴 페이지 사용",
  dessert_drink_enabled: "디저트/음료 페이지 사용",
  about_enabled: "소개 페이지 사용",
  chefs_enabled: "셰프/인물 섹션 사용",
  events_enabled: "이벤트 페이지 사용",
  social_links_enabled: "SNS 링크 사용",
};

export const pageSettingKeys = Object.keys(pageSettingLabels) as (keyof PageSettings)[];

export const sectionKeyOptions = MENU_SECTION_KEYS.map((key) => ({
  value: key,
  label: MENU_SECTION_LABELS[key],
}));

export function isMenuEditorTabKey(value: string | null | undefined): value is MenuEditorTabKey {
  return MENU_EDITOR_TABS.some((tab) => tab.key === value);
}
