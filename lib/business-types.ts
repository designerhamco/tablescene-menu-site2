export const BUSINESS_TYPE_OPTIONS = [
  { value: "cafe", label: "카페", defaultCoverLabel: "SPECIALTY COFFEE" },
  { value: "restaurant", label: "식당", defaultCoverLabel: "TODAY'S MENU" },
  { value: "brunch", label: "브런치", defaultCoverLabel: "BRUNCH CAFE" },
  { value: "bakery", label: "베이커리", defaultCoverLabel: "BAKERY" },
  { value: "dessert", label: "디저트샵", defaultCoverLabel: "DESSERT & COFFEE" },
  { value: "fast_food", label: "패스트푸드", defaultCoverLabel: "FAST & CASUAL" },
  { value: "casual_dining", label: "캐주얼다이닝", defaultCoverLabel: "CASUAL DINING" },
  { value: "fine_dining", label: "파인다이닝", defaultCoverLabel: "FINE DINING" },
  { value: "pub_bar", label: "주점/바", defaultCoverLabel: "PUB & BAR" },
  { value: "hair_salon", label: "미용실/헤어샵", defaultCoverLabel: "HAIR SALON" },
  { value: "nail_shop", label: "네일샵", defaultCoverLabel: "NAIL SHOP" },
  { value: "beauty_esthetic", label: "피부관리/에스테틱", defaultCoverLabel: "BEAUTY ESTHETIC" },
  { value: "workshop_class", label: "공방/클래스", defaultCoverLabel: "WORKSHOP CLASS" },
  { value: "fitness_pt", label: "피트니스/PT", defaultCoverLabel: "FITNESS PT" },
  { value: "pet_shop", label: "펫샵/애견미용", defaultCoverLabel: "PET CARE" },
  { value: "clinic", label: "병원/클리닉", defaultCoverLabel: "CLINIC" },
  { value: "popup_event", label: "팝업/행사", defaultCoverLabel: "POP-UP EVENT" },
  { value: "etc", label: "기타", defaultCoverLabel: "TODAY'S MENU" },
] as const;

const BASIC_BUSINESS_CATEGORY_OPTIONS = [
  { value: "cafe", label: "카페/베이커리", defaultCoverLabel: "SPECIALTY COFFEE" },
  { value: "restaurant", label: "음식점/다이닝", defaultCoverLabel: "TODAY'S MENU" },
  { value: "beauty_esthetic", label: "뷰티/웰니스", defaultCoverLabel: "BEAUTY WELLNESS" },
  { value: "workshop_class", label: "클래스/공방", defaultCoverLabel: "WORKSHOP CLASS" },
  { value: "clinic", label: "병원/클리닉", defaultCoverLabel: "CLINIC" },
] as const;

export type BusinessTypeKey = (typeof BUSINESS_TYPE_OPTIONS)[number]["value"];
export type ApplyBusinessServiceType = "menu" | "screen" | "order" | "custom";

export function getBusinessTypeOptions(serviceType?: ApplyBusinessServiceType) {
  if (serviceType === "menu") {
    return BASIC_BUSINESS_CATEGORY_OPTIONS;
  }

  return BUSINESS_TYPE_OPTIONS;
}

export function isBusinessTypeKey(value: string): value is BusinessTypeKey {
  return BUSINESS_TYPE_OPTIONS.some((option) => option.value === value);
}

export function getBusinessTypeLabel(value: string | null | undefined) {
  return BUSINESS_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

export function getDefaultBusinessCoverLabel(value: string | null | undefined) {
  return BUSINESS_TYPE_OPTIONS.find((option) => option.value === value)?.defaultCoverLabel ?? null;
}
