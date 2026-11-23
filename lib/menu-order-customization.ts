export const PRODUCT_OPTION_LIMIT = 5;
export const PRODUCT_OPTION_NAME_LIMIT = 20;
export const ORDER_LINE_REQUEST_LIMIT = 60;

export type MenuOrderCustomization = {
  title: string;
  choices: string[];
  allowRequest: boolean;
};

export const EMPTY_MENU_ORDER_CUSTOMIZATION: MenuOrderCustomization = {
  title: "",
  choices: [],
  allowRequest: false,
};

function hasControlCharacters(value: string) {
  return Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export function parseMenuOrderCustomization(value: unknown): MenuOrderCustomization {
  if (!value || typeof value !== "object" || !("title" in value) || !("choices" in value) || !("allowRequest" in value)) {
    throw new Error("상품 옵션 설정을 확인해 주세요.");
  }
  const { title, choices, allowRequest } = value;
  if (typeof title !== "string" || typeof allowRequest !== "boolean" || !Array.isArray(choices)
    || choices.length > PRODUCT_OPTION_LIMIT || choices.some(choice => typeof choice !== "string")) {
    throw new Error("상품 옵션은 최대 5개까지 등록할 수 있어요.");
  }
  const names = choices.map((choice: string) => choice.trim()).filter(Boolean);
  const normalizedTitle = title.trim();
  if (normalizedTitle.length > PRODUCT_OPTION_NAME_LIMIT || names.some(name => name.length > PRODUCT_OPTION_NAME_LIMIT)) {
    throw new Error("옵션 제목과 선택지 이름을 20자 이하로 입력해 주세요.");
  }
  if (hasControlCharacters(normalizedTitle) || names.some(hasControlCharacters)) {
    throw new Error("옵션 제목과 선택지 이름은 한 줄로 입력해 주세요.");
  }
  if (new Set(names.map(name => name.toLowerCase())).size !== names.length) {
    throw new Error("같은 상품 옵션을 두 번 등록할 수 없어요.");
  }
  return { title: normalizedTitle || (names.length > 0 ? "상품 옵션" : ""), choices: names, allowRequest };
}

export function readMenuOrderCustomization(value: unknown): MenuOrderCustomization {
  if (value == null) return EMPTY_MENU_ORDER_CUSTOMIZATION;
  try { return parseMenuOrderCustomization(value); }
  catch { return EMPTY_MENU_ORDER_CUSTOMIZATION; }
}

export function readOrderLineText(value: unknown, maxLength: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > maxLength || hasControlCharacters(value)) {
    throw new Error("주문 옵션과 요청사항을 확인해 주세요.");
  }
  return value.trim() || null;
}

export function isOrderCustomizationValid(
  config: MenuOrderCustomization,
  choice: string | null,
  request: string | null,
) {
  if (choice && !config.choices.includes(choice)) return false;
  if (request && !config.allowRequest) return false;
  return config.choices.length === 0 || Boolean(choice || request);
}
