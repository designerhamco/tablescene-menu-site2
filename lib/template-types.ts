export type TemplateType = "menu" | "price_list" | "schedule";
export type TemplateServiceType = "basic" | "display";

export type TemplateEditorTabKey =
  | "basic"
  | "pages"
  | "intro"
  | "cover"
  | "menu"
  | "schedule"
  | "about"
  | "events"
  | "design"
  | "localization"
  | "publish";

export type TemplateEditorLabels = {
  pageLabel: string;
  categoryLabel: string;
  categoryPluralLabel: string;
  itemLabel: string;
  itemPluralLabel: string;
  itemNameLabel: string;
  itemDescriptionLabel: string;
  priceLabel: string;
  categoryNamePlaceholder: string;
  categoryGuideText: string;
  itemNamePlaceholder: string;
  itemDescriptionPlaceholder: string;
  itemDescriptionHelperText: string;
  pricePlaceholder: string;
  priceLabelLabel: string;
  priceLabelPlaceholder: string;
  priceLabelHelperText: string;
  imageLabel: string;
  imagePendingText: string;
  durationLabel?: string;
  scheduleLabel?: string;
};

export type TemplateEditorTab = {
  key: TemplateEditorTabKey;
  label: string;
  status?: "ready" | "todo";
};

export type TemplateTypeOption = {
  type: TemplateType;
  label: string;
  description: string;
};

export const TEMPLATE_TYPE_LABELS = {
  menu: "메뉴형",
  price_list: "가격표형",
  schedule: "일정표형",
} as const satisfies Record<TemplateType, string>;

export const TEMPLATE_TYPE_DESCRIPTIONS = {
  menu: {
    short: "메뉴명과 가격을 카테고리별로 보여주는 메뉴형 템플릿",
    description: "카페/베이커리, 음식점/다이닝처럼 메뉴명, 가격, 설명, 이미지를 보여주는 매장에 적합합니다.",
  },
  price_list: {
    short: "서비스명과 가격을 깔끔하게 보여주는 가격표형 템플릿",
    description: "뷰티/웰니스, 병원/클리닉처럼 서비스 항목과 가격을 보여주는 매장에 적합합니다.",
  },
  schedule: {
    short: "요일과 시간 중심으로 수업을 보여주는 일정표형 템플릿",
    description: "클래스/공방처럼 요일, 시간, 강사, 장소를 보여주는 일정표형 템플릿입니다. 준비 중입니다.",
  },
} as const satisfies Record<TemplateType, { short: string; description: string }>;

export const TEMPLATE_SERVICE_LABELS = {
  basic: "메뉴링크 베이직",
  display: "메뉴링크 디스플레이",
} as const satisfies Record<TemplateServiceType, string>;

export const TEMPLATE_TYPE_OPTIONS_BY_SERVICE = {
  basic: ["menu", "price_list", "schedule"],
  display: ["menu", "price_list"],
} as const satisfies Record<TemplateServiceType, readonly TemplateType[]>;

const TEMPLATE_SERVICE_ALLOWLIST: Record<TemplateServiceType, readonly string[]> = {
  basic: [
    "cafe_design_a",
    "cafe_design_b",
    "cafe_design_c",
    "fine_dining_design_a",
    "fine_dining_design_b",
    "casual_dining_design_a",
    "casual_dining_design_b",
    "fast_food_design_a",
    "fast_food_design_b",
    "brunch_design_a",
    "brunch_design_b",
    "beauty_price_a",
    "clinic_price_a",
    "yoga_schedule_a",
    "pilates_schedule_a",
  ],
  display: [
    "display_menu_a",
  ],
};

const TEMPLATE_TYPE_BY_TEMPLATE_KEY: Record<string, TemplateType> = {
  display_menu_a: "menu",
  cafe_design_a: "menu",
  cafe_design_b: "menu",
  cafe_design_c: "menu",
  fine_dining_design_a: "menu",
  fine_dining_design_b: "menu",
  casual_dining_design_a: "menu",
  casual_dining_design_b: "menu",
  fast_food_design_a: "menu",
  fast_food_design_b: "menu",
  brunch_design_a: "menu",
  brunch_design_b: "menu",

  // TODO: Add these template keys when price-list templates are created.
  beauty_price_a: "price_list",
  clinic_price_a: "price_list",

  // TODO: Schedule templates are a phase-2 feature. Do not add schedule CRUD in this foundation step.
  yoga_schedule_a: "schedule",
  pilates_schedule_a: "schedule",
};

const TEMPLATE_TYPE_BY_PREFIX: readonly { prefix: string; type: TemplateType }[] = [
  { prefix: "hair_salon_", type: "price_list" },
  { prefix: "nail_shop_", type: "price_list" },
  { prefix: "beauty_esthetic_", type: "price_list" },
  { prefix: "clinic_", type: "price_list" },
  { prefix: "fitness_pt_", type: "price_list" },
  { prefix: "pet_shop_", type: "price_list" },
  { prefix: "workshop_class_", type: "schedule" },
  { prefix: "yoga_", type: "schedule" },
  { prefix: "pilates_", type: "schedule" },
];

export const TEMPLATE_EDITOR_LABELS = {
  menu: {
    pageLabel: "페이지",
    categoryLabel: "카테고리",
    categoryPluralLabel: "카테고리",
    itemLabel: "메뉴 아이템",
    itemPluralLabel: "메뉴 아이템 목록",
    itemNameLabel: "메뉴명",
    itemDescriptionLabel: "메뉴 설명",
    priceLabel: "가격",
    categoryNamePlaceholder: "예: 커피, 음료, 디저트",
    categoryGuideText: "카테고리는 메뉴 항목을 묶는 단위입니다. 예: 커피, 음료, 디저트, 브런치",
    itemNamePlaceholder: "예: 아메리카노, 바닐라 라떼, 티라미수",
    itemDescriptionPlaceholder: "간단한 설명을 입력하세요",
    itemDescriptionHelperText: "재료, 맛, 추천 포인트를 짧게 적어주세요.",
    pricePlaceholder: "4500",
    priceLabelLabel: "가격 표시 문구",
    priceLabelPlaceholder: "예: 4,500원, 시가, 변동가, 문의",
    priceLabelHelperText: "메뉴판에 그대로 보여줄 가격 문구입니다. 예: 4,500원, 시가, 변동가, 문의",
    imageLabel: "메뉴 이미지",
    imagePendingText: "메뉴를 먼저 추가한 뒤 이미지를 등록할 수 있습니다.",
  },
  price_list: {
    pageLabel: "가격표 페이지",
    categoryLabel: "서비스 그룹",
    categoryPluralLabel: "서비스 그룹",
    itemLabel: "서비스",
    itemPluralLabel: "서비스 목록",
    itemNameLabel: "서비스명",
    itemDescriptionLabel: "서비스 설명",
    priceLabel: "가격",
    categoryNamePlaceholder: "예: 컷, 펌, 염색, 케어, 패키지, 상담",
    categoryGuideText: "서비스 그룹은 제공하는 서비스를 묶는 단위입니다. 예: 기본 관리, 프리미엄 관리, 패키지, 상담, 옵션",
    itemNamePlaceholder: "예: 여성 컷, 젤 네일 원컬러, 수분 진정 관리, PT 체험 수업",
    itemDescriptionPlaceholder: "예: 기본 상담 포함, 약 60분 소요",
    itemDescriptionHelperText: "서비스에 포함되는 내용, 안내사항, 소요 시간을 함께 적어주세요. 예: 기본 케어 포함, 약 60분 소요",
    pricePlaceholder: "35000",
    priceLabelLabel: "표시용 가격",
    priceLabelPlaceholder: "예: 변동가, 문의, 월 99,000원, 패키지 250,000원",
    priceLabelHelperText: "표시용 가격을 입력하면 숫자 가격 대신 해당 문구가 우선 표시됩니다. 예: 변동가, 문의, 월 99,000원, 체험 수업 30,000원, 패키지 250,000원",
    imageLabel: "서비스 이미지",
    imagePendingText: "서비스를 먼저 추가한 뒤 이미지를 등록할 수 있습니다.",
    // TODO: price_list 타입에서 duration 필드가 필요할 수 있음.
    // 추후 menu_items.duration 또는 item_metadata 구조 검토.
    durationLabel: "소요 시간",
  },
  schedule: {
    pageLabel: "일정표 페이지",
    categoryLabel: "일정 그룹",
    categoryPluralLabel: "일정 그룹",
    itemLabel: "수업 / 일정",
    itemPluralLabel: "수업 일정",
    itemNameLabel: "수업명",
    itemDescriptionLabel: "수업 설명",
    priceLabel: "가격",
    categoryNamePlaceholder: "예: 오전반, 저녁반, 주말반",
    categoryGuideText: "일정 그룹은 수업이나 일정을 묶는 단위입니다. 일정표형 입력 UI는 준비 중입니다.",
    itemNamePlaceholder: "예: 베이직 요가, 리포머 필라테스",
    itemDescriptionPlaceholder: "예: 초급 대상, 준비물 안내",
    itemDescriptionHelperText: "일정표형 입력 UI는 준비 중입니다.",
    pricePlaceholder: "30000",
    priceLabelLabel: "가격 표시 문구",
    priceLabelPlaceholder: "예: 월 120,000원, 문의",
    priceLabelHelperText: "일정표형 입력 UI는 준비 중입니다.",
    imageLabel: "수업 이미지",
    imagePendingText: "일정표형 입력 UI는 준비 중입니다.",
    scheduleLabel: "일정표",
  },
} as const satisfies Record<TemplateType, TemplateEditorLabels>;

const TEMPLATE_EDITOR_TABS = {
  menu: [
    { key: "basic", label: "기본 정보" },
    { key: "pages", label: "페이지 설정" },
    { key: "cover", label: "커버 이미지" },
    { key: "menu", label: "메뉴 관리" },
    { key: "design", label: "디자인" },
    { key: "about", label: "소개" },
    { key: "events", label: "이벤트" },
    { key: "publish", label: "공개 설정" },
  ],
  price_list: [
    { key: "basic", label: "기본 정보" },
    { key: "pages", label: "페이지 설정" },
    { key: "cover", label: "커버 이미지" },
    { key: "menu", label: "가격표 관리" },
    { key: "design", label: "디자인" },
    { key: "about", label: "소개" },
    { key: "events", label: "이벤트" },
    { key: "publish", label: "공개 설정" },
  ],
  schedule: [
    { key: "basic", label: "기본 정보" },
    { key: "schedule", label: "일정표 관리", status: "todo" },
    { key: "menu", label: "가격표 관리" },
    { key: "design", label: "디자인" },
    { key: "publish", label: "공개 설정" },
  ],
} as const satisfies Record<TemplateType, readonly TemplateEditorTab[]>;

const CAFE_DESIGN_A_EDITOR_TABS = [
  { key: "basic", label: "기본 정보" },
  { key: "cover", label: "커버 이미지" },
  { key: "menu", label: "메뉴 관리" },
  { key: "design", label: "디자인" },
  { key: "localization", label: "다국어" },
  { key: "publish", label: "공개 설정" },
] as const satisfies readonly TemplateEditorTab[];

const DISPLAY_MENU_A_EDITOR_TABS = [
  { key: "basic", label: "기본 정보" },
  { key: "menu", label: "메뉴 관리" },
  { key: "design", label: "디자인" },
  { key: "localization", label: "다국어" },
  { key: "publish", label: "공개 설정" },
] as const satisfies readonly TemplateEditorTab[];

export const TEMPLATE_EDIT_CONFIG = {
  cafe_design_a: {
    tabs: CAFE_DESIGN_A_EDITOR_TABS,
    heroMode: "featured",
  },
  display_menu_a: {
    tabs: DISPLAY_MENU_A_EDITOR_TABS,
  },
} as const satisfies Record<string, { tabs: readonly TemplateEditorTab[]; heroMode?: "featured" | "cover" }>;

const TEMPLATE_EDIT_CONFIG_ALIASES: Record<string, keyof typeof TEMPLATE_EDIT_CONFIG> = {
  cafea: "cafe_design_a",
  cafe_a: "cafe_design_a",
  cafe_design_a: "cafe_design_a",
};

function normalizeTemplateConfigKey(templateKey: string | null | undefined) {
  return templateKey?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
}

export function getTemplateEditConfig(templateKey: string | null | undefined) {
  const normalizedKey = normalizeTemplateConfigKey(templateKey);
  const configKey = TEMPLATE_EDIT_CONFIG_ALIASES[normalizedKey] ?? normalizedKey;
  return TEMPLATE_EDIT_CONFIG[configKey as keyof typeof TEMPLATE_EDIT_CONFIG] ?? null;
}

export function getTemplateType(templateKey: string | null | undefined): TemplateType {
  const key = templateKey?.trim() ?? "";
  if (!key) return "menu";

  const directType = TEMPLATE_TYPE_BY_TEMPLATE_KEY[key];
  if (directType) return directType;

  return TEMPLATE_TYPE_BY_PREFIX.find((entry) => key.startsWith(entry.prefix))?.type ?? "menu";
}

export function getTemplateTypeLabel(templateType: TemplateType): string {
  return TEMPLATE_TYPE_LABELS[templateType] ?? TEMPLATE_TYPE_LABELS.menu;
}

export function getTemplateServiceLabel(serviceType: TemplateServiceType): string {
  return TEMPLATE_SERVICE_LABELS[serviceType] ?? TEMPLATE_SERVICE_LABELS.basic;
}

export function getTemplateTypeDescription(templateType: TemplateType): string {
  return TEMPLATE_TYPE_DESCRIPTIONS[templateType]?.description ?? TEMPLATE_TYPE_DESCRIPTIONS.menu.description;
}

export function getTemplateTypeShortDescription(templateType: TemplateType): string {
  return TEMPLATE_TYPE_DESCRIPTIONS[templateType]?.short ?? TEMPLATE_TYPE_DESCRIPTIONS.menu.short;
}

export function getSupportedServices(templateKey: string | null | undefined): readonly TemplateServiceType[] {
  if (!templateKey) return [];

  return (Object.keys(TEMPLATE_SERVICE_ALLOWLIST) as TemplateServiceType[]).filter((serviceType) =>
    TEMPLATE_SERVICE_ALLOWLIST[serviceType].includes(templateKey)
  );
}

export function isTemplateSupportedForService(templateKey: string | null | undefined, serviceType: TemplateServiceType): boolean {
  return getSupportedServices(templateKey).includes(serviceType);
}

export function getTemplatesForService<T extends { key: string }>(templates: readonly T[], serviceType: TemplateServiceType): T[] {
  return templates.filter((template) => isTemplateSupportedForService(template.key, serviceType));
}

export function getTemplateTypeOptionsForService(serviceType: TemplateServiceType): TemplateTypeOption[] {
  return TEMPLATE_TYPE_OPTIONS_BY_SERVICE[serviceType].map((type) => ({
    type,
    label: getTemplateTypeLabel(type),
    description: getTemplateTypeDescription(type),
  }));
}

export function getTemplateTypeLabelByTemplateKey(templateKey: string | null | undefined): string {
  return getTemplateTypeLabel(getTemplateType(templateKey));
}

export function getEditorLabelsByTemplateType(templateType: TemplateType): TemplateEditorLabels {
  return TEMPLATE_EDITOR_LABELS[templateType] ?? TEMPLATE_EDITOR_LABELS.menu;
}

export function getTemplateEditorLabels(templateKey: string | null | undefined): TemplateEditorLabels {
  return getEditorLabelsByTemplateType(getTemplateType(templateKey));
}

export function getTemplateEditorTabs(templateKey: string | null | undefined): readonly TemplateEditorTab[] {
  const templateConfig = getTemplateEditConfig(templateKey);
  if (templateConfig) return templateConfig.tabs;

  return TEMPLATE_EDITOR_TABS[getTemplateType(templateKey)] ?? TEMPLATE_EDITOR_TABS.menu;
}

export const SCHEDULE_TEMPLATE_TODO = [
  "schedule_items table is planned for phase 2 and is intentionally not created here.",
  "Expected fields: id, menu_site_id, page_id, day_of_week, date, start_time, end_time, title, instructor_name, location, level, capacity, description, sort_order, visible.",
  "Schedule CRUD and public schedule rendering should be added only when schedule templates are officially implemented.",
] as const;
