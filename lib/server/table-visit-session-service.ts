import "server-only";
import { CUSTOMER_ORDER_SECONDS, type OrderChannel } from "@/lib/order-session-policy";

import { getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isTableManagementRuntimeEnabled,
  isTableManagementRuntimeEnabledForSite,
} from "@/lib/table-management-runtime";
import {
  createTableVisitSessionMaterial,
  hashTableVisitUserAgent,
  hashTableAccessToken,
  isReusableTableVisitSessionToken,
  isTableVisitSessionUsable,
  isValidTableQrIdentifier,
  isValidTableQrPublicId,
  shouldTouchTableVisitSession,
} from "@/lib/table-qr-session-tokens";

const TABLE_QR_TARGET_SELECT = "id, menu_site_id, label, status";
const TABLE_VISIT_SESSION_SELECT = "id, menu_site_id, menu_table_id, user_agent_hash, expires_at, last_seen_at, revoked_at";

type TableQrTarget = {
  menuSiteId: string;
  menuTableId: string;
  tableLabel: string;
  slug: string;
};

export type ResolvedTableVisitSession = {
  id: string;
  menuSiteId: string;
  menuTableId: string;
  tableLabel: string;
  expiresAt: string;
  channel?: OrderChannel;
  orderExpiresAt?: string | null;
};

export type IssuedTableVisitSession = ResolvedTableVisitSession & {
  rawSessionToken: string;
  slug: string;
};

export class TableVisitSessionError extends Error {
  constructor(message = "이 테이블 QR을 사용할 수 없습니다.") {
    super(message);
    this.name = "TableVisitSessionError";
  }
}

function requireRuntimeEnabled() {
  if (!isTableManagementRuntimeEnabled()) {
    throw new TableVisitSessionError();
  }
}

async function getActiveTableQrTarget(tableToken: string): Promise<TableQrTarget> {
  requireRuntimeEnabled();
  if (!isValidTableQrIdentifier(tableToken)) throw new TableVisitSessionError();

  const supabase = createAdminClient();
  let tableQuery = supabase
    .from("menu_tables")
    .select(TABLE_QR_TARGET_SELECT)
    .eq("status", "active");

  tableQuery = isValidTableQrPublicId(tableToken)
    ? tableQuery.eq("qr_public_id", tableToken)
    : tableQuery.eq("token_hash", hashTableAccessToken(tableToken));

  const { data: table, error: tableError } = await tableQuery.maybeSingle();

  if (tableError || !table) throw new TableVisitSessionError();
  if (!isTableManagementRuntimeEnabledForSite(table.menu_site_id)) throw new TableVisitSessionError();

  const [accessState, menuSiteResult] = await Promise.all([
    getMenuSiteAccessStateForMenuSite({ menuSiteId: table.menu_site_id }),
    supabase
      .from("menu_sites")
      .select("id, slug, status, template_key")
      .eq("id", table.menu_site_id)
      .maybeSingle(),
  ]);
  const menuSite = menuSiteResult.data;

  if (
    menuSiteResult.error
    || !menuSite
    || !menuSite.slug
    || menuSite.status !== "published"
    || !accessState?.canViewPublic
    || accessState.planType !== "business_basic"
    || !getDiningTemplateFeatures(menuSite.template_key).smartCall
  ) {
    throw new TableVisitSessionError();
  }

  return {
    menuSiteId: table.menu_site_id,
    menuTableId: table.id,
    tableLabel: table.label,
    slug: menuSite.slug,
  };
}

export async function resolveTableVisitSession({
  expectedMenuSiteId,
  sessionToken,
  userAgent,
  now = new Date(),
}: {
  expectedMenuSiteId: string;
  sessionToken: string | null | undefined;
  userAgent: string | null | undefined;
  now?: Date;
}): Promise<ResolvedTableVisitSession | null> {
  if (!isTableManagementRuntimeEnabledForSite(expectedMenuSiteId) || !isReusableTableVisitSessionToken(sessionToken)) return null;

  let userAgentHash: string;
  try {
    userAgentHash = hashTableVisitUserAgent(userAgent);
  } catch {
    return null;
  }

  const supabase = createAdminClient();
  const { data: session, error: sessionError } = await supabase
    .from("table_visit_sessions")
    .select(TABLE_VISIT_SESSION_SELECT)
    .eq("token_hash", hashTableAccessToken(sessionToken))
    .eq("menu_site_id", expectedMenuSiteId)
    .maybeSingle();

  if (
    sessionError
    || !session
    || !isTableVisitSessionUsable(
      {
        menuSiteId: session.menu_site_id,
        menuTableId: session.menu_table_id,
        userAgentHash: session.user_agent_hash,
        expiresAt: session.expires_at,
        lastSeenAt: session.last_seen_at,
        revokedAt: session.revoked_at,
      },
      { expectedMenuSiteId, userAgentHash, now },
    )
  ) {
    return null;
  }

  const { data: table, error: tableError } = await supabase
    .from("menu_tables")
    .select("id, label, status")
    .eq("menu_site_id", expectedMenuSiteId)
    .eq("id", session.menu_table_id)
    .eq("status", "active")
    .maybeSingle();

  if (tableError || !table) return null;

  const access = await supabase.rpc("resolve_order_visit_access", {p_menu_site_id: expectedMenuSiteId, p_session_id: session.id});
  if (access.error || !access.data || typeof access.data !== "object") return null;
  const orderAccess = access.data as {channel?: unknown; orderExpiresAt?: unknown};
  if (orderAccess.channel !== "customer" && orderAccess.channel !== "terminal") return null;

  if (shouldTouchTableVisitSession(session.last_seen_at, now)) {
    await supabase
      .from("table_visit_sessions")
      .update({ last_seen_at: now.toISOString() })
      .eq("id", session.id)
      .is("revoked_at", null)
      .gt("expires_at", now.toISOString());
  }

  return {
    id: session.id,
    menuSiteId: expectedMenuSiteId,
    menuTableId: table.id,
    tableLabel: table.label,
    expiresAt: session.expires_at,
    channel: orderAccess.channel,
    orderExpiresAt: typeof orderAccess.orderExpiresAt === "string" ? orderAccess.orderExpiresAt : null,
  };
}

export async function issueTableVisitSession({
  tableToken,
  existingSessionToken,
  userAgent,
  now = new Date(),
}: {
  tableToken: string;
  existingSessionToken: string | null | undefined;
  userAgent: string | null | undefined;
  now?: Date;
}): Promise<IssuedTableVisitSession> {
  const target = await getActiveTableQrTarget(tableToken);
  let normalizedUserAgent: string;
  try {
    hashTableVisitUserAgent(userAgent);
    normalizedUserAgent = userAgent!.trim();
  } catch {
    throw new TableVisitSessionError();
  }

  if (isReusableTableVisitSessionToken(existingSessionToken)) {
    const existing = await resolveTableVisitSession({
      expectedMenuSiteId: target.menuSiteId,
      sessionToken: existingSessionToken,
      userAgent: normalizedUserAgent,
      now,
    });
    if (existing?.channel === "terminal" || existing?.menuTableId === target.menuTableId) {
      const renewed = existing.channel === "terminal" ? existing : await extendTableOrderAccess(existing, true);
      return { ...renewed, rawSessionToken: existingSessionToken, slug: target.slug };
    }
  }

  const supabase = createAdminClient();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const material = createTableVisitSessionMaterial({ userAgent: normalizedUserAgent, now });
    const sessionInsert = {
      menu_site_id: target.menuSiteId, menu_table_id: target.menuTableId,
      token_hash: material.tokenHash, user_agent_hash: material.userAgentHash,
      expires_at: material.expiresAt.toISOString(),
    };
    const { data, error } = await supabase
      .from("table_visit_sessions")
      .insert(sessionInsert)
      .select("id, expires_at")
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        menuSiteId: target.menuSiteId,
        menuTableId: target.menuTableId,
        tableLabel: target.tableLabel,
        expiresAt: data.expires_at,
        rawSessionToken: material.rawToken,
        slug: target.slug,
        channel: "customer",
        orderExpiresAt: new Date(now.getTime() + CUSTOMER_ORDER_SECONDS * 1000).toISOString(),
      };
    }
    if (error?.code !== "23505") break;
  }

  throw new TableVisitSessionError("테이블 방문을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

export async function extendTableOrderAccess(visit: ResolvedTableVisitSession, rescan = false): Promise<ResolvedTableVisitSession> {
  const {data, error} = await createAdminClient().rpc("extend_table_order_access", {
    p_menu_site_id: visit.menuSiteId, p_session_id: visit.id, p_rescan: rescan,
  });
  if (error || typeof data !== "string") throw new TableVisitSessionError("주문 이용 시간이 만료되었습니다. 테이블 QR을 다시 스캔해 주세요.");
  return {...visit, orderExpiresAt: data};
}
