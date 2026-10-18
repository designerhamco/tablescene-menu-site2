export type OrderOptionValueInput = {
  id: string;
  name: string;
  priceDelta: number;
};
export type OrderOptionGroupInput = {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  values: OrderOptionValueInput[];
};
export type MenuItemOrderConfiguration = {
  id: string;
  updatedAt: string;
  orderable: boolean;
  price: number;
  groups: OrderOptionGroupInput[];
};
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("주문 옵션 형식을 확인해 주세요.");
  return value as Record<string, unknown>;
}
function id(value: unknown) {
  if (typeof value !== "string" || !UUID.test(value))
    throw new Error("상품·옵션 정보를 확인해 주세요.");
  return value;
}
function name(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 80)
    throw new Error("옵션 이름은 1~80자로 입력해 주세요.");
  return value.trim();
}
function amount(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 10_000_000
  )
    throw new Error("가격은 0~10,000,000원 사이의 정수로 입력해 주세요.");
  return value;
}
export function parseMenuItemOrderConfiguration(
  value: unknown,
): MenuItemOrderConfiguration {
  const source = record(value);
  if (typeof source.orderable !== "boolean")
    throw new Error("주문 가능 여부를 확인해 주세요.");
  if (
    typeof source.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(source.updatedAt))
  )
    throw new Error("상품을 새로고침 후 다시 저장해 주세요.");
  if (!Array.isArray(source.groups) || source.groups.length > 10)
    throw new Error("옵션 그룹은 최대 10개입니다.");
  const seen = new Set<string>();
  const uniqueId = (value: unknown) => {
    const key = id(value);
    if (seen.has(key)) throw new Error("중복된 옵션 정보입니다.");
    seen.add(key);
    return key;
  };
  const groups = source.groups.map((raw) => {
    const group = record(raw);
    if (
      typeof group.required !== "boolean" ||
      typeof group.multiple !== "boolean"
    )
      throw new Error("옵션 선택 방식을 확인해 주세요.");
    if (
      !Array.isArray(group.values) ||
      group.values.length < 1 ||
      group.values.length > 20
    )
      throw new Error("각 그룹에는 옵션을 1~20개 입력해 주세요.");
    return {
      id: uniqueId(group.id),
      name: name(group.name),
      required: group.required,
      multiple: group.multiple,
      values: group.values.map((raw) => {
        const v = record(raw);
        return {
          id: uniqueId(v.id),
          name: name(v.name),
          priceDelta: amount(v.priceDelta),
        };
      }),
    };
  });
  return {
    id: id(source.id),
    updatedAt: source.updatedAt,
    orderable: source.orderable,
    price: amount(source.price),
    groups,
  };
}
