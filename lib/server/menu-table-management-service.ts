import "server-only";
import { parseOrderPointDeletionSummary } from "@/lib/order-point-deletion";
import type { Database } from "@/lib/supabase/types";
import { orderPointKind, ORDER_POINT_POLICY_COLUMNS, orderPointPolicyKey, type OrderPointKind, type OrderPointChannel, type OrderPointFeature } from "@/lib/order-point-policy";

import {
  createMenuTableTokenMaterial,
  MenuTableInputError,
  type MenuTableListItem,
  type ArchivedMenuTableListItem,
  type MenuTableMutableStatus,
  normalizeMenuTableId,
  normalizeMenuTableLabel,
  normalizeMenuTableStatus,
  toMenuTableListItem,
} from "@/lib/menu-table-management";
import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";
import {
  getMenuSiteAccessStateForMenuSite,
  MENU_SITE_INACTIVE_EDIT_MESSAGE,
  requireMenuSitePermission,
  requireMenuSiteWriteAccess,
} from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";

type DatabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export type MenuTableManagementPageData = {
  menuSite: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  tables: MenuTableListItem[];
  archivedTables: ArchivedMenuTableListItem[];
  pointSettingsAvailable: boolean;
};

export type MenuTableTokenDelivery = {
  table: MenuTableListItem;
  qrPath: string;
};

export class MenuTableManagementError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "MENU_SITE_UNAVAILABLE"
      | "TABLE_NOT_FOUND"
      | "TABLE_CONFLICT"
      | "TABLE_LIMIT_REACHED"
      | "TABLE_CREATE_FAILED"
      | "TABLE_UPDATE_FAILED",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MenuTableManagementError";
  }
}

function inputError(error: unknown): never {
  if (error instanceof MenuTableInputError) {
    throw new MenuTableManagementError("INVALID_INPUT", error.message, 400);
  }
  throw error;
}

function mapDatabaseError(error: DatabaseError, fallbackCode: "TABLE_CREATE_FAILED" | "TABLE_UPDATE_FAILED"): never {
  const message = [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
  if (message.includes("menu_table_limit") || message.includes("at most 100") || message.includes("table limit")) {
    throw new MenuTableManagementError("TABLE_LIMIT_REACHED", "메뉴판 하나에는 테이블과 키오스크를 각각 최대 100개까지 만들 수 있습니다.", 409);
  }
  if (error.code === "23505") {
    throw new MenuTableManagementError("TABLE_CONFLICT", "같은 구분의 테이블 또는 키오스크에 같은 이름이 이미 있습니다.", 409);
  }
  throw new MenuTableManagementError(
    fallbackCode,
    fallbackCode === "TABLE_CREATE_FAILED"
      ? "테이블을 만들지 못했습니다. 잠시 후 다시 시도해 주세요."
      : "테이블 정보를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    500,
  );
}

export async function requireMenuTableReadAccess(menuSiteId: string) {
  if (!isTableManagementRuntimeEnabledForSite(menuSiteId)) {
    throw new MenuTableManagementError("MENU_SITE_UNAVAILABLE", "테이블 관리는 제품 활성화 전까지 안전하게 잠겨 있습니다.", 403);
  }
  const context = await requireMenuSitePermission(menuSiteId, "table.manage");
  const accessState = await getMenuSiteAccessStateForMenuSite({ menuSiteId });
  if (
    !accessState
    || accessState.planType !== "business_basic"
    || !accessState.canUseWriteActions
    || !accessState.canEdit
  ) {
    throw new MenuTableManagementError("MENU_SITE_UNAVAILABLE", MENU_SITE_INACTIVE_EDIT_MESSAGE, 403);
  }
  const supabase = createAdminClient();
  const { data: menuSite, error } = await supabase
    .from("menu_sites")
    .select("id, name, slug, status, template_key")
    .eq("id", menuSiteId)
    .maybeSingle();
  if (error || !menuSite?.slug || !getDiningTemplateFeatures(menuSite.template_key).smartCall) {
    throw new MenuTableManagementError("MENU_SITE_UNAVAILABLE", "이 메뉴판 유형에서는 테이블 기능을 사용할 수 없습니다.", 403);
  }
  return { context, supabase, menuSite };
}

export async function requireMenuTableWriteAccess(menuSiteId: string) {
  await requireMenuTableReadAccess(menuSiteId);
  return requireMenuSiteWriteAccess(menuSiteId, "table.manage", "menu_table_management");
}

export async function listMenuTables(menuSiteId: string, { includeArchived = false }: { includeArchived?: boolean } = {}): Promise<MenuTableManagementPageData> {
  const normalizedMenuSiteId = (() => {
    try {
      return normalizeMenuTableId(menuSiteId);
    } catch (error) {
      return inputError(error);
    }
  })();
  const { supabase, menuSite } = await requireMenuTableReadAccess(normalizedMenuSiteId);
  const tablesResult = await supabase
      .from("menu_tables")
      .select("*")
      .eq("menu_site_id", normalizedMenuSiteId)
      .in("status", includeArchived ? ["active", "disabled", "archived"] : ["active", "disabled"])
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

  if (tablesResult.error) {
    throw new MenuTableManagementError("MENU_SITE_UNAVAILABLE", "테이블 관리 정보를 불러오지 못했습니다.", 500);
  }

  const schemaProbe = !(tablesResult.data?.length) ? await supabase.from("menu_tables").select("point_kind", { head: true }).eq("menu_site_id", normalizedMenuSiteId) : null;
  return {
    pointSettingsAvailable: !schemaProbe?.error && (tablesResult.data ?? []).every(row => typeof row.point_kind === "string"),
    menuSite: {
      id: menuSite.id,
      name: menuSite.name,
      slug: menuSite.slug,
      status: menuSite.status,
    },
    tables: (tablesResult.data ?? []).filter(row => row.status !== "archived").map(toMenuTableListItem),
    archivedTables: (tablesResult.data ?? []).filter(row => row.status === "archived").map(row => ({
      id: normalizeMenuTableId(row.id), label: normalizeMenuTableLabel(row.label), archivedAt: row.archived_at!, kind: orderPointKind(row.point_kind),
    })),
  };
}

export async function restoreMenuTable({ menuSiteId, tableId, label }: { menuSiteId: string; tableId: string; label: string }) {
  let normalizedMenuSiteId: string;
  let normalizedTableId: string;
  let normalizedLabel: string;
  try {
    normalizedMenuSiteId = normalizeMenuTableId(menuSiteId);
    normalizedTableId = normalizeMenuTableId(tableId);
    normalizedLabel = normalizeMenuTableLabel(label);
  } catch (error) {
    return inputError(error);
  }
  const { context, supabase } = await requireMenuTableWriteAccess(normalizedMenuSiteId);
  // Restore as disabled so old QR codes cannot immediately accept new visits.
  const { data, error } = await supabase.from("menu_tables")
    .update({ label: normalizedLabel, status: "disabled", archived_at: null, updated_by: context.actorUserId })
    .eq("menu_site_id", normalizedMenuSiteId).eq("id", normalizedTableId).eq("status", "archived")
    .select("*").maybeSingle();
  if (error) mapDatabaseError(error, "TABLE_UPDATE_FAILED");
  if (!data) throw new MenuTableManagementError("TABLE_NOT_FOUND", "보관된 테이블을 찾을 수 없습니다. 목록을 새로고침해 주세요.", 404);
  return toMenuTableListItem(data);
}

export async function createMenuTable({
  menuSiteId,
  label,
  kind = "table",
}: {
  menuSiteId: string;
  label: string;
  kind?: OrderPointKind;
}): Promise<MenuTableTokenDelivery> {
  let normalizedMenuSiteId: string;
  let normalizedLabel: string;
  try {
    normalizedMenuSiteId = normalizeMenuTableId(menuSiteId);
    normalizedLabel = normalizeMenuTableLabel(label);
  } catch (error) {
    return inputError(error);
  }

  const { context, supabase } = await requireMenuTableWriteAccess(normalizedMenuSiteId);
  const token = createMenuTableTokenMaterial();
  const { data, error } = await supabase
    .from("menu_tables")
    .insert({
      menu_site_id: normalizedMenuSiteId,
      label: normalizedLabel,
      ...(kind === "kiosk" ? { point_kind: "kiosk", customer_order_enabled: false, customer_call_enabled: false } : {}),
      token_hash: token.tokenHash,
      created_by: context.actorUserId,
      updated_by: context.actorUserId,
    })
    .select("*")
    .maybeSingle();

  if (error && ["42703", "PGRST204"].includes(error.code)) throw new MenuTableManagementError("MENU_SITE_UNAVAILABLE", "키오스크 설정을 준비 중입니다. 설정 업데이트 후 다시 시도해 주세요.", 503);
  if (error || !data) mapDatabaseError(error ?? {}, "TABLE_CREATE_FAILED");
  const table = toMenuTableListItem(data);
  return { table, qrPath: table.qrPath };
}

export async function updateMenuTable({
  menuSiteId,
  tableId,
  label,
  status,
  expectedStatus,
}: {
  menuSiteId: string;
  tableId: string;
  label?: string;
  status?: MenuTableMutableStatus | string;
  expectedStatus?: MenuTableMutableStatus | string;
}) {
  let normalizedMenuSiteId: string;
  let normalizedTableId: string;
  let normalizedLabel: string | undefined;
  let normalizedStatus: MenuTableMutableStatus | undefined;
  let normalizedExpectedStatus: MenuTableMutableStatus | undefined;
  try {
    normalizedMenuSiteId = normalizeMenuTableId(menuSiteId);
    normalizedTableId = normalizeMenuTableId(tableId);
    normalizedLabel = label === undefined ? undefined : normalizeMenuTableLabel(label);
    normalizedStatus = status === undefined ? undefined : normalizeMenuTableStatus(status);
    normalizedExpectedStatus = expectedStatus === undefined ? undefined : normalizeMenuTableStatus(expectedStatus);
  } catch (error) {
    return inputError(error);
  }

  if (normalizedLabel === undefined && normalizedStatus === undefined) {
    throw new MenuTableManagementError("INVALID_INPUT", "변경할 이름 또는 상태를 확인해 주세요.", 400);
  }

  const { context, supabase } = await requireMenuTableWriteAccess(normalizedMenuSiteId);
  const patch: Database["public"]["Tables"]["menu_tables"]["Update"] = { updated_by: context.actorUserId };
  if (normalizedLabel !== undefined) patch.label = normalizedLabel;
  if (normalizedStatus !== undefined) patch.status = normalizedStatus;
  let query = supabase
    .from("menu_tables")
    .update(patch)
    .eq("menu_site_id", normalizedMenuSiteId)
    .eq("id", normalizedTableId)
    .neq("status", "archived");
  if (normalizedExpectedStatus !== undefined) query = query.eq("status", normalizedExpectedStatus);
  const { data, error } = await query.select("*").maybeSingle();

  if (error) mapDatabaseError(error, "TABLE_UPDATE_FAILED");
  if (!data) throw new MenuTableManagementError("TABLE_NOT_FOUND", "상태가 변경됐거나 이미 보관된 항목입니다. 새로고침 후 다시 시도해 주세요.", 409);
  return toMenuTableListItem(data);
}

export async function rotateMenuTableToken({
  menuSiteId,
  tableId,
}: {
  menuSiteId: string;
  tableId: string;
}): Promise<MenuTableTokenDelivery> {
  let normalizedMenuSiteId: string;
  let normalizedTableId: string;
  try {
    normalizedMenuSiteId = normalizeMenuTableId(menuSiteId);
    normalizedTableId = normalizeMenuTableId(tableId);
  } catch (error) {
    return inputError(error);
  }

  const { context, supabase } = await requireMenuTableWriteAccess(normalizedMenuSiteId);
  const token = createMenuTableTokenMaterial();
  const tokenRotatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("menu_tables")
    .update({
      token_hash: token.tokenHash,
      token_rotated_at: tokenRotatedAt,
      updated_by: context.actorUserId,
    })
    .eq("menu_site_id", normalizedMenuSiteId)
    .eq("id", normalizedTableId)
    .neq("status", "archived")
    .select("*")
    .maybeSingle();

  if (error) mapDatabaseError(error, "TABLE_UPDATE_FAILED");
  if (!data) throw new MenuTableManagementError("TABLE_NOT_FOUND", "테이블을 찾을 수 없거나 이미 보관되었습니다.", 404);
  const table = toMenuTableListItem(data);
  return { table, qrPath: table.qrPath };
}

export async function archiveMenuTable({
  menuSiteId,
  tableId,
}: {
  menuSiteId: string;
  tableId: string;
}) {
  let normalizedMenuSiteId: string;
  let normalizedTableId: string;
  try {
    normalizedMenuSiteId = normalizeMenuTableId(menuSiteId);
    normalizedTableId = normalizeMenuTableId(tableId);
  } catch (error) {
    return inputError(error);
  }

  const { context, supabase } = await requireMenuTableWriteAccess(normalizedMenuSiteId);
  const archivedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("menu_tables")
    .update({
      status: "archived",
      archived_at: archivedAt,
      updated_by: context.actorUserId,
    })
    .eq("menu_site_id", normalizedMenuSiteId)
    .eq("id", normalizedTableId)
    .neq("status", "archived")
    .select("id")
    .maybeSingle();

  if (error) mapDatabaseError(error, "TABLE_UPDATE_FAILED");
  if (!data) throw new MenuTableManagementError("TABLE_NOT_FOUND", "테이블을 찾을 수 없거나 이미 보관되었습니다.", 404);
  return { archived: true } as const;
}

async function requireOrderPointDeletionAccess(menuSiteId: string) {
  const access = await requireMenuSitePermission(menuSiteId, "table.manage");
  if (!access.isOwner) throw new MenuTableManagementError("MENU_SITE_UNAVAILABLE", "테이블·키오스크 삭제는 사장님만 할 수 있습니다.", 403);
  return requireMenuTableWriteAccess(menuSiteId);
}
function deletionError(error: DatabaseError): never {
  const message = error.message ?? "";
  const copy = message.includes("POINT_DELETE_CHANGED") ? "확인 중에 삭제 대상이나 내역이 변경됐습니다. 삭제 범위를 다시 확인해 주세요."
    : message.includes("POINT_DELETE_HISTORY_EXISTS") ? "사용 이력이 있어 일반 삭제할 수 없습니다. 보관해 주세요."
    : message.includes("POINT_DELETE_ARCHIVE_FIRST") ? "관련 데이터를 지우려면 먼저 보관해 주세요."
    : message.includes("POINT_DELETE_UNFINISHED") ? "처리 중인 주문·호출 또는 미결제 주문을 먼저 정리해 주세요."
    : message.includes("POINT_DELETE_CONFIRMATION_REQUIRED") ? "삭제할 테이블·키오스크 이름을 정확히 입력해 주세요."
    : message.includes("POINT_DELETE_OWNER_REQUIRED") ? "테이블·키오스크 삭제는 사장님만 할 수 있습니다."
    : message.includes("POINT_NOT_FOUND") ? "삭제 대상을 찾을 수 없습니다. 목록을 새로고침해 주세요."
    : ["PGRST202", "42883"].includes(error.code ?? "") ? "삭제 기능 업데이트를 준비 중입니다. 현재는 보관 기능을 이용해 주세요."
    : "삭제를 완료하지 못했습니다. 삭제 범위를 다시 확인해 주세요.";
  throw new MenuTableManagementError("TABLE_UPDATE_FAILED", copy, 409);
}
export async function previewOrderPointDeletion(input: { menuSiteId: string; tableId: string }) {
  const menuSiteId = normalizeMenuTableId(input.menuSiteId), tableId = normalizeMenuTableId(input.tableId);
  const { supabase } = await requireOrderPointDeletionAccess(menuSiteId);
  const result = await supabase.rpc("preview_order_point_deletion", { p_menu_site_id: menuSiteId, p_table_id: tableId });
  if (result.error) deletionError(result.error);
  return parseOrderPointDeletionSummary(result.data);
}
export async function deleteOrderPoint(input: { menuSiteId: string; tableId: string; fingerprint: string; confirmationLabel: string; withHistory: boolean }) {
  const menuSiteId = normalizeMenuTableId(input.menuSiteId), tableId = normalizeMenuTableId(input.tableId);
  if (typeof input.fingerprint !== "string" || !/^[a-f0-9]{32}$/.test(input.fingerprint) || typeof input.confirmationLabel !== "string" || input.confirmationLabel.length > 80 || typeof input.withHistory !== "boolean")
    throw new MenuTableManagementError("INVALID_INPUT", "삭제 범위와 확인 내용을 다시 확인해 주세요.", 400);
  const { context, supabase } = await requireOrderPointDeletionAccess(menuSiteId);
  const result = await supabase.rpc("delete_order_point", { p_menu_site_id: menuSiteId, p_table_id: tableId, p_actor_user_id: context.actorUserId,
    p_expected_fingerprint: input.fingerprint, p_confirmation_label: input.confirmationLabel, p_with_history: input.withHistory });
  if (result.error) deletionError(result.error);
}

/** One flag at a time, with compare-and-set: never overwrite the other channel or a newer change. */
export async function setOrderPointFeature(input: {
  menuSiteId: string; tableId: string; channel: OrderPointChannel; feature: OrderPointFeature;
  enabled: boolean; expectedEnabled: boolean;
}) {
  if (!input || typeof input.menuSiteId !== "string" || typeof input.tableId !== "string") throw new Error("변경할 테이블 또는 키오스크를 확인해 주세요.");
  const menuSiteId = normalizeMenuTableId(input.menuSiteId), tableId = normalizeMenuTableId(input.tableId);
  if (!["terminal", "customer"].includes(input.channel) || !["orders", "calls"].includes(input.feature)
    || typeof input.enabled !== "boolean" || typeof input.expectedEnabled !== "boolean") throw new Error("변경할 사용 설정을 확인해 주세요.");
  const { context, supabase } = await requireMenuTableWriteAccess(menuSiteId);
  // Feature policies are owner settings, like the store-wide order/call switches.
  const permission = await requireMenuSitePermission(menuSiteId, "menu.edit");
  if (!permission.isOwner) throw new MenuTableManagementError("MENU_SITE_UNAVAILABLE", "주문·호출 허용 설정은 사장님만 변경할 수 있습니다.", 403);
  const column = ORDER_POINT_POLICY_COLUMNS[orderPointPolicyKey(input.channel, input.feature)];
  const patch: Database["public"]["Tables"]["menu_tables"]["Update"] = { updated_by: context.actorUserId };
  patch[column] = input.enabled;
  let query = supabase.from("menu_tables").update(patch)
    .eq("menu_site_id", menuSiteId).eq("id", tableId).neq("status", "archived").eq(column, input.expectedEnabled);
  if (input.channel === "customer") query = query.eq("point_kind", "table");
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) throw new MenuTableManagementError("TABLE_UPDATE_FAILED", "설정이 변경됐거나 저장하지 못했습니다. 새로고침 후 다시 시도해 주세요.", 409);
}
