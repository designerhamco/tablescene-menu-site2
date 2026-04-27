export const templateCategoryFilters = [
  { key: "all", label: "전체" },
  { key: "cafe", label: "카페" },
  { key: "fine_dining", label: "파인다이닝" },
  { key: "casual_dining", label: "캐주얼다이닝" },
  { key: "fast_food", label: "패스트푸드" },
  { key: "brunch", label: "브런치" },
] as const;

export const templateCatalog = [
  {
    key: "design_a",
    name: "Clean Basic",
    description: "깔끔하고 범용적인 기본 메뉴판 템플릿입니다. 메뉴 수가 많아도 빠르게 훑어보기 좋습니다.",
    categories: ["cafe", "casual_dining", "brunch"],
    categoryLabels: ["카페", "캐주얼다이닝", "브런치"],
    badge: "추천",
    active: true,
    thumbnailTone: "light",
    thumbnailUrl: null,
  },
  {
    key: "design_b",
    name: "Visual Menu",
    description: "대표 이미지와 추천 메뉴를 강조하는 템플릿입니다. 사진 중심 메뉴판에 어울립니다.",
    categories: ["cafe", "fast_food", "brunch"],
    categoryLabels: ["카페", "패스트푸드", "브런치"],
    badge: "비주얼",
    active: true,
    thumbnailTone: "warm",
    thumbnailUrl: null,
  },
  {
    key: "design_c",
    name: "Premium Dining",
    description: "코스, 스토리, 브랜드 분위기를 차분하게 보여주는 프리미엄 다이닝 템플릿입니다.",
    categories: ["fine_dining", "casual_dining"],
    categoryLabels: ["파인다이닝", "캐주얼다이닝"],
    badge: "프리미엄",
    active: true,
    thumbnailTone: "dark",
    thumbnailUrl: null,
  },
] as const;

export type TemplateCategoryKey = (typeof templateCategoryFilters)[number]["key"];
export type TemplateKey = (typeof templateCatalog)[number]["key"];
export type TemplateCatalogItem = (typeof templateCatalog)[number];

export const templateKeys = templateCatalog.map((template) => template.key) as TemplateKey[];
