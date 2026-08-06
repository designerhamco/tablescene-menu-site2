const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export const POSTPAY_ORDER_MAX_LINES = 20;
export const POSTPAY_ORDER_MAX_TOTAL_UNITS = 50;
export const POSTPAY_ORDER_MAX_LINE_UNITS = 20;
export const POSTPAY_ORDER_MAX_REQUEST_LENGTH = 300;
export const POSTPAY_ORDER_MAX_OPTIONS_PER_LINE = 20;

export type PostpayOrderLineInput = {
  menuItemId: string;
  quantity: number;
  optionValueIds: string[];
};

export type PostpayOrderInput = {
  menuSiteId: string;
  clientRequestId: string;
  requestText: string | null;
  lines: PostpayOrderLineInput[];
};

export class InvalidPostpayOrderPayloadError extends Error {
  constructor(message = "주문 정보를 다시 확인해 주세요.") {
    super(message);
    this.name = "InvalidPostpayOrderPayloadError";
  }
}

function parsePositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function parsePostpayOrderPayload(value: unknown): PostpayOrderInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidPostpayOrderPayloadError();
  }

  const body = value as Record<string, unknown>;
  if (!isUuid(body.menuSiteId) || !isUuid(body.clientRequestId) || !Array.isArray(body.lines)) {
    throw new InvalidPostpayOrderPayloadError();
  }
  if (body.lines.length < 1 || body.lines.length > POSTPAY_ORDER_MAX_LINES) {
    throw new InvalidPostpayOrderPayloadError("장바구니에는 1개 이상 20개 이하의 항목만 담을 수 있습니다.");
  }

  const requestText = typeof body.requestText === "string" ? body.requestText.trim() : null;
  if (requestText && requestText.length > POSTPAY_ORDER_MAX_REQUEST_LENGTH) {
    throw new InvalidPostpayOrderPayloadError("요청사항은 300자 이하로 입력해 주세요.");
  }

  let totalUnits = 0;
  const lines = body.lines.map((lineValue) => {
    if (!lineValue || typeof lineValue !== "object" || Array.isArray(lineValue)) {
      throw new InvalidPostpayOrderPayloadError();
    }
    const line = lineValue as Record<string, unknown>;
    const quantity = parsePositiveInteger(line.quantity);
    const optionValueIds = line.optionValueIds ?? [];
    if (
      !isUuid(line.menuItemId)
      || quantity === null
      || quantity < 1
      || quantity > POSTPAY_ORDER_MAX_LINE_UNITS
      || !Array.isArray(optionValueIds)
      || optionValueIds.length > POSTPAY_ORDER_MAX_OPTIONS_PER_LINE
      || optionValueIds.some((optionId) => !isUuid(optionId))
      || new Set(optionValueIds).size !== optionValueIds.length
    ) {
      throw new InvalidPostpayOrderPayloadError();
    }
    totalUnits += quantity;
    return {
      menuItemId: line.menuItemId,
      quantity,
      optionValueIds: [...optionValueIds] as string[],
    };
  });

  if (totalUnits > POSTPAY_ORDER_MAX_TOTAL_UNITS) {
    throw new InvalidPostpayOrderPayloadError("한 번에 최대 50개까지 주문할 수 있습니다.");
  }

  return {
    menuSiteId: body.menuSiteId,
    clientRequestId: body.clientRequestId,
    requestText: requestText || null,
    lines,
  };
}
