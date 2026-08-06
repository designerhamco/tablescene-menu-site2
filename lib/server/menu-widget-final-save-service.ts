import "server-only";

import { createMenuWidgetSavePlan, type MenuWidgetSavePlan } from "@/lib/menu-widget-save-plan";
import {
  parseMenuWidgetFinalSavePayload,
  type MenuWidgetFinalSavePayload,
  type MenuWidgetFinalSaveValidationError,
} from "@/lib/menu-widget-save-contract";
import {
  createMenuWidgetForOwner,
  deleteMenuWidgetForOwner,
  getMenuWidgetsForMenuSite,
  updateMenuWidgetForOwner,
  type MenuWidgetServiceError,
} from "@/lib/server/menu-widget-service";
import { saveMenuPageContentOrderForOwner } from "@/lib/server/menu-page-content-order-service";
import {
  requireMenuSiteWriteAccess,
} from "@/lib/server/menu-site-access-service";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import type { MenuWidget, MenuWidgetDraft, MenuWidgetType } from "@/lib/menu-widgets";

type SupabaseServerClient = ReturnType<typeof createAdminClient>;

type MenuWidgetFinalSaveErrorCode =
  | "UNAUTHENTICATED"
  | "MENU_SITE_NOT_FOUND"
  | "FORBIDDEN"
  | "UNSUPPORTED_TEMPLATE"
  | "VALIDATION_FAILED"
  | "MENU_PAGE_NOT_FOUND"
  | "PAGE_SITE_MISMATCH"
  | "EXISTING_WIDGET_INVALID"
  | "WIDGET_MUTATION_FAILED"
  | "ORDER_RPC_FAILED"
  | "DATABASE_ERROR";

export type MenuWidgetFinalSaveError = {
  code: MenuWidgetFinalSaveErrorCode;
  message: string;
  field?: string;
  details?: unknown;
};

export type MenuWidgetFinalSaveResult =
  | {
      ok: true;
      createdWidgets: MenuWidget[];
      updatedWidgets: MenuWidget[];
      deletedWidgetIds: string[];
      assetCleanupPlans: MenuWidgetSavePlan["deletes"];
      assetChanges: MenuWidgetSavePlan["assetChanges"];
      orderResults: Array<{
        menuPageId: string;
        updatedCategoryCount: number;
        updatedWidgetCount: number;
        totalBlockCount: number;
      }>;
    }
  | {
      ok: false;
      error: MenuWidgetFinalSaveError;
    };

export async function saveMenuWidgetsForFinalDraft(args: {
  menuSiteId: string;
  payload: unknown;
}): Promise<MenuWidgetFinalSaveResult> {
  const parseResult = parseMenuWidgetFinalSavePayload(args.payload);
  if (!parseResult.ok) {
    return validationFailure(parseResult.errors);
  }

  return saveParsedMenuWidgetsForFinalDraft({
    menuSiteId: args.menuSiteId,
    payload: parseResult.value,
  });
}

export async function saveParsedMenuWidgetsForFinalDraft(args: {
  menuSiteId: string;
  payload: MenuWidgetFinalSavePayload;
}): Promise<MenuWidgetFinalSaveResult> {
  const contextResult = await requireMenuWidgetFinalSaveContext(args.menuSiteId, args.payload);
  if (!contextResult.ok) return contextResult;

  const existingResult = await getMenuWidgetsForMenuSite({ menuSiteId: args.menuSiteId });
  if (!existingResult.ok) {
    return serviceFailure(existingResult.error);
  }

  if (existingResult.issues.length > 0) {
    return {
      ok: false,
      error: {
        code: "EXISTING_WIDGET_INVALID",
        message: "기존 위젯 중 MVP 저장 경로에서 처리할 수 없는 데이터가 있습니다.",
        field: "widgets",
        details: existingResult.issues.map((issue) => ({
          code: issue.code,
          field: issue.field,
          widgetId: issue.widgetId,
        })),
      },
    };
  }

  const existingWidgets = Object.values(existingResult.widgetsByPageId).flat();
  const planResult = createMenuWidgetSavePlan({
    existingWidgets,
    payload: args.payload,
  });

  if (!planResult.ok) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: planResult.errors[0]?.message ?? "위젯 저장 내용을 확인해주세요.",
        field: planResult.errors[0]?.field,
        details: planResult.errors,
      },
    };
  }

  const createdWidgets: MenuWidget[] = [];
  const updatedWidgets: MenuWidget[] = [];
  const deletedWidgetIds: string[] = [];

  for (const deletePlan of planResult.plan.deletes) {
    const deleteResult = await deleteMenuWidgetForOwner({
      menuSiteId: args.menuSiteId,
      widgetId: deletePlan.widgetId,
    });
    if (!deleteResult.ok) return mutationFailure(deleteResult.error);
    deletedWidgetIds.push(deletePlan.widgetId);
  }

  for (const updatePlan of planResult.plan.updates) {
    const updateResult = await updateMenuWidgetForOwner({
      menuSiteId: args.menuSiteId,
      widgetId: updatePlan.existing.id,
      draft: updatePlan.draft,
      includePageId: true,
    });
    if (!updateResult.ok) return mutationFailure(updateResult.error);
    updatedWidgets.push(updateResult.widget);
  }

  for (const draft of planResult.plan.creates) {
    const createResult = await createMenuWidgetForOwner({
      menuSiteId: args.menuSiteId,
      draft,
    });
    if (!createResult.ok) return mutationFailure(createResult.error);
    createdWidgets.push(createResult.widget);
  }

  const orderResults: Extract<MenuWidgetFinalSaveResult, { ok: true }>["orderResults"] = [];
  for (const pageOrder of planResult.plan.pageOrders) {
    const orderResult = await saveMenuPageContentOrderForOwner({
      userId: contextResult.ownerUserId,
      menuSiteId: args.menuSiteId,
      menuPageId: pageOrder.menuPageId,
      blocks: pageOrder.blocks,
    });

    if (!orderResult.ok) {
      return {
        ok: false,
        error: {
          code: "ORDER_RPC_FAILED",
          message: orderResult.error.message,
          details: { code: orderResult.error.code, menuPageId: pageOrder.menuPageId },
        },
      };
    }

    orderResults.push({
      menuPageId: orderResult.result.menuPageId,
      updatedCategoryCount: orderResult.result.updatedCategoryCount,
      updatedWidgetCount: orderResult.result.updatedWidgetCount,
      totalBlockCount: orderResult.result.totalBlockCount,
    });
  }

  return {
    ok: true,
    createdWidgets,
    updatedWidgets,
    deletedWidgetIds,
    assetCleanupPlans: planResult.plan.deletes,
    assetChanges: planResult.plan.assetChanges,
    orderResults,
  };
}

async function requireMenuWidgetFinalSaveContext(
  menuSiteId: string,
  payload: MenuWidgetFinalSavePayload,
): Promise<
  | {
      ok: true;
      supabase: SupabaseServerClient;
      ownerUserId: string;
    }
  | {
      ok: false;
      error: MenuWidgetFinalSaveError;
    }
> {
  let writeAccess: Awaited<ReturnType<typeof requireMenuSiteWriteAccess>>;

  try {
    writeAccess = await requireMenuSiteWriteAccess(menuSiteId, "menu.edit", "menu_widget_final_save");
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      return serviceError(
        error.code === "AUTH_REQUIRED" ? "UNAUTHENTICATED" : error.status === 404 ? "MENU_SITE_NOT_FOUND" : "FORBIDDEN",
        error.message,
        "menuSiteId",
      );
    }

    return serviceError("DATABASE_ERROR", "메뉴판 권한을 확인하지 못했습니다.");
  }

  const { supabase } = writeAccess;

  const { data: menuSite, error: siteError } = await supabase
    .from("menu_sites")
    .select("id, user_id, template_key")
    .eq("id", menuSiteId)
    .maybeSingle();

  if (siteError) {
    console.warn("[menu-widget-final-save-service] menu site query failed", {
      menuSiteId,
      code: siteError.code,
      message: siteError.message,
    });
    return serviceError("DATABASE_ERROR", "메뉴판 권한을 확인하지 못했습니다.");
  }

  if (!menuSite) {
    return serviceError("MENU_SITE_NOT_FOUND", "메뉴판을 찾을 수 없거나 권한이 없습니다.", "menuSiteId");
  }

  const capabilities = getTemplateCapabilities(menuSite.template_key);
  if (!capabilities.menuWidgets.enabled) {
    return serviceError("UNSUPPORTED_TEMPLATE", "이 템플릿은 메뉴 위젯을 지원하지 않습니다.", "template");
  }

  const unsupportedType = findUnsupportedWidgetType(payload.widgetDrafts, capabilities.menuWidgets.supportedTypes);
  if (unsupportedType) {
    return serviceError("UNSUPPORTED_TEMPLATE", "이 템플릿에서 지원하지 않는 위젯 유형입니다.", "widgetDrafts.type", {
      type: unsupportedType,
    });
  }

  const pageValidation = await validatePayloadPagesBelongToMenuSite(supabase, menuSiteId, payload);
  if (!pageValidation.ok) return pageValidation;

  return {
    ok: true,
    supabase,
    ownerUserId: menuSite.user_id,
  };
}

async function validatePayloadPagesBelongToMenuSite(
  supabase: SupabaseServerClient,
  menuSiteId: string,
  payload: MenuWidgetFinalSavePayload,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error: MenuWidgetFinalSaveError;
    }
> {
  const pageIds = [
    ...new Set([
      ...payload.contentBlocksByPage.map((pageBlocks) => pageBlocks.menuPageId),
      ...payload.widgetDrafts.map((draft) => draft.menuPageId),
    ]),
  ];

  if (pageIds.length === 0) return { ok: true };

  const { data: pages, error } = await supabase
    .from("menu_pages")
    .select("id, menu_site_id")
    .in("id", pageIds);

  if (error) {
    console.warn("[menu-widget-final-save-service] page query failed", {
      menuSiteId,
      code: error.code,
      message: error.message,
    });
    return serviceError("DATABASE_ERROR", "메뉴 페이지를 확인하지 못했습니다.");
  }

  const pagesById = new Map((pages ?? []).map((page) => [page.id, page]));
  const missingPageId = pageIds.find((pageId) => !pagesById.has(pageId));
  if (missingPageId) {
    return serviceError("MENU_PAGE_NOT_FOUND", "메뉴 페이지를 찾을 수 없습니다.", "menuPageId", {
      menuPageId: missingPageId,
    });
  }

  const mismatchedPage = pageIds.find((pageId) => pagesById.get(pageId)?.menu_site_id !== menuSiteId);
  if (mismatchedPage) {
    return serviceError("PAGE_SITE_MISMATCH", "메뉴 페이지가 해당 메뉴판에 속하지 않습니다.", "menuPageId", {
      menuPageId: mismatchedPage,
    });
  }

  return { ok: true };
}

function findUnsupportedWidgetType(
  drafts: readonly MenuWidgetDraft[],
  supportedTypes: readonly MenuWidgetType[],
) {
  return drafts.find((draft) => !supportedTypes.includes(draft.type))?.type ?? null;
}

function validationFailure(errors: readonly MenuWidgetFinalSaveValidationError[]): MenuWidgetFinalSaveResult {
  return {
    ok: false,
    error: {
      code: "VALIDATION_FAILED",
      message: errors[0]?.message ?? "위젯 저장 내용을 확인해주세요.",
      field: errors[0]?.field,
      details: errors,
    },
  };
}

function serviceFailure(error: MenuWidgetServiceError): MenuWidgetFinalSaveResult {
  return {
    ok: false,
    error: {
      code: error.code === "DATABASE_ERROR" ? "DATABASE_ERROR" : "VALIDATION_FAILED",
      message: error.message,
      field: error.field,
      details: error.details,
    },
  };
}

function mutationFailure(error: MenuWidgetServiceError): MenuWidgetFinalSaveResult {
  return {
    ok: false,
    error: {
      code: "WIDGET_MUTATION_FAILED",
      message: error.message,
      field: error.field,
      details: {
        code: error.code,
        details: error.details,
      },
    },
  };
}

function serviceError(
  code: MenuWidgetFinalSaveErrorCode,
  message: string,
  field?: string,
  details?: unknown,
): Extract<MenuWidgetFinalSaveResult, { ok: false }> {
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
