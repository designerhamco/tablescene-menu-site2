import "server-only";

import { portOneBillingChannelKey, portOneStoreId, requirePortOneApiSecret } from "@/lib/portone";

type PortOnePaymentResponse = {
  id?: string;
  paymentId?: string;
  status?: string;
  amount?: number | {
    total?: number;
    paid?: number;
  };
  paidAmount?: number;
};

export type PortOneBillingPaymentResult = {
  paymentId: string;
  status: string;
  amount: number;
  rawPayment: PortOnePaymentResponse;
};

type PortOneSafeDebug = {
  path?: string;
  paymentId?: string;
  portoneStatus?: number;
  portoneType?: string;
  portoneCode?: string;
  portoneMessage?: string;
  hasStoreId?: boolean;
  hasBillingKey?: boolean;
  hasChannelKey?: boolean;
  orderName?: string;
  amount?: number;
  currency?: string;
  customerFields?: {
    hasId: boolean;
    hasEmail: boolean;
    hasFullName: boolean;
    hasPhoneNumber: boolean;
  };
};

export class PortOneBillingError extends Error {
  constructor(
    message: string,
    public safeDebug: PortOneSafeDebug = {},
    public status = 502
  ) {
    super(message);
  }
}

function getPaymentAmount(payment: PortOnePaymentResponse) {
  if (typeof payment.amount === "number") return payment.amount;
  if (typeof payment.amount?.total === "number") return payment.amount.total;
  if (typeof payment.amount?.paid === "number") return payment.amount.paid;
  if (typeof payment.paidAmount === "number") return payment.paidAmount;
  return null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getFirstString(...values: unknown[]) {
  for (const value of values) {
    const valueString = getString(value);
    if (valueString) return valueString;
  }

  return undefined;
}

function normalizePhoneNumber(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits || undefined;
}

function sanitizePortOneMessage(value: string | undefined) {
  if (!value) return undefined;

  return value
    .replace(/billing-key-[A-Za-z0-9_-]+/g, "billing-key-***")
    .replace(/channel-key-[A-Za-z0-9_-]+/g, "channel-key-***")
    .replace(/store-[A-Za-z0-9_-]+/g, "store-***")
    .replace(/"billingKey"\s*:\s*"[^"]+"/g, '"billingKey":"***"')
    .replace(/"channelKey"\s*:\s*"[^"]+"/g, '"channelKey":"***"')
    .replace(/"storeId"\s*:\s*"[^"]+"/g, '"storeId":"***"')
    .replace(/\n\{[\s\S]*$/, "")
    .slice(0, 500);
}

function logPortOneBillingDebug(event: string, debug: PortOneSafeDebug) {
  if (process.env.NODE_ENV === "production") return;

  console.info(`[portone-billing] ${event}`, JSON.stringify(debug));
}

async function getSafePortOneErrorDebug(response: Response, requestSummary?: PortOneSafeDebug) {
  const text = await response.text();
  let parsed: unknown = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  const record = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  const error = getRecord(record.error);
  const failure = getRecord(record.failure);
  const responseBody = getRecord(record.response);
  const responseError = getRecord(responseBody.error);

  return {
    ...requestSummary,
    portoneStatus: response.status,
    portoneType: getFirstString(record.type, error.type, failure.type, responseError.type),
    portoneCode: getFirstString(record.code, error.code, failure.code, responseError.code),
    portoneMessage: sanitizePortOneMessage(getFirstString(record.message, error.message, failure.message, responseError.message) || (text && text.length < 300 ? text : undefined)),
  } satisfies PortOneSafeDebug;
}

async function requestPortOne(path: string, init: RequestInit, requestSummary?: PortOneSafeDebug) {
  const apiSecret = requirePortOneApiSecret();
  const safeRequestSummary = { ...requestSummary, path };
  logPortOneBillingDebug("request_start", safeRequestSummary);
  const response = await fetch(`https://api.portone.io${path}`, {
    ...init,
    headers: {
      Authorization: `PortOne ${apiSecret}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const safeDebug = await getSafePortOneErrorDebug(response, safeRequestSummary);
    logPortOneBillingDebug("request_failed", safeDebug);
    throw new PortOneBillingError("PortOne 빌링키 첫 결제 요청에 실패했습니다.", safeDebug, 502);
  }

  logPortOneBillingDebug("request_success", { ...safeRequestSummary, portoneStatus: response.status });
  return response;
}

export async function payWithBillingKey({
  paymentId,
  billingKey,
  orderName,
  amount,
  customer,
}: {
  paymentId: string;
  billingKey: string;
  orderName: string;
  amount: number;
  customer: {
    id: string;
    name?: string;
    email?: string | null;
    phoneNumber?: string | null;
  };
}) {
  const storeId = portOneStoreId;
  const channelKey = portOneBillingChannelKey;
  const normalizedPhoneNumber = normalizePhoneNumber(customer.phoneNumber);
  const customerInput = {
    id: customer.id,
    ...(customer.name ? { name: { full: customer.name } } : {}),
    ...(customer.email ? { email: customer.email } : {}),
    ...(normalizedPhoneNumber ? { phoneNumber: normalizedPhoneNumber } : {}),
  };
  const requestSummary = {
    paymentId,
    hasStoreId: Boolean(storeId),
    hasBillingKey: Boolean(billingKey),
    hasChannelKey: Boolean(channelKey),
    orderName,
    amount,
    currency: "KRW",
    customerFields: {
      hasId: Boolean(customerInput.id),
      hasEmail: Boolean(customer.email),
      hasFullName: Boolean(customer.name),
      hasPhoneNumber: Boolean(normalizedPhoneNumber),
    },
  } satisfies PortOneSafeDebug;

  if (!storeId) {
    throw new PortOneBillingError("PortOne Store ID 환경변수가 필요합니다.", requestSummary, 500);
  }

  if (!channelKey) {
    throw new PortOneBillingError("PortOne 정기결제 채널 환경변수가 필요합니다.", requestSummary, 500);
  }

  logPortOneBillingDebug("portone_first_payment_request_start", requestSummary);
  await requestPortOne(`/payments/${encodeURIComponent(paymentId)}/billing-key`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `"${paymentId}"`,
    },
    body: JSON.stringify({
      storeId,
      billingKey,
      channelKey,
      orderName,
      customer: customerInput,
      amount: {
        total: amount,
      },
      currency: "KRW",
      productCount: 1,
    }),
  }, requestSummary);
  logPortOneBillingDebug("portone_first_payment_response", { ...requestSummary, portoneStatus: 200 });

  const paymentResponse = await requestPortOne(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  }, requestSummary);
  const payment = (await paymentResponse.json()) as PortOnePaymentResponse;
  const verifiedPaymentId = payment.id ?? payment.paymentId ?? paymentId;
  const paidAmount = getPaymentAmount(payment);

  if (verifiedPaymentId !== paymentId) {
    logPortOneBillingDebug("portone_first_payment_failed", { ...requestSummary, portoneMessage: "payment id mismatch" });
    throw new Error("PortOne billing payment id mismatch.");
  }

  if (payment.status !== "PAID") {
    logPortOneBillingDebug("portone_first_payment_failed", { ...requestSummary, portoneMessage: `payment is not paid: ${payment.status ?? "unknown"}` });
    throw new Error(`PortOne billing payment is not paid: ${payment.status ?? "unknown"}`);
  }

  if (paidAmount !== amount) {
    logPortOneBillingDebug("portone_first_payment_failed", { ...requestSummary, portoneMessage: `amount mismatch: ${paidAmount ?? "unknown"}` });
    throw new Error(`PortOne billing amount mismatch: ${paidAmount ?? "unknown"}`);
  }

  logPortOneBillingDebug("portone_first_payment_done", { ...requestSummary, portoneStatus: 200 });
  return {
    paymentId,
    status: "PAID",
    amount,
    rawPayment: payment,
  } satisfies PortOneBillingPaymentResult;
}
