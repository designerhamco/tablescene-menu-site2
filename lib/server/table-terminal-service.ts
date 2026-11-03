import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMenuSitePermission, requireMenuSiteWriteAccess, getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";
import { normalizeMenuTableId } from "@/lib/menu-table-management";
import { createTableVisitSessionMaterial, hashTableAccessToken, hashTableVisitUserAgent, isValidTableAccessToken } from "@/lib/table-qr-session-tokens";
import { getPublicMenuPath } from "@/lib/menu-url";
import { detectTerminalDevice, readTerminalDeviceInfo, type TableTerminalConnection } from "@/lib/terminal-device-info";
import { isPaidTableOperationsEligible } from "@/lib/table-operations-eligibility";
import type { Json } from "@/lib/supabase/types";

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

export async function registerTableTerminal(menuSiteIdValue: string, tableIdValue: string, userAgent: string, previousToken?:string, deviceValue?: unknown) {
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
  const args = {p_menu_site_id:menuSiteId,p_table_id:table.id,p_token_hash:material.tokenHash,p_user_agent_hash:material.userAgentHash,p_previous_token_hash:(previousToken?hashTableAccessToken(previousToken):null) as string};
  let inserted = await db.rpc("register_table_terminal_visit_with_device", { ...args, p_device_info: (readTerminalDeviceInfo(deviceValue) ?? detectTerminalDevice(userAgent)) as unknown as Json });
  // During an additive rollout only a genuinely missing RPC uses the old safe flow.
  if (inserted.error?.code === "PGRST202" || inserted.error?.code === "42883") inserted = await db.rpc("register_table_terminal_visit", args);
  if (inserted.error) throw new Error("공용 단말을 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return {token:material.rawToken,expiresAt:material.expiresAt.toISOString(),path:getPublicMenuPath(site.slug)+"?mode=terminal"};
}

async function requireTerminalManagement(menuSiteId: string, write: boolean) {
  if (write) await requireMenuSiteWriteAccess(menuSiteId, "table.manage", "menu_table_management");
  else await requireMenuSitePermission(menuSiteId, "table.manage");
  if (!isTableManagementRuntimeEnabledForSite(menuSiteId)) throw new TableTerminalConnectionError("기기 연결을 사용할 수 없습니다.");
  const db = createAdminClient();
  const [access, site] = await Promise.all([
    getMenuSiteAccessStateForMenuSite({ menuSiteId }),
    db.from("menu_sites").select("template_key").eq("id", menuSiteId).maybeSingle(),
  ]);
  if (site.error || !site.data || !isPaidTableOperationsEligible(access, site.data.template_key)) throw new TableTerminalConnectionError("기기 연결을 관리할 수 있는 메뉴판이 아닙니다.");
  return db;
}

/** Only registered shop devices; customer QR sessions and credentials never reach the client. */
export async function listTableTerminalConnections(menuSiteIdValue: string, token: string | undefined, userAgent: string): Promise<TableTerminalConnection[]> {
  const menuSiteId = normalizeMenuTableId(menuSiteIdValue);
  const db = await requireTerminalManagement(menuSiteId, false);
  const query = (withDevice: boolean) => db.from("table_visit_sessions")
    .select(withDevice ? "id,menu_table_id,created_at,token_hash,user_agent_hash,device_info" : "id,menu_table_id,created_at,token_hash,user_agent_hash", { count: "exact" })
    .eq("menu_site_id", menuSiteId).eq("access_channel", "terminal").is("revoked_at", null)
    .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: true }).limit(500);
  let result = await query(true);
  if (result.error && ["42703", "PGRST204"].includes(result.error.code) && result.error.message.includes("device_info")) result = await query(false);
  if (result.error || !Array.isArray(result.data) || result.count === null || result.count > 500) throw new TableTerminalConnectionError("연결 상태를 불러오지 못했습니다. 다시 확인해 주세요.");
  let tokenHash = "", agentHash = "";
  if (isValidTableAccessToken(token)) { try { tokenHash = hashTableAccessToken(token); agentHash = hashTableVisitUserAgent(userAgent); } catch {} }
  const rows = result.data as unknown as Array<{ id: string; menu_table_id: string; created_at: string; token_hash: string; user_agent_hash: string; device_info?: unknown }>;
  return rows.map(row => ({ id: row.id, tableId: row.menu_table_id, createdAt: row.created_at,
    current: Boolean(tokenHash && agentHash && row.token_hash === tokenHash && row.user_agent_hash === agentHash), device: readTerminalDeviceInfo(row.device_info) }));
}

/** Remote revoke is explicit and restricted to one registered terminal in the selected table. */
export async function revokeTableTerminalConnection(menuSiteIdValue: string, tableIdValue: string, connectionIdValue: string, token: string | undefined, userAgent: string) {
  const menuSiteId = normalizeMenuTableId(menuSiteIdValue), tableId = normalizeMenuTableId(tableIdValue), connectionId = normalizeMenuTableId(connectionIdValue);
  const db = await requireTerminalManagement(menuSiteId, true);
  const { data, error } = await db.from("table_visit_sessions").update({ revoked_at: new Date().toISOString() })
    .eq("id", connectionId).eq("menu_site_id", menuSiteId).eq("menu_table_id", tableId).eq("access_channel", "terminal")
    .is("revoked_at", null).gt("expires_at", new Date().toISOString()).select("id,token_hash,user_agent_hash").maybeSingle();
  if (error || !data) throw new TableTerminalConnectionError("연결이 이미 해제됐거나 변경되었습니다. 다시 확인해 주세요.");
  let current = false;
  if (isValidTableAccessToken(token)) { try { current = data.token_hash === hashTableAccessToken(token) && data.user_agent_hash === hashTableVisitUserAgent(userAgent); } catch {} }
  return { current };
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
