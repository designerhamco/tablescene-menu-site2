import { NextResponse, type NextRequest } from "next/server";

import {
  buildDataRetentionStartedNoticeMessage,
  getDataRetentionStartedNoticeTitle,
  getDataRetentionStartedPeriodKey,
} from "@/lib/notification-events";
import { getPersonalTrialDataRetentionUntil, isRetentionEndedAfterKstDday } from "@/lib/service-retention-policy";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type TrialEntitlement = {
  id: string;
  user_id?: string | null;
  menu_site_id: string | null;
  access_expires_at: string | null;
  data_retention_until: string | null;
  expired_at: string | null;
  deleted_scheduled_at: string | null;
};

type CronResult = {
  expiredEntitlements: number;
  archivedMenuSites: number;
  repairedArchivedMenuSites: number;
  pendingDeleteEntitlements: number;
  reclaimedAiCredits: number;
  errors: string[];
};

function getCronSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("token");
}

function isAuthorizedCronRequest(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    return false;
  }

  return getCronSecret(request) === expectedSecret;
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "42P01" || Boolean(error?.message?.includes("service_entitlements"));
}

async function archiveMenuSites(menuSiteIds: string[]) {
  if (menuSiteIds.length === 0) {
    return { count: 0, error: null };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("menu_sites")
    .update({ status: "archived" })
    .in("id", menuSiteIds);

  return { count: error ? 0 : menuSiteIds.length, error };
}

async function getMenuSiteForRetentionStart(adminSupabase: ReturnType<typeof createAdminClient>, menuSiteId: string | null) {
  if (!menuSiteId) return null;

  const { data, error } = await adminSupabase
    .from("menu_sites")
    .select("id, name, slug")
    .eq("id", menuSiteId)
    .maybeSingle();

  if (error) return null;
  return data as { id: string; name: string | null; slug: string | null } | null;
}

async function createDataRetentionStartedNotification({
  adminSupabase,
  entitlement,
  retentionUntil,
  nowIso,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  entitlement: TrialEntitlement;
  retentionUntil: string;
  nowIso: string;
}) {
  if (!entitlement.user_id || !entitlement.menu_site_id) return;

  const periodKey = getDataRetentionStartedPeriodKey(entitlement.id, retentionUntil);
  const { data: existingEvent, error: existingEventError } = await adminSupabase
    .from("notification_events" as never)
    .select("id")
    .eq("user_id" as never, entitlement.user_id as never)
    .eq("menu_site_id" as never, entitlement.menu_site_id as never)
    .eq("event_type" as never, "data_retention_started" as never)
    .eq("channel" as never, "email" as never)
    .contains("metadata" as never, { period_key: periodKey } as never)
    .maybeSingle();

  if (existingEventError && existingEventError.code !== "PGRST116") {
    throw new Error(`보관 시작 알림 중복 확인 실패: ${existingEventError.message}`);
  }

  if (existingEvent) return;

  const menuSite = await getMenuSiteForRetentionStart(adminSupabase, entitlement.menu_site_id);
  const menuSiteName = menuSite?.name?.trim() || "메뉴판";
  const slug = menuSite?.slug ?? null;

  const { error } = await adminSupabase
    .from("notification_events" as never)
    .insert({
      user_id: entitlement.user_id,
      menu_site_id: entitlement.menu_site_id,
      event_type: "data_retention_started",
      channel: "email",
      title: getDataRetentionStartedNoticeTitle({ menuSiteName, slug, retentionUntil }),
      message: buildDataRetentionStartedNoticeMessage({ menuSiteName, slug, retentionUntil }),
      status: "pending",
      scheduled_for: nowIso,
      metadata: {
        period_key: periodKey,
        retention_until: retentionUntil,
        menu_site_name: menuSiteName,
        slug,
        source: "expire-personal-trials",
      },
    } as never);

  if (error && error.code !== "42P01") {
    throw new Error(`보관 시작 알림 이벤트 생성 실패: ${error.message}`);
  }
}

async function expireActiveTrials(nowIso: string): Promise<CronResult> {
  const adminSupabase = createAdminClient();
  const result: CronResult = {
    expiredEntitlements: 0,
    archivedMenuSites: 0,
    repairedArchivedMenuSites: 0,
    pendingDeleteEntitlements: 0,
    reclaimedAiCredits: 0,
    errors: [],
  };

  const { data: activeTrials, error: activeTrialsError } = await adminSupabase
    .from("service_entitlements")
    .select("id, user_id, menu_site_id, access_expires_at, data_retention_until, expired_at, deleted_scheduled_at")
    .eq("plan_type", "personal_trial")
    .eq("billing_type", "one_time")
    .eq("status", "active")
    .lte("access_expires_at", nowIso);

  if (activeTrialsError) {
    if (isMissingRelationError(activeTrialsError)) {
      result.errors.push("service_entitlements 테이블을 찾을 수 없습니다. migration 적용이 필요합니다.");
      return result;
    }

    throw new Error(`만료 대상 조회 실패: ${activeTrialsError.message}`);
  }

  const trials = (activeTrials ?? []) as TrialEntitlement[];
  const trialIds = trials.map((trial) => trial.id);
  const trialIdsMissingExpiredAt = trials
    .filter((trial) => !trial.expired_at)
    .map((trial) => trial.id);
  const menuSiteIds = trials
    .map((trial) => trial.menu_site_id)
    .filter((menuSiteId): menuSiteId is string => Boolean(menuSiteId));
  if (trialIds.length > 0) {
    for (const trial of trials) {
      const dataRetentionUntil = getPersonalTrialDataRetentionUntil(trial.access_expires_at ?? nowIso);
      if (!dataRetentionUntil) {
        throw new Error(`데이터 보관 종료일 계산 실패: ${trial.id}`);
      }

      const { error: updateError } = await adminSupabase
        .from("service_entitlements")
        .update({
          status: "expired",
          data_retention_until: dataRetentionUntil,
          deleted_scheduled_at: null,
        })
        .eq("id", trial.id);

      if (updateError) {
        throw new Error(`만료 상태 업데이트 실패(${trial.id}): ${updateError.message}`);
      }

      try {
        await createDataRetentionStartedNotification({
          adminSupabase,
          entitlement: trial,
          retentionUntil: dataRetentionUntil,
          nowIso,
        });
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : "보관 시작 알림 이벤트 생성 실패");
      }
    }

    result.expiredEntitlements = trialIds.length;
  }

  if (trialIdsMissingExpiredAt.length > 0) {
    const { error: expiredAtUpdateError } = await adminSupabase
      .from("service_entitlements")
      .update({
        expired_at: nowIso,
      })
      .in("id", trialIdsMissingExpiredAt);

    if (expiredAtUpdateError) {
      throw new Error(`만료 시각 업데이트 실패: ${expiredAtUpdateError.message}`);
    }
  }

  const archiveResult = await archiveMenuSites(menuSiteIds);

  if (archiveResult.error) {
    throw new Error(`만료 메뉴판 보관 상태 전환 실패: ${archiveResult.error.message}`);
  }

  result.archivedMenuSites += archiveResult.count;

  return result;
}

async function markRetentionEndedTrials(nowIso: string): Promise<CronResult> {
  const adminSupabase = createAdminClient();
  const result: CronResult = {
    expiredEntitlements: 0,
    archivedMenuSites: 0,
    repairedArchivedMenuSites: 0,
    pendingDeleteEntitlements: 0,
    reclaimedAiCredits: 0,
    errors: [],
  };

  const { data: retentionEndedTrials, error: retentionEndedTrialsError } = await adminSupabase
    .from("service_entitlements")
    .select("id, menu_site_id, access_expires_at, data_retention_until, expired_at, deleted_scheduled_at")
    .eq("plan_type", "personal_trial")
    .eq("billing_type", "one_time")
    .eq("status", "expired")
    .lte("data_retention_until", nowIso);

  if (retentionEndedTrialsError) {
    if (isMissingRelationError(retentionEndedTrialsError)) {
      result.errors.push("service_entitlements 테이블을 찾을 수 없습니다. migration 적용이 필요합니다.");
      return result;
    }

    throw new Error(`보관 만료 대상 조회 실패: ${retentionEndedTrialsError.message}`);
  }

  const trials = ((retentionEndedTrials ?? []) as TrialEntitlement[]).filter((trial) =>
    isRetentionEndedAfterKstDday(trial.data_retention_until, new Date(nowIso))
  );
  const trialIds = trials.map((trial) => trial.id);
  const trialIdsMissingDeletedScheduledAt = trials
    .filter((trial) => !trial.deleted_scheduled_at)
    .map((trial) => trial.id);
  const menuSiteIds = trials
    .map((trial) => trial.menu_site_id)
    .filter((menuSiteId): menuSiteId is string => Boolean(menuSiteId));

  if (trialIds.length > 0) {
    const { error: updateError } = await adminSupabase
      .from("service_entitlements")
      .update({
        status: "pending_delete",
      })
      .in("id", trialIds);

    if (updateError) {
      throw new Error(`삭제 예정 상태 업데이트 실패: ${updateError.message}`);
    }

    result.pendingDeleteEntitlements = trialIds.length;
  }

  if (trialIdsMissingDeletedScheduledAt.length > 0) {
    const { error: deletedScheduledAtUpdateError } = await adminSupabase
      .from("service_entitlements")
      .update({
        deleted_scheduled_at: nowIso,
      })
      .in("id", trialIdsMissingDeletedScheduledAt);

    if (deletedScheduledAtUpdateError) {
      throw new Error(`삭제 예정 시각 업데이트 실패: ${deletedScheduledAtUpdateError.message}`);
    }
  }

  const archiveResult = await archiveMenuSites(menuSiteIds);

  if (archiveResult.error) {
    throw new Error(`보관 만료 메뉴판 보관 상태 전환 실패: ${archiveResult.error.message}`);
  }

  result.archivedMenuSites += archiveResult.count;

  return result;
}

async function reconcileExpiredTrialMenuSites(): Promise<CronResult> {
  const adminSupabase = createAdminClient();
  const result: CronResult = {
    expiredEntitlements: 0,
    archivedMenuSites: 0,
    repairedArchivedMenuSites: 0,
    pendingDeleteEntitlements: 0,
    reclaimedAiCredits: 0,
    errors: [],
  };

  const { data: endedTrials, error: endedTrialsError } = await adminSupabase
    .from("service_entitlements")
    .select("id, menu_site_id, access_expires_at, data_retention_until, expired_at, deleted_scheduled_at")
    .eq("plan_type", "personal_trial")
    .eq("billing_type", "one_time")
    .in("status", ["expired", "pending_delete"]);

  if (endedTrialsError) {
    if (isMissingRelationError(endedTrialsError)) {
      result.errors.push("service_entitlements 테이블을 찾을 수 없습니다. migration 적용이 필요합니다.");
      return result;
    }

    throw new Error(`만료/삭제 예정 메뉴판 보정 대상 조회 실패: ${endedTrialsError.message}`);
  }

  const menuSiteIds = Array.from(
    new Set(
      ((endedTrials ?? []) as TrialEntitlement[])
        .map((trial) => trial.menu_site_id)
        .filter((menuSiteId): menuSiteId is string => Boolean(menuSiteId))
    )
  );

  if (menuSiteIds.length === 0) {
    return result;
  }

  const { data: publishedSites, error: publishedSitesError } = await adminSupabase
    .from("menu_sites")
    .select("id")
    .in("id", menuSiteIds)
    .eq("status", "published");

  if (publishedSitesError) {
    throw new Error(`공개 상태 메뉴판 보정 대상 조회 실패: ${publishedSitesError.message}`);
  }

  const publishedSiteIds = (publishedSites ?? [])
    .map((site) => site.id)
    .filter((menuSiteId): menuSiteId is string => Boolean(menuSiteId));

  const archiveResult = await archiveMenuSites(publishedSiteIds);

  if (archiveResult.error) {
    throw new Error(`만료/삭제 예정 메뉴판 보정 실패: ${archiveResult.error.message}`);
  }

  result.repairedArchivedMenuSites = archiveResult.count;

  return result;
}

async function handleCron(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ ok: false, message: "CRON_SECRET이 설정되어 있지 않습니다." }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();

  try {
    const expiredResult = await expireActiveTrials(nowIso);
    const pendingDeleteResult = await markRetentionEndedTrials(nowIso);
    const repairResult = await reconcileExpiredTrialMenuSites();

    return NextResponse.json({
      ok: true,
      now: nowIso,
      expiredEntitlements: expiredResult.expiredEntitlements,
      pendingDeleteEntitlements: pendingDeleteResult.pendingDeleteEntitlements,
      reclaimedAiCredits: pendingDeleteResult.reclaimedAiCredits,
      archivedMenuSites: expiredResult.archivedMenuSites + pendingDeleteResult.archivedMenuSites,
      repairedArchivedMenuSites: repairResult.repairedArchivedMenuSites,
      hardDeleted: 0,
      errors: [...expiredResult.errors, ...pendingDeleteResult.errors, ...repairResult.errors],
      nextStep:
        "pending_delete 상태의 menu_pages, menu_categories, menu_items, 이미지 storage 파일 삭제 job은 2차 작업에서 별도 구현합니다. orders/payments/service_entitlements 기록은 삭제하지 않습니다.",
    });
  } catch (error) {
    console.error("[cron:expire-personal-trials] failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "개인 체험 만료 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
