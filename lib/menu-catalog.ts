export const MENU_CATALOG_IMPORT_MODES = ["linked", "independent"] as const;

export type MenuCatalogImportMode = (typeof MENU_CATALOG_IMPORT_MODES)[number];

export const MENU_CATALOG_LINKED_SHARED_FIELDS = [
  "카테고리명과 설명",
  "메뉴명과 설명",
  "기본 가격과 가격 문구",
  "메뉴 이미지",
  "배지와 추천 표시",
  "품절 상태",
  "메뉴 번역",
] as const;

export const MENU_CATALOG_MENU_SPECIFIC_FIELDS = [
  "메뉴 추가·삭제, 페이지 구성과 메뉴 배치",
  "노출 여부와 디자인",
  "가격 옵션과 맛·특징 지표",
  "타임세일과 위젯",
  "주문 가능 여부와 주문 옵션",
] as const;

export const MENU_CATALOG_TARGET_STATUS = "draft" as const;
export const MENU_CATALOG_CONFIRMATION = "메뉴 가져오기" as const;
export const MENU_CATALOG_DISCONNECT_CONFIRMATION = "연결 해제" as const;

export function isMenuCatalogImportMode(value: unknown): value is MenuCatalogImportMode {
  return typeof value === "string" && MENU_CATALOG_IMPORT_MODES.includes(value as MenuCatalogImportMode);
}

export function canImportIntoMenuCatalogTarget(status: string | null | undefined) {
  return status === MENU_CATALOG_TARGET_STATUS;
}

export function getMenuCatalogImportModeLabel(mode: MenuCatalogImportMode) {
  return mode === "linked" ? "메뉴 데이터 연결 유지" : "독립 복사본 만들기";
}

export function getMenuCatalogImportModeDescription(mode: MenuCatalogImportMode) {
  return mode === "linked"
    ? "가져온 카테고리와 메뉴의 공통 정보가 두 메뉴판에서 함께 변경됩니다. 배치와 디자인은 각각 유지됩니다."
    : "현재 메뉴 내용을 한 번만 복사합니다. 이후 변경사항은 다른 메뉴판에 반영되지 않습니다.";
}

export function getMenuCatalogImportResultMessage(input: {
  mode: MenuCatalogImportMode;
  itemCount: number;
}) {
  const count = Number.isFinite(input.itemCount) && input.itemCount >= 0 ? Math.floor(input.itemCount) : 0;
  return input.mode === "linked"
    ? `메뉴 ${count}개를 가져오고 공통 메뉴 연결을 시작했습니다.`
    : `메뉴 ${count}개를 독립 복사본으로 가져왔습니다.`;
}
