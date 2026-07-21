import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { MenuWidgetFinalSaveContentBlock } from "@/lib/menu-widget-save-contract";

export type MenuPageContentOrderServiceErrorCode =
  | "INVALID_RESPONSE"
  | "RPC_FAILED"
  | "DATABASE_ERROR";

export type MenuPageContentOrderServiceError = {
  code: MenuPageContentOrderServiceErrorCode;
  message: string;
};

export type MenuPageContentOrderServiceResult =
  | {
      ok: true;
      result: {
        menuSiteId: string;
        menuPageId: string;
        updatedCategoryCount: number;
        updatedWidgetCount: number;
        totalBlockCount: number;
      };
    }
  | {
      ok: false;
      error: MenuPageContentOrderServiceError;
    };

export async function saveMenuPageContentOrderForOwner(args: {
  userId: string;
  menuSiteId: string;
  menuPageId: string;
  blocks: readonly MenuWidgetFinalSaveContentBlock[];
}): Promise<MenuPageContentOrderServiceResult> {
  let supabase: ReturnType<typeof createAdminClient>;

  try {
    supabase = createAdminClient();
  } catch {
    return serviceError("DATABASE_ERROR", "콘텐츠 순서 저장 환경을 확인하지 못했습니다.");
  }

  const rpcBlocks = args.blocks.map((block) => ({
    block_type: block.blockType,
    id: block.id,
    sort_order: block.sortOrder,
  })) as Json;

  const { data, error } = await supabase.rpc("save_menu_page_content_order", {
    p_user_id: args.userId,
    p_menu_site_id: args.menuSiteId,
    p_menu_page_id: args.menuPageId,
    p_blocks: rpcBlocks,
  });

  if (error) {
    console.warn("[menu-page-content-order-service] rpc failed", {
      menuSiteId: args.menuSiteId,
      menuPageId: args.menuPageId,
      code: error.code,
      message: error.message,
    });
    return serviceError("RPC_FAILED", "콘텐츠 순서를 저장하지 못했습니다.");
  }

  return parseRpcResult(data, args);
}

function parseRpcResult(
  data: Json,
  args: {
    menuSiteId: string;
    menuPageId: string;
    blocks: readonly MenuWidgetFinalSaveContentBlock[];
  },
): MenuPageContentOrderServiceResult {
  if (!isPlainObject(data)) {
    return serviceError("INVALID_RESPONSE", "콘텐츠 순서 저장 결과를 확인하지 못했습니다.");
  }

  const updatedCategoryCount = toNonNegativeInteger(data.updated_category_count);
  const updatedWidgetCount = toNonNegativeInteger(data.updated_widget_count);
  const totalBlockCount = toNonNegativeInteger(data.total_block_count);

  if (updatedCategoryCount == null || updatedWidgetCount == null || totalBlockCount == null) {
    return serviceError("INVALID_RESPONSE", "콘텐츠 순서 저장 결과가 올바르지 않습니다.");
  }

  return {
    ok: true,
    result: {
      menuSiteId: typeof data.menu_site_id === "string" ? data.menu_site_id : args.menuSiteId,
      menuPageId: typeof data.menu_page_id === "string" ? data.menu_page_id : args.menuPageId,
      updatedCategoryCount,
      updatedWidgetCount,
      totalBlockCount,
    },
  };
}

function toNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serviceError(
  code: MenuPageContentOrderServiceErrorCode,
  message: string,
): MenuPageContentOrderServiceResult {
  return {
    ok: false,
    error: { code, message },
  };
}
