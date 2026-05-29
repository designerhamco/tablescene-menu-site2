import { NextResponse, type NextRequest } from "next/server";

import { isDeletedAccountStatus } from "@/lib/account-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status });
}

async function parseBody(request: NextRequest) {
  try {
    return await request.json() as { confirmationText?: unknown; acceptedPolicy?: unknown };
  } catch {
    return {};
  }
}

function normalizeMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "42703";
}

async function cancelBusinessSubscriptions({
  adminSupabase,
  userId,
  nowIso,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  userId: string;
  nowIso: string;
}) {
  const updatePayload = {
    status: "canceled",
    cancel_at_period_end: true,
    cancel_requested_at: nowIso,
    canceled_at: nowIso,
    cancellation_reason: "account_deletion_requested",
    next_billing_at: null,
  };

  const { error } = await adminSupabase
    .from("business_subscriptions" as never)
    .update(updatePayload as never)
    .eq("user_id" as never, userId as never)
    .in("status" as never, ["pending", "active", "past_due"] as never);

  if (!error) return;

  if (!isMissingColumnError(error)) {
    throw new Error(`구독 자동갱신 중단 실패: ${error.message}`);
  }

  const { error: fallbackError } = await adminSupabase
    .from("business_subscriptions" as never)
    .update(({ status: "canceled", next_billing_at: null }) as never)
    .eq("user_id" as never, userId as never)
    .in("status" as never, ["pending", "active", "past_due"] as never);

  if (fallbackError) {
    throw new Error(`구독 자동갱신 중단 실패: ${fallbackError.message}`);
  }
}

async function markServiceEntitlementsPendingDelete({
  adminSupabase,
  userId,
  nowIso,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  userId: string;
  nowIso: string;
}) {
  const { error } = await adminSupabase
    .from("service_entitlements")
    .update({
      status: "pending_delete",
      access_expires_at: nowIso,
      expired_at: nowIso,
      data_retention_until: nowIso,
      deleted_scheduled_at: nowIso,
    })
    .eq("user_id", userId)
    .in("status", ["active", "expired", "archived"]);

  if (error && error.code !== "42P01") {
    throw new Error(`서비스 권한 차단 실패: ${error.message}`);
  }
}

async function archiveMenuSites({
  adminSupabase,
  userId,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  userId: string;
}) {
  const { error } = await adminSupabase
    .from("menu_sites")
    .update({ status: "archived" })
    .eq("user_id", userId)
    .in("status", ["draft", "published", "private", "unpublished"]);

  if (error) {
    throw new Error(`메뉴판 비공개 처리 실패: ${error.message}`);
  }
}

async function createAccountDeletionNotification({
  adminSupabase,
  userId,
  nowIso,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  userId: string;
  nowIso: string;
}) {
  const message = [
    "안녕하세요, 메뉴링크입니다.",
    "",
    "회원탈퇴 신청이 접수되어 계정 이용이 중단되었습니다.",
    "",
    "메뉴판은 비공개 및 삭제 예정 상태로 전환되며, 서비스 이용 데이터는 개인정보 처리방침과 데이터 보관·삭제 정책에 따라 처리됩니다.",
    "",
    "단, 결제·정산·분쟁 대응 및 관계 법령상 보관이 필요한 기록은 정해진 기간 동안 별도 보관될 수 있습니다.",
    "",
    "감사합니다.",
    "메뉴링크 드림",
  ].join("\n");

  const { error } = await adminSupabase
    .from("notification_events" as never)
    .insert({
      user_id: userId,
      event_type: "account_deletion_requested",
      channel: "email",
      title: "[메뉴링크] 회원탈퇴 신청 접수 안내",
      message,
      status: "pending",
      scheduled_for: nowIso,
      metadata: {
        period_key: `account_deletion_requested:${userId}`,
        requested_at: nowIso,
        source: "account-delete",
      },
    } as never);

  if (error && error.code !== "23505" && error.code !== "42P01") {
    throw new Error(`회원탈퇴 알림 기록 실패: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse({ ok: false, message: "로그인이 필요합니다." }, 401);
  }

  if (isDeletedAccountStatus(user.app_metadata)) {
    await supabase.auth.signOut();
    return jsonResponse({ ok: true, alreadyRequested: true });
  }

  const body = await parseBody(request);
  const confirmationText = typeof body.confirmationText === "string" ? body.confirmationText.trim() : "";
  const acceptedPolicy = body.acceptedPolicy === true;

  if (confirmationText !== "회원탈퇴" || !acceptedPolicy) {
    return jsonResponse({ ok: false, message: "회원탈퇴 안내 확인과 확인 문구 입력이 필요합니다." }, 400);
  }

  const nowIso = new Date().toISOString();
  const adminSupabase = createAdminClient();

  try {
    await cancelBusinessSubscriptions({ adminSupabase, userId: user.id, nowIso });
    await markServiceEntitlementsPendingDelete({ adminSupabase, userId: user.id, nowIso });
    await archiveMenuSites({ adminSupabase, userId: user.id });
    await createAccountDeletionNotification({ adminSupabase, userId: user.id, nowIso });

    const { error: userUpdateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...normalizeMetadata(user.app_metadata),
        account_status: "deletion_requested",
        deletion_requested_at: nowIso,
      },
      ban_duration: "876000h",
    });

    if (userUpdateError) {
      throw new Error(`계정 상태 업데이트 실패: ${userUpdateError.message}`);
    }

    await supabase.auth.signOut();

    return jsonResponse({
      ok: true,
      message: "회원탈퇴 신청이 접수되었습니다.",
      hardDeleted: false,
    });
  } catch (error) {
    console.error("[account/delete] failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });

    return jsonResponse({
      ok: false,
      message: error instanceof Error ? error.message : "회원탈퇴 신청 처리 중 오류가 발생했습니다.",
    }, 500);
  }
}
