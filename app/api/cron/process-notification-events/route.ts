import { NextResponse, type NextRequest } from "next/server";

import { sendNotificationEmail } from "@/lib/email-notifications";
import {
  buildDataRetentionNoticeMessage,
  getRetentionNoticePeriodKey,
  getRetentionNoticeTitle,
  RETENTION_NOTICE_DAY_OFFSETS,
  type NotificationEventRecord,
} from "@/lib/notification-events";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

type CronRequestOptions = {
  dryRun: boolean;
  execute: boolean;
};

type RetentionEntitlement = {
  id: string;
  user_id: string;
  menu_site_id: string | null;
  subscription_id: string | null;
  status: string;
  data_retention_until: string | null;
};

type MenuSiteForNotice = {
  id: string;
  name: string | null;
  slug: string | null;
};

type ContactProfileForNotice = {
  user_id: string;
  notification_email: string | null;
};

type NoticeCandidate = {
  userId: string;
  menuSiteId: string;
  subscriptionId: string | null;
  eventType: "data_retention_ending_soon" | "data_deletion_scheduled";
  periodKey: string;
  title: string;
  message: string;
  scheduledFor: string;
  metadata: Record<string, Json>;
};

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() === "bearer" && token) {
    return token.trim();
  }

  return request.headers.get("x-cron-secret")?.trim() ?? request.nextUrl.searchParams.get("token")?.trim() ?? "";
}

function isAuthorized(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET?.trim();

  return Boolean(expectedSecret) && getBearerToken(request) === expectedSecret;
}

function getBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

async function getRequestOptions(request: NextRequest): Promise<CronRequestOptions> {
  const executeFromQuery = request.nextUrl.searchParams.get("execute");
  const dryRunFromQuery = request.nextUrl.searchParams.get("dryRun");

  if (request.method === "POST") {
    try {
      const body = await request.json() as { execute?: unknown; dryRun?: unknown };
      const execute = getBoolean(body.execute ?? executeFromQuery, false);
      return {
        execute,
        dryRun: getBoolean(body.dryRun ?? dryRunFromQuery, !execute),
      };
    } catch {
      // Fall through to query parsing.
    }
  }

  const execute = getBoolean(executeFromQuery, false);
  return {
    execute,
    dryRun: getBoolean(dryRunFromQuery, !execute),
  };
}

function getDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDaysLeft(targetIso: string, now: Date) {
  const target = new Date(targetIso);

  if (!Number.isFinite(target.getTime())) {
    return null;
  }

  return Math.round((getDayStart(target).getTime() - getDayStart(now).getTime()) / (1000 * 60 * 60 * 24));
}

async function getMenuSitesById(adminSupabase: ReturnType<typeof createAdminClient>, menuSiteIds: string[]) {
  if (menuSiteIds.length === 0) return new Map<string, MenuSiteForNotice>();

  const { data, error } = await adminSupabase
    .from("menu_sites")
    .select("id, name, slug")
    .in("id", menuSiteIds);

  if (error) {
    throw new Error(`메뉴판 정보 조회 실패: ${error.message}`);
  }

  return new Map((data ?? []).map((site) => [site.id, site as MenuSiteForNotice]));
}

async function getContactEmailsByUserId(adminSupabase: ReturnType<typeof createAdminClient>, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();

  const { data, error } = await adminSupabase
    .from("user_contact_profiles" as never)
    .select("user_id, notification_email")
    .in("user_id" as never, userIds as never);

  if (error && error.code !== "42P01" && error.code !== "42501") {
    throw new Error(`알림 이메일 조회 실패: ${error.message}`);
  }

  const emailByUserId = new Map<string, string>();

  for (const row of (data ?? []) as unknown as ContactProfileForNotice[]) {
    const email = row.notification_email?.trim();
    if (row.user_id && email) {
      emailByUserId.set(row.user_id, email);
    }
  }

  return emailByUserId;
}

async function getRecipientEmail(adminSupabase: ReturnType<typeof createAdminClient>, userId: string, contactEmailByUserId: Map<string, string>) {
  const contactEmail = contactEmailByUserId.get(userId);

  if (contactEmail) {
    return contactEmail;
  }

  const { data, error } = await adminSupabase.auth.admin.getUserById(userId);

  if (error) {
    return null;
  }

  return data.user?.email ?? null;
}

async function findExistingEvent(adminSupabase: ReturnType<typeof createAdminClient>, candidate: NoticeCandidate) {
  const { data, error } = await adminSupabase
    .from("notification_events" as never)
    .select("id")
    .eq("user_id" as never, candidate.userId as never)
    .eq("menu_site_id" as never, candidate.menuSiteId as never)
    .eq("event_type" as never, candidate.eventType as never)
    .eq("channel" as never, "email" as never)
    .contains("metadata" as never, { period_key: candidate.periodKey } as never)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`중복 알림 확인 실패: ${error.message}`);
  }

  return Boolean(data);
}

async function createNotificationEvent(adminSupabase: ReturnType<typeof createAdminClient>, candidate: NoticeCandidate) {
  const { data, error } = await adminSupabase
    .from("notification_events" as never)
    .insert({
      user_id: candidate.userId,
      menu_site_id: candidate.menuSiteId,
      subscription_id: candidate.subscriptionId,
      event_type: candidate.eventType,
      channel: "email",
      title: candidate.title,
      message: candidate.message,
      status: "pending",
      scheduled_for: candidate.scheduledFor,
      metadata: candidate.metadata,
    } as never)
    .select("id, user_id, menu_site_id, subscription_id, event_type, channel, title, message, status, scheduled_for, sent_at, read_at, metadata, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`알림 이벤트 생성 실패: ${error.message}`);
  }

  return data as unknown as NotificationEventRecord;
}

async function buildRetentionNoticeCandidates(adminSupabase: ReturnType<typeof createAdminClient>, now: Date) {
  const todayStart = getDayStart(now);
  const maxRetentionDate = addDays(todayStart, Math.max(...RETENTION_NOTICE_DAY_OFFSETS));

  const { data, error } = await adminSupabase
    .from("service_entitlements")
    .select("id, user_id, menu_site_id, subscription_id, status, data_retention_until")
    .in("status", ["expired", "pending_delete"])
    .not("data_retention_until", "is", null)
    .gte("data_retention_until", todayStart.toISOString())
    .lte("data_retention_until", maxRetentionDate.toISOString());

  if (error) {
    if (error.code === "42P01") {
      return {
        candidates: [] as NoticeCandidate[],
        warnings: ["service_entitlements 테이블을 찾을 수 없어 데이터 보관 종료 알림 대상을 조회하지 못했습니다."],
      };
    }

    throw new Error(`데이터 보관 종료 알림 대상 조회 실패: ${error.message}`);
  }

  const entitlements = (data ?? []) as RetentionEntitlement[];
  const menuSiteIds = Array.from(new Set(entitlements.map((item) => item.menu_site_id).filter((id): id is string => Boolean(id))));
  const menuSitesById = await getMenuSitesById(adminSupabase, menuSiteIds);
  const candidates: NoticeCandidate[] = [];

  for (const entitlement of entitlements) {
    if (!entitlement.menu_site_id || !entitlement.data_retention_until) continue;

    const daysLeft = getDaysLeft(entitlement.data_retention_until, now);
    if (daysLeft === null || !RETENTION_NOTICE_DAY_OFFSETS.includes(daysLeft as typeof RETENTION_NOTICE_DAY_OFFSETS[number])) continue;

    const menuSite = menuSitesById.get(entitlement.menu_site_id);
    const menuSiteName = menuSite?.name?.trim() || "메뉴판";
    const periodKey = getRetentionNoticePeriodKey(entitlement.menu_site_id, daysLeft, entitlement.data_retention_until);
    const eventType = daysLeft === 0 ? "data_deletion_scheduled" : "data_retention_ending_soon";

    candidates.push({
      userId: entitlement.user_id,
      menuSiteId: entitlement.menu_site_id,
      subscriptionId: entitlement.subscription_id,
      eventType,
      periodKey,
      title: getRetentionNoticeTitle(daysLeft),
      message: buildDataRetentionNoticeMessage({
        menuSiteName,
        slug: menuSite?.slug ?? null,
        retentionUntil: entitlement.data_retention_until,
        daysLeft,
      }),
      scheduledFor: now.toISOString(),
      metadata: {
        period_key: periodKey,
        days_left: daysLeft,
        retention_until: entitlement.data_retention_until,
        menu_site_name: menuSiteName,
        slug: menuSite?.slug ?? null,
        source: "process-notification-events",
      },
    });
  }

  return {
    candidates,
    warnings: [] as string[],
  };
}

async function processPendingEmails(adminSupabase: ReturnType<typeof createAdminClient>, now: Date) {
  const { data, error } = await adminSupabase
    .from("notification_events" as never)
    .select("id, user_id, menu_site_id, subscription_id, event_type, channel, title, message, status, scheduled_for, sent_at, read_at, metadata, created_at, updated_at")
    .eq("channel" as never, "email" as never)
    .eq("status" as never, "pending" as never)
    .or(`scheduled_for.is.null,scheduled_for.lte.${now.toISOString()}` as never)
    .order("created_at" as never, { ascending: true } as never)
    .limit(25);

  if (error) {
    throw new Error(`발송 대기 알림 조회 실패: ${error.message}`);
  }

  const events = (data ?? []) as unknown as NotificationEventRecord[];
  const userIds = Array.from(new Set(events.map((event) => event.user_id)));
  const contactEmailByUserId = await getContactEmailsByUserId(adminSupabase, userIds);
  const results: Array<{ id: string; status: "sent" | "failed" | "skipped" | "pending"; message?: string }> = [];

  for (const event of events) {
    const recipient = await getRecipientEmail(adminSupabase, event.user_id, contactEmailByUserId);

    if (!recipient) {
      await adminSupabase
        .from("notification_events" as never)
        .update({
          status: "skipped",
          metadata: {
            ...(typeof event.metadata === "object" && event.metadata && !Array.isArray(event.metadata) ? event.metadata : {}),
            skipped_reason: "recipient_email_missing",
          },
        } as never)
        .eq("id" as never, event.id as never);
      results.push({ id: event.id, status: "skipped", message: "수신 이메일이 없습니다." });
      continue;
    }

    if (process.env.EMAIL_PROVIDER?.trim().toLowerCase() !== "resend" || !process.env.RESEND_API_KEY?.trim()) {
      results.push({ id: event.id, status: "pending", message: "이메일 provider가 설정되지 않아 pending 상태를 유지합니다." });
      continue;
    }

    const emailResult = await sendNotificationEmail({
      to: recipient,
      subject: event.title,
      text: event.message,
    });

    if (emailResult.ok) {
      await adminSupabase
        .from("notification_events" as never)
        .update({
          status: "sent",
          sent_at: now.toISOString(),
          metadata: {
            ...(typeof event.metadata === "object" && event.metadata && !Array.isArray(event.metadata) ? event.metadata : {}),
            email_provider: emailResult.provider,
            email_provider_id: emailResult.id ?? null,
          },
        } as never)
        .eq("id" as never, event.id as never);
      results.push({ id: event.id, status: "sent" });
    } else {
      await adminSupabase
        .from("notification_events" as never)
        .update({
          status: "failed",
          metadata: {
            ...(typeof event.metadata === "object" && event.metadata && !Array.isArray(event.metadata) ? event.metadata : {}),
            email_provider: emailResult.provider,
            email_error: "error" in emailResult ? emailResult.error : emailResult.skippedReason,
          },
        } as never)
        .eq("id" as never, event.id as never);
      results.push({ id: event.id, status: "failed" });
    }
  }

  return results;
}

async function handleCron(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ ok: false, message: "CRON_SECRET이 설정되어 있지 않습니다." }, { status: 500 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const options = await getRequestOptions(request);
  const adminSupabase = createAdminClient();
  const now = new Date();
  const { candidates, warnings } = await buildRetentionNoticeCandidates(adminSupabase, now);
  const wouldCreate: NoticeCandidate[] = [];
  const skippedDuplicates: string[] = [];

  for (const candidate of candidates) {
    const exists = await findExistingEvent(adminSupabase, candidate);

    if (exists) {
      skippedDuplicates.push(candidate.periodKey);
    } else {
      wouldCreate.push(candidate);
    }
  }

  const createdEvents: NotificationEventRecord[] = [];

  if (options.execute) {
    for (const candidate of wouldCreate) {
      createdEvents.push(await createNotificationEvent(adminSupabase, candidate));
    }
  }

  const emailResults = options.execute ? await processPendingEmails(adminSupabase, now) : [];

  return NextResponse.json({
    ok: true,
    dryRun: options.dryRun,
    execute: options.execute,
    now: now.toISOString(),
    candidates: candidates.length,
    wouldCreate: wouldCreate.map((candidate) => ({
      eventType: candidate.eventType,
      userId: candidate.userId,
      menuSiteId: candidate.menuSiteId,
      periodKey: candidate.periodKey,
      title: candidate.title,
    })),
    created: createdEvents.map((event) => event.id),
    skippedDuplicates,
    emailProviderConfigured: process.env.EMAIL_PROVIDER?.trim().toLowerCase() === "resend" && Boolean(process.env.RESEND_API_KEY?.trim()),
    emailResults,
    warnings,
    todos: [
      "회원탈퇴 데이터 파기 예정 알림은 회원탈퇴 기능과 보관 기준일 확정 후 연결합니다.",
      "장기 미접속 1년 기준 고지는 정책 확정 후 활성화합니다.",
      "카카오 알림톡/SMS는 이번 MVP에서 연동하지 않습니다.",
      "pending_delete 이후 hard delete 및 Supabase Storage 이미지 삭제는 2차 작업에서 별도 구현합니다.",
    ],
  });
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
