import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMenuSiteWriteAccess, getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";
import { normalizeMenuTableId } from "@/lib/menu-table-management";
import { createTableVisitSessionMaterial, hashTableAccessToken } from "@/lib/table-qr-session-tokens";
import { getPublicMenuPath } from "@/lib/menu-url";

export async function registerTableTerminal(menuSiteIdValue: string, tableIdValue: string, userAgent: string, previousToken?:string) {
  const menuSiteId=normalizeMenuTableId(menuSiteIdValue),tableId=normalizeMenuTableId(tableIdValue);
  if (!isTableManagementRuntimeEnabledForSite(menuSiteId)) throw new Error("공용 단말 연결을 사용할 수 없습니다.");
  await requireMenuSiteWriteAccess(menuSiteId,"table.manage","menu_table_management");
  const access = await getMenuSiteAccessStateForMenuSite({menuSiteId});
  if (!access?.canUseWriteActions || !access.canViewPublic || access.planType!=="business_basic") throw new Error("공개된 사업자 메뉴판에서 공용 단말을 연결해 주세요.");
  const db=createAdminClient();
  const [{data:table,error},{data:site}] = await Promise.all([
    db.from("menu_tables").select("id,status").eq("menu_site_id",menuSiteId).eq("id",tableId).eq("status","active").maybeSingle(),
    db.from("menu_sites").select("slug,status").eq("id",menuSiteId).maybeSingle(),
  ]);
  if (error || !table || !site?.slug || site.status!=="published") throw new Error("사용 중인 테이블과 공개 메뉴판이 필요합니다.");
  const material=createTableVisitSessionMaterial({userAgent,channel:"terminal"});
  // Generated RPC arguments omit SQL parameter nullability; preserve SQL NULL.
  const inserted=await db.rpc("register_table_terminal_visit",{p_menu_site_id:menuSiteId,p_table_id:table.id,p_token_hash:material.tokenHash,p_user_agent_hash:material.userAgentHash,p_previous_token_hash:(previousToken?hashTableAccessToken(previousToken):null) as string});
  if (inserted.error) throw new Error("공용 단말을 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return {token:material.rawToken,expiresAt:material.expiresAt.toISOString(),path:getPublicMenuPath(site.slug)+"?mode=terminal"};
}
export async function unregisterTableTerminal(menuSiteId: string, token: string) {
  await requireMenuSiteWriteAccess(normalizeMenuTableId(menuSiteId),"table.manage","menu_table_management");
  const db=createAdminClient();
  const result=await db.from("table_visit_sessions").update({revoked_at:new Date().toISOString()}).eq("menu_site_id",menuSiteId).eq("token_hash",hashTableAccessToken(token));
  if (result.error) throw new Error("공용 단말 연결을 해제하지 못했습니다.");
}
