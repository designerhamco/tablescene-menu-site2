"use server";
import { revalidatePath } from "next/cache";
import { saveMenuFloorPlan } from "@/lib/server/menu-floor-plan-service";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { MenuTableManagementError } from "@/lib/server/menu-table-management-service";
import { FloorPlanError, type FloorSaveResult } from "@/lib/menu-floor-plan";
export async function saveFloorPlanAction(menuSiteId: string, revision: number, input: unknown): Promise<FloorSaveResult> {
  try {
    const saved = await saveMenuFloorPlan(menuSiteId, revision, input);
    revalidatePath(`/mypage/menus/${menuSiteId}/tables`);
    revalidatePath(`/mypage/menus/${menuSiteId}/kiosks`);
    return { status: "success", ...saved };
  } catch (error) {
    if (error instanceof MenuSiteAccessError || error instanceof MenuTableManagementError) return { status: "error", message: error.message };
    return { status: "error", message: error instanceof FloorPlanError ? error.message : "배치도를 저장하지 못했습니다." };
  }
}
