import "server-only";

import {
  isMenuWidgetImageVersionPath,
  MENU_WIDGET_IMAGES_BUCKET,
} from "@/lib/menu-widget-image-contract";
import type { MenuWidgetAssetChange, MenuWidgetDeletePlan } from "@/lib/menu-widget-persistence";
import { createAdminClient } from "@/lib/supabase/admin";

export type MenuWidgetImageCleanupReason = "widget_deleted" | "image_replaced" | "image_removed";
export type MenuWidgetImageCleanupSkipReason =
  | "invalid_path"
  | "still_referenced"
  | "duplicate";

export type MenuWidgetImageCleanupCandidate = {
  widgetId: string;
  imagePath: string;
  reason: MenuWidgetImageCleanupReason;
};

export type MenuWidgetImageCleanupSkipped = {
  imagePath: string;
  reason: MenuWidgetImageCleanupSkipReason;
};

export type MenuWidgetImageCleanupWarning = {
  code: "ADMIN_CLIENT_UNAVAILABLE" | "REFERENCE_QUERY_FAILED" | "STORAGE_REMOVE_FAILED";
  message: string;
};

export type MenuWidgetImageCleanupResult =
  | {
      ok: true;
      removedPaths: string[];
      skipped: MenuWidgetImageCleanupSkipped[];
      warnings: [];
    }
  | {
      ok: false;
      removedPaths: string[];
      skipped: MenuWidgetImageCleanupSkipped[];
      warnings: MenuWidgetImageCleanupWarning[];
    };

export function createMenuWidgetImageCleanupPlan(args: {
  menuSiteId: string;
  assetCleanupPlans: readonly MenuWidgetDeletePlan[];
  assetChanges: readonly MenuWidgetAssetChange[];
  currentlyReferencedImagePaths?: ReadonlySet<string>;
}): {
  candidates: MenuWidgetImageCleanupCandidate[];
  skipped: MenuWidgetImageCleanupSkipped[];
} {
  const currentlyReferencedImagePaths = args.currentlyReferencedImagePaths ?? new Set<string>();
  const candidates: MenuWidgetImageCleanupCandidate[] = [];
  const skipped: MenuWidgetImageCleanupSkipped[] = [];
  const seenPaths = new Set<string>();

  const addCandidate = (candidate: MenuWidgetImageCleanupCandidate) => {
    if (seenPaths.has(candidate.imagePath)) {
      skipped.push({ imagePath: candidate.imagePath, reason: "duplicate" });
      return;
    }
    seenPaths.add(candidate.imagePath);

    if (
      !isMenuWidgetImageVersionPath({
        menuSiteId: args.menuSiteId,
        widgetId: candidate.widgetId,
        imagePath: candidate.imagePath,
      })
    ) {
      skipped.push({ imagePath: candidate.imagePath, reason: "invalid_path" });
      return;
    }

    if (currentlyReferencedImagePaths.has(candidate.imagePath)) {
      skipped.push({ imagePath: candidate.imagePath, reason: "still_referenced" });
      return;
    }

    candidates.push(candidate);
  };

  args.assetCleanupPlans.forEach((plan) => {
    if (!plan.imagePath || plan.menuSiteId !== args.menuSiteId) return;

    addCandidate({
      widgetId: plan.widgetId,
      imagePath: plan.imagePath,
      reason: "widget_deleted",
    });
  });

  args.assetChanges.forEach((change) => {
    if (!change.shouldCleanupPreviousImage || !change.previousImagePath || change.menuSiteId !== args.menuSiteId) {
      return;
    }

    if (change.previousImagePath === change.nextImagePath) return;

    addCandidate({
      widgetId: change.widgetId,
      imagePath: change.previousImagePath,
      reason: change.nextImagePath ? "image_replaced" : "image_removed",
    });
  });

  return { candidates, skipped };
}

export async function cleanupSavedMenuWidgetImages(args: {
  menuSiteId: string;
  assetCleanupPlans: readonly MenuWidgetDeletePlan[];
  assetChanges: readonly MenuWidgetAssetChange[];
}): Promise<MenuWidgetImageCleanupResult> {
  const initialPlan = createMenuWidgetImageCleanupPlan(args);
  if (initialPlan.candidates.length === 0) {
    return {
      ok: true,
      removedPaths: [],
      skipped: initialPlan.skipped,
      warnings: [],
    };
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;
  try {
    adminSupabase = createAdminClient();
  } catch (error) {
    return {
      ok: false,
      removedPaths: [],
      skipped: initialPlan.skipped,
      warnings: [
        {
          code: "ADMIN_CLIENT_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Supabase admin client를 생성할 수 없습니다.",
        },
      ],
    };
  }

  const { data, error } = await adminSupabase
    .from("menu_widgets")
    .select("image_path")
    .eq("menu_site_id", args.menuSiteId)
    .not("image_path", "is", null);

  if (error) {
    return {
      ok: false,
      removedPaths: [],
      skipped: initialPlan.skipped,
      warnings: [
        {
          code: "REFERENCE_QUERY_FAILED",
          message: error.message,
        },
      ],
    };
  }

  const referencedPaths = new Set(
    (data ?? [])
      .map((row) => (typeof row.image_path === "string" ? row.image_path : null))
      .filter((imagePath): imagePath is string => Boolean(imagePath)),
  );
  const finalPlan = createMenuWidgetImageCleanupPlan({
    ...args,
    currentlyReferencedImagePaths: referencedPaths,
  });

  if (finalPlan.candidates.length === 0) {
    return {
      ok: true,
      removedPaths: [],
      skipped: finalPlan.skipped,
      warnings: [],
    };
  }

  const pathsToRemove = finalPlan.candidates.map((candidate) => candidate.imagePath);
  const { error: removeError } = await adminSupabase.storage
    .from(MENU_WIDGET_IMAGES_BUCKET)
    .remove(pathsToRemove);

  if (removeError) {
    return {
      ok: false,
      removedPaths: [],
      skipped: finalPlan.skipped,
      warnings: [
        {
          code: "STORAGE_REMOVE_FAILED",
          message: removeError.message,
        },
      ],
    };
  }

  return {
    ok: true,
    removedPaths: pathsToRemove,
    skipped: finalPlan.skipped,
    warnings: [],
  };
}
