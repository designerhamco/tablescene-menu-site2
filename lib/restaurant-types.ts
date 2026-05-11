export const RESTAURANT_TYPE_OPTIONS = [
  { value: "cafe", label: "카페", defaultCoverLabel: "SPECIALTY COFFEE" },
  { value: "brunch", label: "브런치", defaultCoverLabel: "BRUNCH CAFE" },
  { value: "fine_dining", label: "파인다이닝", defaultCoverLabel: "FINE DINING" },
  { value: "casual_dining", label: "캐주얼다이닝", defaultCoverLabel: "CASUAL DINING" },
  { value: "fast_food", label: "패스트푸드", defaultCoverLabel: "FAST & CASUAL" },
  { value: "bakery", label: "베이커리", defaultCoverLabel: "BAKERY" },
  { value: "dessert", label: "디저트샵", defaultCoverLabel: "DESSERT & COFFEE" },
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

export type RestaurantTypeKey = (typeof RESTAURANT_TYPE_OPTIONS)[number]["value"];

export function isRestaurantTypeKey(value: string): value is RestaurantTypeKey {
  return RESTAURANT_TYPE_OPTIONS.some((option) => option.value === value);
}

export function getRestaurantTypeLabel(value: string | null | undefined) {
  return RESTAURANT_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

export function getDefaultMenuCoverLabel(value: string | null | undefined) {
  return RESTAURANT_TYPE_OPTIONS.find((option) => option.value === value)?.defaultCoverLabel ?? null;
}
