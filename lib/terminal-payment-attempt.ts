import { isPaymentTerminalProvider, type PaymentTerminalProvider } from "./payment-terminal-preparation";

export type TerminalPaymentStatus = "prepared" | "dispatched" | "verification_required" | "unknown" | "approved" | "declined" | "cancelled";
export type TerminalPaymentAttempt = Readonly<{
  requestId: string; menuSiteId: string; orderId: string; terminalId: string;
  provider: PaymentTerminalProvider; amount: number; currency: "KRW";
  status: TerminalPaymentStatus; approvalNumber: string | null; providerTransactionId: string | null;
}>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The caller must obtain the amount from the current server-side order, never the browser. */
export function prepareTerminalPayment(input: Omit<TerminalPaymentAttempt, "status" | "approvalNumber" | "providerTransactionId" | "currency">): TerminalPaymentAttempt {
  if (![input.requestId, input.menuSiteId, input.orderId].every(value => typeof value === "string" && value.length === 36 && uuid.test(value))
    || !isPaymentTerminalProvider(input.provider) || typeof input.terminalId !== "string" || /\s/.test(input.terminalId) || !/^[A-Za-z0-9-]{1,32}$/.test(input.terminalId)
    || !Number.isSafeInteger(input.amount) || input.amount < 1 || input.amount >= 100_000_000)
    throw new Error("결제 요청과 주문 금액을 확인해 주세요.");
  return { ...input, currency: "KRW", status: "prepared", approvalNumber: null, providerTransactionId: null };
}

export function sameTerminalPaymentRequest(a: TerminalPaymentAttempt, b: TerminalPaymentAttempt): boolean {
  return ["requestId", "menuSiteId", "orderId", "terminalId", "provider", "amount", "currency"].every(key => a[key as keyof typeof a] === b[key as keyof typeof b]);
}

export function terminalPaymentDispatched(attempt: TerminalPaymentAttempt): TerminalPaymentAttempt {
  if (attempt.status !== "prepared") throw new Error("이미 전달했거나 확인이 필요한 결제 요청입니다.");
  return { ...attempt, status: "dispatched" };
}

/** Neither an app callback nor a timeout proves approval or failure. */
export function terminalPaymentNeedsVerification(attempt: TerminalPaymentAttempt, timedOut = false): TerminalPaymentAttempt {
  if (["approved", "declined", "cancelled"].includes(attempt.status)) return attempt;
  if (attempt.status === "prepared") throw new Error("전달하지 않은 결제 요청입니다.");
  return { ...attempt, status: timedOut || attempt.status === "unknown" ? "unknown" : "verification_required" };
}

export type VerifiedTerminalPaymentResult = {
  source: "provider_query" | "provider_server";
  requestId: string; menuSiteId: string; orderId: string; terminalId: string;
  provider: PaymentTerminalProvider; amount: number; currency: "KRW";
  outcome: "approved" | "declined" | "cancelled";
  approvalNumber: string | null; providerTransactionId: string | null;
};

/** Only a server adapter that authenticated the provider's query/feed may call this.
 * This pure reducer is not an authentication mechanism or a public callback endpoint.
 */
export function applyVerifiedTerminalPaymentResult(attempt: TerminalPaymentAttempt, result: VerifiedTerminalPaymentResult): TerminalPaymentAttempt {
  if (!["provider_query", "provider_server"].includes(result.source)
    || !["approved", "declined", "cancelled"].includes(result.outcome)
    || !sameTerminalPaymentRequest(attempt, { ...attempt, ...result }))
    throw new Error("결제 요청과 확인 결과가 일치하지 않습니다.");
  if (attempt.status === "prepared") throw new Error("전달하지 않은 결제 요청입니다.");
  if (result.outcome === "approved" && (!result.approvalNumber || !result.providerTransactionId)) throw new Error("승인 정보가 부족합니다.");
  if (attempt.status === "cancelled") {
    if (result.outcome === "cancelled" && result.approvalNumber === attempt.approvalNumber && result.providerTransactionId === attempt.providerTransactionId) return attempt;
    throw new Error("취소된 결제 결과를 변경할 수 없습니다.");
  }
  if (attempt.status === "approved") {
    if (result.approvalNumber !== attempt.approvalNumber || result.providerTransactionId !== attempt.providerTransactionId || result.outcome === "declined")
      throw new Error("이미 기록한 승인과 결과가 일치하지 않습니다.");
  } else if (result.outcome === "cancelled") throw new Error("먼저 원래 승인 결과를 확인해 주세요.");
  if (attempt.status === "declined" && result.outcome !== "declined") throw new Error("확정된 결제 결과를 다시 확인해 주세요.");
  return { ...attempt, status: result.outcome, approvalNumber: result.approvalNumber, providerTransactionId: result.providerTransactionId };
}
