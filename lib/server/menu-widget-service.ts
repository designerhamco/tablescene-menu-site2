import "server-only";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { requireMenuSiteWriteAccess } from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createMenuWidgetInsertPayload,
  createMenuWidgetUpdatePayload,
  parseMenuWidgetRow,
  parseMenuWidgetRows,
  type MenuWidgetRow,
  type MenuWidgetRowParseIssue,
} from "@/lib/menu-widget-db-mappers";
import {
  createMenuWidgetDeletePlan,
  getMenuWidgetAssetChange,
  type MenuWidgetAssetChange,
  type MenuWidgetDeletePlan,
} from "@/lib/menu-widget-persistence";
import {
  MAX_MENU_WIDGETS_PER_PAGE,
  type MenuWidget,
  type MenuWidgetDraft,
  type MenuWidgetValidationError,
} from "@/lib/menu-widgets";

type SupabaseServerClient = ReturnType<typeof createAdminClient>;

type MenuPageRow = {
  id: string;
  menu_site_id: string;
};

type MenuSiteContext = {
  supabase: SupabaseServerClient;
  userId: string;
  menuSite: {
    id: string;
    user_id: string;
    slug: string | null;
  };
};

export type MenuWidgetServiceErrorCode =
  | "UNAUTHENTICATED"
  | "MENU_SITE_NOT_FOUND"
  | "FORBIDDEN"
  | "MENU_PAGE_NOT_FOUND"
  | "PAGE_SITE_MISMATCH"
  | "WIDGET_NOT_FOUND"
  | "WIDGET_SITE_MISMATCH"
  | "MAX_WIDGETS_PER_PAGE"
  | "VALIDATION_FAILED"
  | "UNSUPPORTED_WIDGET_TYPE"
  | "LEGACY_WIDGET_UNSUPPORTED"
  | "DATABASE_ERROR";

export type MenuWidgetServiceError = {
  code: MenuWidgetServiceErrorCode;
  message: string;
  field?: string;
  details?: unknown;
};

export type MenuWidgetServiceResult<T> =
  | ({ ok: true } & T)
  | {
      ok: false;
      error: MenuWidgetServiceError;
    };

export type GetMenuWidgetsForPageResult = MenuWidgetServiceResult<{
  widgets: MenuWidget[];
  issues: MenuWidgetRowParseIssue[];
}>;

export type GetMenuWidgetsForMenuSiteResult = MenuWidgetServiceResult<{
  widgetsByPageId: Record<string, MenuWidget[]>;
  issues: MenuWidgetRowParseIssue[];
}>;

export type CreateMenuWidgetResult = MenuWidgetServiceResult<{
  widget: MenuWidget;
}>;

export type UpdateMenuWidgetResult = MenuWidgetServiceResult<{
  widget: MenuWidget;
  assetChange: MenuWidgetAssetChange;
}>;

export type DeleteMenuWidgetResult = MenuWidgetServiceResult<{
  deletePlan: MenuWidgetDeletePlan;
}>;

export async function getMenuWidgetsForPage(args: {
  menuSiteId: string;
  menuPageId: string;
}): Promise<GetMenuWidgetsForPageResult> {
  const contextResult = await requireOwnedMenuSiteContext(args.menuSiteId);
  if (!contextResult.ok) return contextResult;

  const pageResult = await requirePageBelongsToMenuSite(contextResult.supabase, args.menuSiteId, args.menuPageId);
  if (!pageResult.ok) return pageResult;

  const { data, error } = await contextResult.supabase
    .from("menu_widgets")
    .select("*")
    .eq("menu_site_id", args.menuSiteId)
    .eq("menu_page_id", args.menuPageId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    logDbError("getMenuWidgetsForPage", { menuSiteId: args.menuSiteId, menuPageId: args.menuPageId }, error);
    return databaseError("위젯 목록을 불러오지 못했습니다.");
  }

  const parsed = parseMenuWidgetRows((data ?? []) as MenuWidgetRow[]);
  return {
    ok: true,
    widgets: parsed.widgets,
    issues: parsed.issues,
  };
}

export async function getMenuWidgetsForMenuSite(args: {
  menuSiteId: string;
}): Promise<GetMenuWidgetsForMenuSiteResult> {
  const contextResult = await requireOwnedMenuSiteContext(args.menuSiteId);
  if (!contextResult.ok) return contextResult;

  const { data, error } = await contextResult.supabase
    .from("menu_widgets")
    .select("*")
    .eq("menu_site_id", args.menuSiteId)
    .order("menu_page_id", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    logDbError("getMenuWidgetsForMenuSite", { menuSiteId: args.menuSiteId }, error);
    return databaseError("위젯 목록을 불러오지 못했습니다.");
  }

  const parsed = parseMenuWidgetRows((data ?? []) as MenuWidgetRow[]);
  const widgetsByPageId = parsed.widgets.reduce<Record<string, MenuWidget[]>>((groups, widget) => {
    groups[widget.menuPageId] = [...(groups[widget.menuPageId] ?? []), widget];
    return groups;
  }, {});

  return {
    ok: true,
    widgetsByPageId,
    issues: parsed.issues,
  };
}

export async function createMenuWidgetForOwner(args: {
  menuSiteId: string;
  draft: MenuWidgetDraft;
}): Promise<CreateMenuWidgetResult> {
  const contextResult = await requireOwnedMenuSiteContext(args.menuSiteId);
  if (!contextResult.ok) return contextResult;

  const pageResult = await requirePageBelongsToMenuSite(contextResult.supabase, args.menuSiteId, args.draft.menuPageId);
  if (!pageResult.ok) return pageResult;

  const countResult = await countWidgetsForPage(contextResult.supabase, args.menuSiteId, args.draft.menuPageId);
  if (!countResult.ok) return countResult;
  if (countResult.count >= MAX_MENU_WIDGETS_PER_PAGE) {
    return serviceError(
      "MAX_WIDGETS_PER_PAGE",
      `한 페이지에는 위젯을 최대 ${MAX_MENU_WIDGETS_PER_PAGE}개까지 등록할 수 있습니다.`,
      "widgets",
    );
  }

  const payloadResult = createMenuWidgetInsertPayload({
    menuSiteId: args.menuSiteId,
    draft: args.draft,
  });
  if (!payloadResult.ok) return validationError(payloadResult.errors);

  const { data, error } = await contextResult.supabase
    .from("menu_widgets")
    .insert(payloadResult.payload)
    .select("*")
    .single();

  if (error) {
    logDbError("createMenuWidgetForOwner", { menuSiteId: args.menuSiteId, menuPageId: args.draft.menuPageId }, error);
    return mapDbMutationError(error, "위젯을 저장하지 못했습니다.");
  }

  const parsed = parseMenuWidgetRow(data as MenuWidgetRow);
  if (!parsed.ok) {
    console.warn("[menu-widget-service] inserted row failed domain parse", {
      operation: "createMenuWidgetForOwner",
      menuSiteId: args.menuSiteId,
      widgetId: data.id,
      issues: parsed.issues.map((issue) => ({ code: issue.code, field: issue.field })),
    });
    return serviceError("VALIDATION_FAILED", "저장된 위젯 정보를 확인하지 못했습니다.", "widget");
  }

  return {
    ok: true,
    widget: parsed.widget,
  };
}

export async function updateMenuWidgetForOwner(args: {
  menuSiteId: string;
  widgetId: string;
  draft: MenuWidgetDraft;
  includePageId?: boolean;
}): Promise<UpdateMenuWidgetResult> {
  const contextResult = await requireOwnedMenuSiteContext(args.menuSiteId);
  if (!contextResult.ok) return contextResult;

  const existingResult = await requireWidgetBelongsToMenuSite(contextResult.supabase, args.menuSiteId, args.widgetId);
  if (!existingResult.ok) return existingResult;

  const existingParse = parseMenuWidgetRow(existingResult.row);
  if (!existingParse.ok) {
    return mapParseIssuesToServiceError(existingParse.issues, "기존 위젯 정보를 수정할 수 없습니다.");
  }

  const shouldMovePage = Boolean(args.includePageId && args.draft.menuPageId !== existingParse.widget.menuPageId);
  const targetPageId = args.includePageId ? args.draft.menuPageId : existingParse.widget.menuPageId;
  const pageResult = await requirePageBelongsToMenuSite(contextResult.supabase, args.menuSiteId, targetPageId);
  if (!pageResult.ok) return pageResult;

  if (shouldMovePage) {
    const countResult = await countWidgetsForPage(contextResult.supabase, args.menuSiteId, targetPageId);
    if (!countResult.ok) return countResult;
    if (countResult.count >= MAX_MENU_WIDGETS_PER_PAGE) {
      return serviceError(
        "MAX_WIDGETS_PER_PAGE",
        `이동할 페이지에는 위젯을 최대 ${MAX_MENU_WIDGETS_PER_PAGE}개까지 등록할 수 있습니다.`,
        "menuPageId",
      );
    }
  }

  const draftForPayload = args.includePageId
    ? args.draft
    : { ...args.draft, menuPageId: existingParse.widget.menuPageId };
  const payloadResult = createMenuWidgetUpdatePayload(draftForPayload, {
    includePageId: args.includePageId,
  });
  if (!payloadResult.ok) return validationError(payloadResult.errors);

  const { data, error } = await contextResult.supabase
    .from("menu_widgets")
    .update(payloadResult.payload)
    .eq("id", args.widgetId)
    .eq("menu_site_id", args.menuSiteId)
    .select("*")
    .maybeSingle();

  if (error) {
    logDbError("updateMenuWidgetForOwner", { menuSiteId: args.menuSiteId, widgetId: args.widgetId }, error);
    return mapDbMutationError(error, "위젯을 수정하지 못했습니다.");
  }

  if (!data) {
    return serviceError("WIDGET_NOT_FOUND", "위젯을 찾을 수 없거나 수정 권한이 없습니다.", "widgetId");
  }

  const updatedParse = parseMenuWidgetRow(data as MenuWidgetRow);
  if (!updatedParse.ok) {
    console.warn("[menu-widget-service] updated row failed domain parse", {
      operation: "updateMenuWidgetForOwner",
      menuSiteId: args.menuSiteId,
      widgetId: args.widgetId,
      issues: updatedParse.issues.map((issue) => ({ code: issue.code, field: issue.field })),
    });
    return mapParseIssuesToServiceError(updatedParse.issues, "수정된 위젯 정보를 확인하지 못했습니다.");
  }

  return {
    ok: true,
    widget: updatedParse.widget,
    assetChange: getMenuWidgetAssetChange(existingParse.widget, updatedParse.widget),
  };
}

export async function deleteMenuWidgetForOwner(args: {
  menuSiteId: string;
  widgetId: string;
}): Promise<DeleteMenuWidgetResult> {
  const contextResult = await requireOwnedMenuSiteContext(args.menuSiteId);
  if (!contextResult.ok) return contextResult;

  const existingResult = await requireWidgetBelongsToMenuSite(contextResult.supabase, args.menuSiteId, args.widgetId);
  if (!existingResult.ok) return existingResult;

  const existingParse = parseMenuWidgetRow(existingResult.row);
  if (!existingParse.ok) {
    return mapParseIssuesToServiceError(existingParse.issues, "기존 위젯 정보를 삭제할 수 없습니다.");
  }

  const deletePlan = createMenuWidgetDeletePlan(existingParse.widget);
  const { error } = await contextResult.supabase
    .from("menu_widgets")
    .delete()
    .eq("id", args.widgetId)
    .eq("menu_site_id", args.menuSiteId);

  if (error) {
    logDbError("deleteMenuWidgetForOwner", { menuSiteId: args.menuSiteId, widgetId: args.widgetId }, error);
    return mapDbMutationError(error, "위젯을 삭제하지 못했습니다.");
  }

  return {
    ok: true,
    deletePlan,
  };
}

async function requireOwnedMenuSiteContext(menuSiteId: string): Promise<MenuWidgetServiceResult<MenuSiteContext>> {
  let writeAccess: Awaited<ReturnType<typeof requireMenuSiteWriteAccess>>;

  try {
    writeAccess = await requireMenuSiteWriteAccess(menuSiteId, "menu.edit", "menu_widget_mutation");
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      return serviceError(
        error.code === "AUTH_REQUIRED" ? "UNAUTHENTICATED" : error.status === 404 ? "MENU_SITE_NOT_FOUND" : "FORBIDDEN",
        error.message,
        "menuSiteId",
      );
    }

    return databaseError("메뉴판 권한을 확인하지 못했습니다.");
  }

  const { supabase, context } = writeAccess;

  const { data: menuSite, error } = await supabase
    .from("menu_sites")
    .select("id, user_id, slug")
    .eq("id", menuSiteId)
    .maybeSingle();

  if (error) {
    logDbError("requireOwnedMenuSiteContext", { menuSiteId }, error);
    return databaseError("메뉴판 권한을 확인하지 못했습니다.");
  }

  if (!menuSite) {
    return serviceError("MENU_SITE_NOT_FOUND", "메뉴판을 찾을 수 없거나 권한이 없습니다.", "menuSiteId");
  }

  return {
    ok: true,
    supabase,
    userId: context.actorUserId,
    menuSite,
  };
}

async function requirePageBelongsToMenuSite(
  supabase: SupabaseServerClient,
  menuSiteId: string,
  menuPageId: string,
): Promise<MenuWidgetServiceResult<{ page: MenuPageRow }>> {
  const { data: page, error } = await supabase
    .from("menu_pages")
    .select("id, menu_site_id")
    .eq("id", menuPageId)
    .maybeSingle();

  if (error) {
    logDbError("requirePageBelongsToMenuSite", { menuSiteId, menuPageId }, error);
    return databaseError("메뉴 페이지를 확인하지 못했습니다.");
  }

  if (!page) {
    return serviceError("MENU_PAGE_NOT_FOUND", "메뉴 페이지를 찾을 수 없습니다.", "menuPageId");
  }

  if (page.menu_site_id !== menuSiteId) {
    return serviceError("PAGE_SITE_MISMATCH", "메뉴 페이지가 해당 메뉴판에 속하지 않습니다.", "menuPageId");
  }

  return {
    ok: true,
    page,
  };
}

async function requireWidgetBelongsToMenuSite(
  supabase: SupabaseServerClient,
  menuSiteId: string,
  widgetId: string,
): Promise<MenuWidgetServiceResult<{ row: MenuWidgetRow }>> {
  const { data: row, error } = await supabase
    .from("menu_widgets")
    .select("*")
    .eq("id", widgetId)
    .maybeSingle();

  if (error) {
    logDbError("requireWidgetBelongsToMenuSite", { menuSiteId, widgetId }, error);
    return databaseError("위젯 정보를 확인하지 못했습니다.");
  }

  if (!row) {
    return serviceError("WIDGET_NOT_FOUND", "위젯을 찾을 수 없습니다.", "widgetId");
  }

  const widgetRow = row as MenuWidgetRow;
  if (widgetRow.menu_site_id !== menuSiteId) {
    return serviceError("WIDGET_SITE_MISMATCH", "위젯이 해당 메뉴판에 속하지 않습니다.", "widgetId");
  }

  return {
    ok: true,
    row: widgetRow,
  };
}

async function countWidgetsForPage(
  supabase: SupabaseServerClient,
  menuSiteId: string,
  menuPageId: string,
): Promise<MenuWidgetServiceResult<{ count: number }>> {
  const { count, error } = await supabase
    .from("menu_widgets")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuSiteId)
    .eq("menu_page_id", menuPageId);

  if (error) {
    logDbError("countWidgetsForPage", { menuSiteId, menuPageId }, error);
    return databaseError("페이지 위젯 개수를 확인하지 못했습니다.");
  }

  return {
    ok: true,
    count: count ?? 0,
  };
}

function validationError(errors: readonly MenuWidgetValidationError[]): MenuWidgetServiceResult<never> {
  const firstError = errors[0];
  return serviceError(
    "VALIDATION_FAILED",
    firstError?.message ?? "위젯 입력값을 다시 확인해주세요.",
    firstError?.field,
    errors.map((error) => ({ code: error.code, field: error.field, message: error.message })),
  );
}

function mapParseIssuesToServiceError(
  issues: readonly MenuWidgetRowParseIssue[],
  fallbackMessage: string,
): MenuWidgetServiceResult<never> {
  const firstIssue = issues[0];

  if (firstIssue?.code === "UNSUPPORTED_LEGACY_TYPE") {
    return serviceError("LEGACY_WIDGET_UNSUPPORTED", "기존 위젯 유형은 이 MVP 서비스에서 수정하거나 삭제하지 않습니다.", firstIssue.field);
  }

  if (firstIssue?.code === "INVALID_WIDGET_TYPE") {
    return serviceError("UNSUPPORTED_WIDGET_TYPE", firstIssue.message, firstIssue.field);
  }

  return serviceError(
    "VALIDATION_FAILED",
    firstIssue?.message ?? fallbackMessage,
    firstIssue?.field,
    issues.map((issue) => ({ code: issue.code, field: issue.field, widgetId: issue.widgetId })),
  );
}

function mapDbMutationError(error: { code?: string; message?: string }, fallbackMessage: string): MenuWidgetServiceResult<never> {
  if (error.code === "23503") {
    return serviceError("VALIDATION_FAILED", "연결된 메뉴판 또는 페이지 정보를 확인해주세요.");
  }

  if (error.code === "23514") {
    return serviceError("VALIDATION_FAILED", "위젯 입력값이 저장 정책에 맞지 않습니다.");
  }

  if (error.code === "23505") {
    return serviceError("VALIDATION_FAILED", "이미 저장된 위젯 정보와 충돌합니다.");
  }

  return databaseError(fallbackMessage);
}

function databaseError(message: string): MenuWidgetServiceResult<never> {
  return serviceError("DATABASE_ERROR", message);
}

function serviceError(
  code: MenuWidgetServiceErrorCode,
  message: string,
  field?: string,
  details?: unknown,
): MenuWidgetServiceResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(field ? { field } : {}),
      ...(details === undefined ? {} : { details }),
    },
  };
}

function logDbError(
  operation: string,
  context: Record<string, string | undefined>,
  error: { code?: string; message?: string },
) {
  console.warn("[menu-widget-service] database operation failed", {
    operation,
    ...context,
    code: error.code,
    message: error.message,
  });
}
