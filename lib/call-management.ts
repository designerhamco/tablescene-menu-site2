const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StaffCallStatus = "pending" | "acknowledged" | "completed" | "cancelled";
export type StaffCallStaffStatus = "acknowledged" | "completed";

const STAFF_TRANSITIONS: Readonly<Record<StaffCallStatus, StaffCallStaffStatus | null>> = {
  pending: "acknowledged",
  acknowledged: "completed",
  completed: null,
  cancelled: null,
};

export class CallManagementInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CallManagementInputError";
  }
}

export function normalizeCallId(value: unknown) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new CallManagementInputError("올바른 호출 식별자가 필요합니다.");
  }
  return value;
}

export function getNextStaffCallStatus(status: unknown): StaffCallStaffStatus | null {
  if (typeof status !== "string" || !(status in STAFF_TRANSITIONS)) return null;
  return STAFF_TRANSITIONS[status as StaffCallStatus];
}

export function assertStaffCallTransition(
  currentStatus: unknown,
  nextStatus: unknown,
): StaffCallStaffStatus {
  const expected = getNextStaffCallStatus(currentStatus);
  if (nextStatus !== expected || (nextStatus !== "acknowledged" && nextStatus !== "completed")) {
    throw new CallManagementInputError("호출 상태는 접수 확인 후 완료 순서로만 변경할 수 있습니다.");
  }
  return nextStatus;
}
