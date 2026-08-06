export const MENU_TABLE_MUTABLE_STATUSES = ["active", "disabled"] as const;

export type MenuTableMutableStatus = (typeof MENU_TABLE_MUTABLE_STATUSES)[number];

export type MenuTableListItem = {
  id: string;
  label: string;
  displayOrder: number;
  status: MenuTableMutableStatus;
  tokenRotatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export class MenuTableInputError extends Error {
  readonly code: "INVALID_ID" | "INVALID_LABEL" | "INVALID_STATUS";

  constructor(
    code: "INVALID_ID" | "INVALID_LABEL" | "INVALID_STATUS",
    message: string,
  ) {
    super(message);
    this.name = "MenuTableInputError";
    this.code = code;
  }
}

export function normalizeMenuTableId(value: string) {
  const normalized = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new MenuTableInputError("INVALID_ID", "테이블 정보를 확인할 수 없습니다.");
  }
  return normalized;
}

export function normalizeMenuTableLabel(value: string) {
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 80) {
    throw new MenuTableInputError("INVALID_LABEL", "테이블 이름은 1자 이상 80자 이하로 입력해 주세요.");
  }
  return normalized;
}

export function normalizeMenuTableStatus(value: string): MenuTableMutableStatus {
  if ((MENU_TABLE_MUTABLE_STATUSES as readonly string[]).includes(value)) {
    return value as MenuTableMutableStatus;
  }
  throw new MenuTableInputError("INVALID_STATUS", "올바른 테이블 상태를 선택해 주세요.");
}

export function toMenuTableListItem(row: {
  id: string;
  label: string;
  display_order: number;
  status: string;
  token_rotated_at: string;
  created_at: string;
  updated_at: string;
}): MenuTableListItem {
  return {
    id: normalizeMenuTableId(row.id),
    label: normalizeMenuTableLabel(row.label),
    displayOrder: row.display_order,
    status: normalizeMenuTableStatus(row.status),
    tokenRotatedAt: row.token_rotated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
