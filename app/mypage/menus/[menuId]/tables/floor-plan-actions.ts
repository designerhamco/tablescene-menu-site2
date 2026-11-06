"use server";
import { revalidatePath } from "next/cache";
import { removeMenuFloorRoom } from "@/lib/server/menu-floor-room-service";
import type { FloorRoomRemoval, FloorRoomRemovalResult } from "@/lib/menu-floor-plan";
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

export async function removeFloorRoomAction(menuSiteId:string,revision:number,request:FloorRoomRemoval):Promise<FloorRoomRemovalResult> {
  try { const result=await removeMenuFloorRoom(menuSiteId,revision,request); return {status:"success",...result,message:!request.pointIds.length?"빈 룸을 삭제했습니다.":request.mode==="move"?"항목을 모두 이동하고 룸을 삭제했습니다.":"항목을 보관하고 룸을 삭제했습니다."}; }
  catch(error) { return {status:"error",message:error instanceof MenuSiteAccessError || error instanceof MenuTableManagementError || error instanceof FloorPlanError?error.message:"룸을 정리하지 못했습니다. 새로고침 후 다시 확인해 주세요."}; }
  finally { for(const path of ["tables","kiosks","orders","calls","qr"]) revalidatePath(`/mypage/menus/${menuSiteId}/${path}`);revalidatePath("/mypage/operations"); }
}
