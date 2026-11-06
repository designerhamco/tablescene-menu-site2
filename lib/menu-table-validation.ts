import { orderPointKind, readOrderPointPolicy, type OrderPointKind, type OrderPointPolicy } from "./order-point-policy";

export const MENU_TABLE_MUTABLE_STATUSES = ["active", "disabled"] as const;

export type MenuTableMutableStatus = (typeof MENU_TABLE_MUTABLE_STATUSES)[number];

export type ArchivedMenuTableListItem = {
  id: string;
  label: string;
  archivedAt: string;
  kind?: OrderPointKind;
};

export type MenuTableListItem = {
  id: string;
  label: string;
  qrPath: string;
  kind?: OrderPointKind;
  policy?: OrderPointPolicy;
  policyAvailable?: boolean;
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
  qr_public_id: string;
  display_order: number;
  status: string;
  token_rotated_at: string;
  created_at: string;
  updated_at: string;
  point_kind?: string;
  terminal_order_enabled?: boolean;
  terminal_call_enabled?: boolean;
  customer_order_enabled?: boolean;
  customer_call_enabled?: boolean;
}): MenuTableListItem {
  const qrPublicId = normalizeMenuTableId(row.qr_public_id);

  return {
    id: normalizeMenuTableId(row.id),
    label: normalizeMenuTableLabel(row.label),
    qrPath: `/table/${qrPublicId}`,
    kind: orderPointKind(row.point_kind),
    policy: readOrderPointPolicy(row),
    policyAvailable: typeof row.point_kind === "string",
    displayOrder: row.display_order,
    status: normalizeMenuTableStatus(row.status),
    tokenRotatedAt: row.token_rotated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


/** Registration requires at least one real room in the persisted floor document. */
export function hasMenuTableRegistrationRoom(document: unknown): boolean {
  if (!document || typeof document !== "object" || !("rooms" in document) || !Array.isArray(document.rooms)) return false;
  return document.rooms.some(room => {
    if (!room || typeof room !== "object" || typeof room.id !== "string" || typeof room.name !== "string" || !room.name.trim()) return false;
    try { normalizeMenuTableId(room.id); return true; } catch { return false; }
  });
}
