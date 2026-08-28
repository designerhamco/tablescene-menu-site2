export type StaffCallItem = {
  key: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

export const MAX_STAFF_CALL_ITEMS = 12;
export const MAX_STAFF_CALL_ITEM_LABEL_LENGTH = 30;
const STAFF_CALL_ITEM_KEY_PATTERN = /^[a-z0-9_]{1,64}$/;

export const DEFAULT_STAFF_CALL_ITEMS = [
  { key: "staff", label: "직원 호출", sortOrder: 0, active: true },
  { key: "water", label: "물 요청", sortOrder: 1, active: true },
  { key: "apron", label: "앞치마 요청", sortOrder: 2, active: true },
  { key: "tableware", label: "식기 요청", sortOrder: 3, active: true },
  { key: "table_cleanup", label: "테이블 정리", sortOrder: 4, active: true },
  { key: "order_help", label: "주문 도움", sortOrder: 5, active: true },
] as const satisfies readonly StaffCallItem[];

export function getDefaultStaffCallItems(): StaffCallItem[] {
  return DEFAULT_STAFF_CALL_ITEMS.map((item) => ({ ...item }));
}

export function createCustomStaffCallItemKey() {
  return `custom_${crypto.randomUUID().replaceAll("-", "")}`;
}

export class StaffCallItemInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffCallItemInputError";
  }
}

export function normalizeStaffCallItems(value: unknown): StaffCallItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_STAFF_CALL_ITEMS) {
    throw new StaffCallItemInputError(`호출 항목은 1개 이상 ${MAX_STAFF_CALL_ITEMS}개 이하로 설정해 주세요.`);
  }

  const items = value.map((candidate, sortOrder) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new StaffCallItemInputError("호출 항목을 다시 확인해 주세요.");
    }
    const item = candidate as Partial<StaffCallItem>;
    const key = typeof item.key === "string" ? item.key.trim() : "";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!STAFF_CALL_ITEM_KEY_PATTERN.test(key)) {
      throw new StaffCallItemInputError("호출 항목 식별자가 올바르지 않습니다.");
    }
    if (!label || label.length > MAX_STAFF_CALL_ITEM_LABEL_LENGTH) {
      throw new StaffCallItemInputError(`호출 항목 이름은 ${MAX_STAFF_CALL_ITEM_LABEL_LENGTH}자 이하로 입력해 주세요.`);
    }
    return { key, label, sortOrder, active: item.active === true };
  });

  if (new Set(items.map((item) => item.key)).size !== items.length) {
    throw new StaffCallItemInputError("중복된 호출 항목 식별자가 있습니다.");
  }
  if (new Set(items.map((item) => item.label.toLocaleLowerCase("ko-KR"))).size !== items.length) {
    throw new StaffCallItemInputError("같은 이름의 호출 항목은 한 번만 사용할 수 있습니다.");
  }
  if (!items.some((item) => item.active)) {
    throw new StaffCallItemInputError("사용 중인 호출 항목을 1개 이상 남겨 주세요.");
  }

  return items;
}
