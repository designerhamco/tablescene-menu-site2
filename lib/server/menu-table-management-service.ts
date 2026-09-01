import "server-only";

import {
  createMenuTableTokenMaterial,
  MenuTableInputError,
  type MenuTableListItem,
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
import { isTableManagementRuntimeEnabled } from "@/lib/table-management-runtime";

const MENU_TABLE_SELECT = "id, label, qr_public_id, display_order, status, token_rotated_at, created_at, updated_at";

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
    throw new MenuTableManagementError("TABLE_LIMIT_REACHED", "메뉴판 하나에는 사용 중이거나 비활성인 테이블을 최대 100개까지 만들 수 있습니다.", 409);
  }
  if (error.code === "23505") {
    throw new MenuTableManagementError("TABLE_CONFLICT", "같은 이름의 테이블이 이미 있습니다.", 409);
  }
  throw new MenuTableManagementError(
    fallbackCode,
    fallbackCode === "TABLE_CREATE_FAILED"
      ? "테이블을 만들지 못했습니다. 잠시 후 다시 시도해 주세요."
      : "테이블 정보를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    500,
  );
}

async function requireMenuTableReadAccess(menuSiteId: string) {
  if (!isTableManagementRuntimeEnabled()) {
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

async function requireMenuTableWriteAccess(menuSiteId: string) {
  await requireMenuTableReadAccess(menuSiteId);
  return requireMenuSiteWriteAccess(menuSiteId, "table.manage", "menu_table_management");
}

export async function listMenuTables(menuSiteId: string): Promise<MenuTableManagementPageData> {
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
      .select(MENU_TABLE_SELECT)
      .eq("menu_site_id", normalizedMenuSiteId)
      .in("status", ["active", "disabled"])
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

  if (tablesResult.error) {
    throw new MenuTableManagementError("MENU_SITE_UNAVAILABLE", "테이블 관리 정보를 불러오지 못했습니다.", 500);
  }

  return {
    menuSite: {
      id: menuSite.id,
      name: menuSite.name,
      slug: menuSite.slug,
      status: menuSite.status,
    },
    tables: (tablesResult.data ?? []).map(toMenuTableListItem),
  };
}

export async function createMenuTable({
  menuSiteId,
  label,
}: {
  menuSiteId: string;
  label: string;
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
      token_hash: token.tokenHash,
      created_by: context.actorUserId,
      updated_by: context.actorUserId,
    })
    .select(MENU_TABLE_SELECT)
    .maybeSingle();

  if (error || !data) mapDatabaseError(error ?? {}, "TABLE_CREATE_FAILED");
  const table = toMenuTableListItem(data);
  return { table, qrPath: table.qrPath };
}

export async function updateMenuTable({
  menuSiteId,
  tableId,
  label,
  status,
}: {
  menuSiteId: string;
  tableId: string;
  label: string;
  status: MenuTableMutableStatus | string;
}) {
  let normalizedMenuSiteId: string;
  let normalizedTableId: string;
  let normalizedLabel: string;
  let normalizedStatus: MenuTableMutableStatus;
  try {
    normalizedMenuSiteId = normalizeMenuTableId(menuSiteId);
    normalizedTableId = normalizeMenuTableId(tableId);
    normalizedLabel = normalizeMenuTableLabel(label);
    normalizedStatus = normalizeMenuTableStatus(status);
  } catch (error) {
    return inputError(error);
  }

  const { context, supabase } = await requireMenuTableWriteAccess(normalizedMenuSiteId);
  const { data, error } = await supabase
    .from("menu_tables")
    .update({ label: normalizedLabel, status: normalizedStatus, updated_by: context.actorUserId })
    .eq("menu_site_id", normalizedMenuSiteId)
    .eq("id", normalizedTableId)
    .neq("status", "archived")
    .select(MENU_TABLE_SELECT)
    .maybeSingle();

  if (error) mapDatabaseError(error, "TABLE_UPDATE_FAILED");
  if (!data) throw new MenuTableManagementError("TABLE_NOT_FOUND", "테이블을 찾을 수 없거나 이미 보관되었습니다.", 404);
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
    .select(MENU_TABLE_SELECT)
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
