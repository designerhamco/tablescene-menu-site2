import "server-only";

import {
  getDefaultStaffCallItems,
  normalizeStaffCallItems,
  StaffCallItemInputError,
  type StaffCallItem,
} from "@/lib/call-items";
import { normalizeCallId } from "@/lib/call-management";
import { requireMenuSiteWriteAccess } from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";

type CallItemRpcRow = {
  item_key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export class CallItemServiceError extends Error {
  constructor(
    public readonly code: "INVALID_INPUT" | "READ_FAILED" | "UPDATE_FAILED",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CallItemServiceError";
  }
}

function mapRows(value: unknown): StaffCallItem[] {
  if (!Array.isArray(value)) {
    throw new CallItemServiceError("READ_FAILED", "호출 항목을 불러오지 못했습니다.", 500);
  }
  const rows = value as Partial<CallItemRpcRow>[];
  const items = rows.flatMap((row) => {
    if (
      typeof row.item_key !== "string"
      || typeof row.label !== "string"
      || typeof row.sort_order !== "number"
      || typeof row.is_active !== "boolean"
    ) return [];
    return [{
      key: row.item_key,
      label: row.label,
      sortOrder: row.sort_order,
      active: row.is_active,
    }];
  });
  if (items.length !== rows.length || items.length < 1) {
    throw new CallItemServiceError("READ_FAILED", "호출 항목을 불러오지 못했습니다.", 500);
  }
  return items;
}

export async function listStaffCallItems({
  menuSiteId: menuSiteIdValue,
  includeInactive = false,
}: {
  menuSiteId: unknown;
  includeInactive?: boolean;
}): Promise<StaffCallItem[]> {
  let menuSiteId: string;
  try {
    menuSiteId = normalizeCallId(menuSiteIdValue);
  } catch {
    throw new CallItemServiceError("INVALID_INPUT", "메뉴판 정보를 다시 확인해 주세요.", 400);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("list_menu_call_items", {
    p_menu_site_id: menuSiteId,
    p_include_inactive: includeInactive,
  });
  if (error) {
    console.warn("[call-items] read failed", { code: error.code ?? "unknown", message: error.message ?? "unknown" });
    throw new CallItemServiceError("READ_FAILED", "호출 항목을 불러오지 못했습니다.", 500);
  }
  return mapRows(data);
}

export async function saveStaffCallItems({
  menuSiteId: menuSiteIdValue,
  items: itemsValue,
}: {
  menuSiteId: unknown;
  items: unknown;
}): Promise<StaffCallItem[]> {
  let menuSiteId: string;
  let items: StaffCallItem[];
  try {
    menuSiteId = normalizeCallId(menuSiteIdValue);
    items = normalizeStaffCallItems(itemsValue);
  } catch (error) {
    throw new CallItemServiceError(
      "INVALID_INPUT",
      error instanceof StaffCallItemInputError ? error.message : "호출 항목을 다시 확인해 주세요.",
      400,
    );
  }

  await requireMenuSiteWriteAccess(menuSiteId, "call.manage", "call_item_configuration");
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("replace_menu_call_items", {
    p_menu_site_id: menuSiteId,
    p_items: items.map((item) => ({
      key: item.key,
      label: item.label,
      sortOrder: item.sortOrder,
      active: item.active,
    })),
  });
  if (error) {
    console.warn("[call-items] update failed", { code: error.code ?? "unknown", message: error.message ?? "unknown" });
    throw new CallItemServiceError("UPDATE_FAILED", "호출 항목을 저장하지 못했습니다.", 500);
  }
  return mapRows(data);
}

export function getPreviewStaffCallItems() {
  return getDefaultStaffCallItems();
}
