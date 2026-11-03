import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMenuSitePermission, requireMenuSiteWriteAccess, getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";
import { normalizeMenuTableId } from "@/lib/menu-table-management";
import { createTableVisitSessionMaterial, hashTableAccessToken, hashTableVisitUserAgent, isValidTableAccessToken } from "@/lib/table-qr-session-tokens";
import { getPublicMenuPath } from "@/lib/menu-url";

export class TableTerminalConnectionError extends Error {}

/** Read only: management views must not renew or touch a terminal session. */
export async function getCurrentTableTerminalId(menuSiteIdValue: string, token: string | undefined, userAgent: string) {
  const menuSiteId = normalizeMenuTableId(menuSiteIdValue);
  if (!isValidTableAccessToken(token) || !isTableManagementRuntimeEnabledForSite(menuSiteId)) return null;
  await requireMenuSitePermission(menuSiteId, "table.manage");
  let userAgentHash: string;
  try { userAgentHash = hashTableVisitUserAgent(userAgent); } catch { return null; }
  const { data, error } = await createAdminClient().from("table_visit_sessions")
    .select("menu_table_id").eq("menu_site_id", menuSiteId).eq("token_hash", hashTableAccessToken(token))
    .eq("access_channel", "terminal").eq("user_agent_hash", userAgentHash)
    .is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw new TableTerminalConnectionError("현재 태블릿의 연결 상태를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.");
  return data?.menu_table_id ?? null;
}

export async function getTableTerminalMenuPath(menuSiteIdValue: string, tableIdValue: string, token: string | undefined, userAgent: string) {
  const menuSiteId = normalizeMenuTableId(menuSiteIdValue), tableId = normalizeMenuTableId(tableIdValue);
  await requireMenuSiteWriteAccess(menuSiteId, "table.manage", "menu_table_management");
  if (await getCurrentTableTerminalId(menuSiteId, token, userAgent) !== tableId) {
    throw new TableTerminalConnectionError("먼저 현재 태블릿을 이 테이블에 연결해 주세요.");
  }
  const [access, siteResult] = await Promise.all([
    getMenuSiteAccessStateForMenuSite({ menuSiteId }),
    createAdminClient().from("menu_sites").select("slug,status").eq("id", menuSiteId).maybeSingle(),
  ]);
  if (!access?.canUseWriteActions || !access.canViewPublic || access.planType !== "business_basic" || siteResult.error || siteResult.data?.status !== "published" || !siteResult.data.slug) {
    throw new TableTerminalConnectionError("메뉴판을 공개한 뒤 손님용 메뉴판을 열어 주세요.");
  }
  return getPublicMenuPath(siteResult.data.slug) + "?mode=terminal";
}

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
export async function unregisterTableTerminal(menuSiteIdValue: string, tableIdValue: string, token: string | undefined, userAgent: string) {
  const menuSiteId = normalizeMenuTableId(menuSiteIdValue), tableId = normalizeMenuTableId(tableIdValue);
  await requireMenuSiteWriteAccess(menuSiteId, "table.manage", "menu_table_management");
  if (!isValidTableAccessToken(token)) throw new TableTerminalConnectionError("현재 태블릿은 이 테이블에 연결되어 있지 않습니다.");
  let userAgentHash: string;
  try { userAgentHash = hashTableVisitUserAgent(userAgent); } catch {
    throw new TableTerminalConnectionError("현재 태블릿의 연결 정보를 확인해 주세요.");
  }
  const now = new Date().toISOString();
  const { data, error } = await createAdminClient().from("table_visit_sessions").update({ revoked_at: now })
    .eq("menu_site_id", menuSiteId).eq("menu_table_id", tableId).eq("token_hash", hashTableAccessToken(token))
    .eq("access_channel", "terminal").eq("user_agent_hash", userAgentHash)
    .is("revoked_at", null).gt("expires_at", now).select("id").maybeSingle();
  if (error) throw new TableTerminalConnectionError("테이블 연결을 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  if (!data) throw new TableTerminalConnectionError("현재 태블릿은 이 테이블에 연결되어 있지 않습니다. 새로고침해 주세요.");
}
