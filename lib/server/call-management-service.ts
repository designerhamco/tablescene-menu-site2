import "server-only";

import {
  assertStaffCallTransition,
  CallManagementInputError,
  getNextStaffCallStatus,
  normalizeCallId,
  type StaffCallStaffStatus,
} from "@/lib/call-management";
import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import {
  requireMenuSitePermission,
  requireMenuSiteWriteAccess,
} from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";

type CallRow = {
  id: string;
  call_number: number;
  menu_table_id: string;
  call_type: string;
  status: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  completed_by: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CallDashboardCall = {
  id: string;
  callNumber: number;
  tableLabel: string;
  callType: "staff";
  status: string;
  nextStatus: StaffCallStaffStatus | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  completedBy: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CallDashboardPageData = {
  menuSite: { id: string; name: string };
  calls: CallDashboardCall[];
};

type DatabaseError = { code?: string; message?: string };

export class CallManagementError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "DASHBOARD_UNAVAILABLE"
      | "CALL_NOT_FOUND"
      | "CALL_CONFLICT"
      | "CALL_READ_FAILED"
      | "CALL_UPDATE_FAILED",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CallManagementError";
  }
}

function normalizedId(value: unknown) {
  try {
    return normalizeCallId(value);
  } catch (error) {
    if (error instanceof CallManagementInputError) {
      throw new CallManagementError("INVALID_INPUT", error.message, 400);
    }
    throw error;
  }
}

function assertDashboardEnabled(menuSiteId: string) {
  if (!isCallRuntimeEnabledForSite(menuSiteId)) {
    throw new CallManagementError(
      "DASHBOARD_UNAVAILABLE",
      "호출관리는 상품 및 운영 활성화 전까지 안전하게 잠겨 두었습니다.",
      403,
    );
  }
}

function failRead(error: DatabaseError | null): never {
  console.warn("[call-dashboard] read failed", { code: error?.code ?? "unknown", message: error?.message ?? "unknown" });
  throw new CallManagementError("CALL_READ_FAILED", "호출 정보를 불러오지 못했습니다.", 500);
}

function failUpdate(error: DatabaseError | null): never {
  console.warn("[call-dashboard] update failed", { code: error?.code ?? "unknown", message: error?.message ?? "unknown" });
  throw new CallManagementError("CALL_UPDATE_FAILED", "호출 상태를 변경하지 못했습니다.", 500);
}

export async function listCallDashboard(menuSiteIdValue: unknown): Promise<CallDashboardPageData> {
  const menuSiteId = normalizedId(menuSiteIdValue);
  assertDashboardEnabled(menuSiteId);
  await requireMenuSitePermission(menuSiteId, "call.manage");
  const supabase = createAdminClient();

  const [siteResult, callsResult, tablesResult] = await Promise.all([
    supabase.from("menu_sites").select("id, name").eq("id", menuSiteId).maybeSingle(),
    supabase
      .from("menu_customer_calls" as never)
      .select("id, call_number, menu_table_id, call_type, status, acknowledged_by, acknowledged_at, completed_by, completed_at, cancelled_at, created_at, updated_at")
      .eq("menu_site_id" as never, menuSiteId as never)
      .order("created_at" as never, { ascending: false })
      .limit(100),
    supabase.from("menu_tables").select("id, label").eq("menu_site_id", menuSiteId),
  ]);
  if (siteResult.error || !siteResult.data) {
    if (!siteResult.data && !siteResult.error) {
      throw new CallManagementError("CALL_NOT_FOUND", "메뉴판을 찾을 수 없습니다.", 404);
    }
    failRead(siteResult.error);
  }
  if (callsResult.error) failRead(callsResult.error);
  if (tablesResult.error) failRead(tablesResult.error);

  const tableLabelById = new Map((tablesResult.data ?? []).map((table) => [table.id, table.label]));
  const calls = (callsResult.data ?? []) as unknown as CallRow[];
  return {
    menuSite: siteResult.data,
    calls: calls.map((call) => ({
      id: call.id,
      callNumber: call.call_number,
      tableLabel: tableLabelById.get(call.menu_table_id) ?? "알 수 없는 테이블",
      callType: "staff",
      status: call.status,
      nextStatus: getNextStaffCallStatus(call.status),
      acknowledgedBy: call.acknowledged_by,
      acknowledgedAt: call.acknowledged_at,
      completedBy: call.completed_by,
      completedAt: call.completed_at,
      cancelledAt: call.cancelled_at,
      createdAt: call.created_at,
      updatedAt: call.updated_at,
    })),
  };
}

export async function transitionStaffCall({
  menuSiteId: menuSiteIdValue,
  callId: callIdValue,
  nextStatus,
}: {
  menuSiteId: unknown;
  callId: unknown;
  nextStatus: unknown;
}) {
  const menuSiteId = normalizedId(menuSiteIdValue);
  const callId = normalizedId(callIdValue);
  assertDashboardEnabled(menuSiteId);
  if (nextStatus !== "acknowledged" && nextStatus !== "completed") {
    throw new CallManagementError("INVALID_INPUT", "올바른 다음 호출 상태가 필요합니다.", 400);
  }
  const surface = nextStatus === "acknowledged" ? "call_acknowledgement" : "call_completion";
  const { context, supabase } = await requireMenuSiteWriteAccess(menuSiteId, "call.manage", surface);
  const currentResult = await supabase
    .from("menu_customer_calls" as never)
    .select("id, status")
    .eq("menu_site_id" as never, menuSiteId as never)
    .eq("id" as never, callId as never)
    .maybeSingle();
  if (currentResult.error) failUpdate(currentResult.error);
  const current = currentResult.data as unknown as { id: string; status: string } | null;
  if (!current) throw new CallManagementError("CALL_NOT_FOUND", "호출을 찾을 수 없습니다.", 404);

  let normalizedNext: StaffCallStaffStatus;
  try {
    normalizedNext = assertStaffCallTransition(current.status, nextStatus);
  } catch (error) {
    if (error instanceof CallManagementInputError) {
      throw new CallManagementError("CALL_CONFLICT", error.message, 409);
    }
    throw error;
  }

  const now = new Date().toISOString();
  const update = normalizedNext === "acknowledged"
    ? { status: normalizedNext, acknowledged_by: context.actorUserId, acknowledged_at: now }
    : { status: normalizedNext, completed_by: context.actorUserId, completed_at: now };

  const updateResult = await supabase
    .from("menu_customer_calls" as never)
    .update(update as never)
    .eq("menu_site_id" as never, menuSiteId as never)
    .eq("id" as never, callId as never)
    .eq("status" as never, current.status as never)
    .select("id, status")
    .maybeSingle();
  if (updateResult.error) failUpdate(updateResult.error);
  if (!updateResult.data) {
    throw new CallManagementError("CALL_CONFLICT", "다른 사용자가 호출을 먼저 변경했습니다. 새로고침 후 확인해 주세요.", 409);
  }
  return updateResult.data;
}
