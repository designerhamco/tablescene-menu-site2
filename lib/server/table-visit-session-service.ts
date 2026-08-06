import "server-only";

import { getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTableManagementRuntimeEnabled } from "@/lib/table-management-runtime";
import {
  createTableVisitSessionMaterial,
  hashTableVisitUserAgent,
  hashTableAccessToken,
  isReusableTableVisitSessionToken,
  isTableVisitSessionUsable,
  isValidTableAccessToken,
  shouldTouchTableVisitSession,
} from "@/lib/table-qr-session-tokens";
import { isTemplateSupportedForService } from "@/lib/template-types";

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
  if (!isValidTableAccessToken(tableToken)) throw new TableVisitSessionError();

  const supabase = createAdminClient();
  const { data: table, error: tableError } = await supabase
    .from("menu_tables")
    .select(TABLE_QR_TARGET_SELECT)
    .eq("token_hash", hashTableAccessToken(tableToken))
    .eq("status", "active")
    .maybeSingle();

  if (tableError || !table) throw new TableVisitSessionError();

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
    || !isTemplateSupportedForService(menuSite.template_key, "basic")
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
  if (!isTableManagementRuntimeEnabled() || !isReusableTableVisitSessionToken(sessionToken)) return null;

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
    if (existing?.menuTableId === target.menuTableId) {
      return { ...existing, rawSessionToken: existingSessionToken, slug: target.slug };
    }
  }

  const supabase = createAdminClient();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const material = createTableVisitSessionMaterial({ userAgent: normalizedUserAgent, now });
    const { data, error } = await supabase
      .from("table_visit_sessions")
      .insert({
        menu_site_id: target.menuSiteId,
        menu_table_id: target.menuTableId,
        token_hash: material.tokenHash,
        user_agent_hash: material.userAgentHash,
        expires_at: material.expiresAt.toISOString(),
      })
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
      };
    }
    if (error?.code !== "23505") break;
  }

  throw new TableVisitSessionError("테이블 방문을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}
