import "server-only";

import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import { normalizeCallId } from "@/lib/call-management";
import { getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import type { ResolvedTableVisitSession } from "@/lib/server/table-visit-session-service";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmittedStaffCall = {
  callId: string;
  callNumber: number;
  status: "pending" | "acknowledged";
  duplicate: boolean;
};

type SubmitRpcRow = {
  call_id: string;
  call_number: number;
  call_status: "pending" | "acknowledged";
  is_duplicate: boolean;
};

type CancelRpcRow = {
  call_id: string;
  call_status: "cancelled";
};

export class StaffCallSubmissionError extends Error {
  constructor(
    message = "직원 호출을 전송하지 못했습니다. 테이블 상태를 확인해 주세요.",
    public readonly code: "UNAVAILABLE" | "COOLDOWN" | "RATE_LIMIT" | "NOT_CANCELLABLE" = "UNAVAILABLE",
  ) {
    super(message);
    this.name = "StaffCallSubmissionError";
  }
}

function mapRpcError(error: { message?: string } | null): never {
  const message = error?.message ?? "";
  if (message.includes("CALL_COOLDOWN")) {
    throw new StaffCallSubmissionError("호출 완료 또는 취소 후 2분 뒤 다시 요청할 수 있습니다.", "COOLDOWN");
  }
  if (message.includes("CALL_RATE_LIMIT")) {
    throw new StaffCallSubmissionError("호출 횟수가 많습니다. 잠시 후 직원에게 직접 말씀해 주세요.", "RATE_LIMIT");
  }
  if (message.includes("CALL_NOT_CANCELLABLE")) {
    throw new StaffCallSubmissionError("이미 확인된 호출은 손님이 취소할 수 없습니다.", "NOT_CANCELLABLE");
  }
  throw new StaffCallSubmissionError();
}

function assertRuntimeAndSession(menuSiteId: string, tableSession: ResolvedTableVisitSession) {
  if (menuSiteId !== tableSession.menuSiteId || !isCallRuntimeEnabledForSite(menuSiteId)) {
    throw new StaffCallSubmissionError();
  }
}

async function assertPublicBusinessAccess(menuSiteId: string) {
  const accessState = await getMenuSiteAccessStateForMenuSite({ menuSiteId });
  if (!accessState?.canViewPublic || accessState.planType !== "business_basic") {
    throw new StaffCallSubmissionError();
  }
}

export async function submitStaffCall({
  menuSiteId,
  tableSession,
}: {
  menuSiteId: string;
  tableSession: ResolvedTableVisitSession;
}): Promise<SubmittedStaffCall> {
  assertRuntimeAndSession(menuSiteId, tableSession);
  await assertPublicBusinessAccess(menuSiteId);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("submit_staff_call" as never, {
    p_menu_site_id: menuSiteId,
    p_table_visit_session_id: tableSession.id,
  } as never);
  if (error) mapRpcError(error);

  const row = (Array.isArray(data) ? data[0] : null) as Partial<SubmitRpcRow> | null;
  if (
    !row
    || typeof row.call_id !== "string"
    || typeof row.call_number !== "number"
    || (row.call_status !== "pending" && row.call_status !== "acknowledged")
    || typeof row.is_duplicate !== "boolean"
  ) {
    throw new StaffCallSubmissionError();
  }

  return {
    callId: row.call_id,
    callNumber: row.call_number,
    status: row.call_status,
    duplicate: row.is_duplicate,
  };
}

export async function cancelPendingStaffCall({
  menuSiteId,
  callId: callIdValue,
  tableSession,
}: {
  menuSiteId: string;
  callId: unknown;
  tableSession: ResolvedTableVisitSession;
}) {
  assertRuntimeAndSession(menuSiteId, tableSession);
  await assertPublicBusinessAccess(menuSiteId);
  const callId = normalizeCallId(callIdValue);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("cancel_pending_staff_call" as never, {
    p_menu_site_id: menuSiteId,
    p_table_visit_session_id: tableSession.id,
    p_call_id: callId,
  } as never);
  if (error) mapRpcError(error);

  const row = (Array.isArray(data) ? data[0] : null) as Partial<CancelRpcRow> | null;
  if (!row || row.call_id !== callId || row.call_status !== "cancelled") {
    throw new StaffCallSubmissionError();
  }
  return { callId: row.call_id, status: row.call_status };
}
