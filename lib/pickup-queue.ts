export const PICKUP_QUEUE_STATUSES = ["waiting", "ready", "completed", "cancelled"] as const;

export type PickupQueueStatus = (typeof PICKUP_QUEUE_STATUSES)[number];
export type PickupQueueNextStatus = Exclude<PickupQueueStatus, "waiting">;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PICKUP_QUEUE_TRANSITIONS: Readonly<Record<PickupQueueStatus, readonly PickupQueueNextStatus[]>> = {
  waiting: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export class PickupQueueInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PickupQueueInputError";
  }
}

export function normalizePickupQueueId(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!UUID_PATTERN.test(normalized)) {
    throw new PickupQueueInputError("올바른 대기번호 정보가 필요합니다.");
  }
  return normalized;
}

export function normalizePickupQueueNumber(value: unknown) {
  const normalized = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 9999) {
    throw new PickupQueueInputError("대기번호는 1부터 9999 사이의 숫자로 입력해 주세요.");
  }
  return normalized;
}

export function isPickupQueueStatus(value: unknown): value is PickupQueueStatus {
  return typeof value === "string" && (PICKUP_QUEUE_STATUSES as readonly string[]).includes(value);
}

export function assertPickupQueueTransition(current: unknown, next: unknown): PickupQueueNextStatus {
  if (
    !isPickupQueueStatus(current)
    || !isPickupQueueStatus(next)
    || next === "waiting"
    || !PICKUP_QUEUE_TRANSITIONS[current].includes(next)
  ) {
    throw new PickupQueueInputError("현재 단계에서는 요청한 대기번호 상태로 변경할 수 없습니다.");
  }
  return next;
}

export function getPickupQueueNextStatus(status: unknown): Exclude<PickupQueueNextStatus, "cancelled"> | null {
  if (!isPickupQueueStatus(status)) return null;
  return PICKUP_QUEUE_TRANSITIONS[status].find((candidate) => candidate !== "cancelled") ?? null;
}

export function isPickupQueueVisibleStatus(status: unknown) {
  return status === "waiting" || status === "ready";
}
