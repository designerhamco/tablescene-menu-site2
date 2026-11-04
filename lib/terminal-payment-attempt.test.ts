import assert from "node:assert/strict";
import test from "node:test";
import { prepareTerminalPayment, terminalPaymentDispatched, terminalPaymentNeedsVerification, applyVerifiedTerminalPaymentResult, sameTerminalPaymentRequest, type VerifiedTerminalPaymentResult } from "./terminal-payment-attempt";

const input = { requestId: "11111111-1111-4111-8111-111111111111", menuSiteId: "22222222-2222-4222-8222-222222222222", orderId: "33333333-3333-4333-8333-333333333333", terminalId: "TEST000001", provider: "nice_apppos_ios" as const, amount: 15000 };
const result: VerifiedTerminalPaymentResult = { ...input, currency: "KRW", source: "provider_query", outcome: "approved", approvalNumber: "TESTAPP1", providerTransactionId: "TEST-TXN-1" };
test("payment request identity includes the order, merchant, terminal and exact server amount", () => {
  const a = prepareTerminalPayment(input);
  assert.equal(a.status, "prepared"); assert.equal(a.currency, "KRW");
  assert.equal(sameTerminalPaymentRequest(a, prepareTerminalPayment(input)), true);
  for (const patch of [{ amount: 15001 }, { terminalId: "OTHER" }, { menuSiteId: "44444444-4444-4444-8444-444444444444" }])
    assert.equal(sameTerminalPaymentRequest(a, prepareTerminalPayment({ ...input, ...patch })), false);
  for (const patch of [{ amount: 0 }, { amount: Number.NaN }, { amount: 1.2 }, { orderId: "invalid" }]) assert.throws(() => prepareTerminalPayment({ ...input, ...patch }));
});
test("callback and timeout never mark a payment paid or permit blind resubmission", () => {
  const sent = terminalPaymentDispatched(prepareTerminalPayment(input));
  assert.equal(terminalPaymentNeedsVerification(sent).status, "verification_required");
  const unknown = terminalPaymentNeedsVerification(sent, true);
  assert.equal(unknown.status, "unknown"); assert.equal(terminalPaymentNeedsVerification(unknown).status, "unknown");
  assert.throws(() => terminalPaymentDispatched(unknown)); assert.throws(() => terminalPaymentDispatched(sent));
});
test("trusted approval must match all request context and retain provider transaction identity", () => {
  const sent = terminalPaymentDispatched(prepareTerminalPayment(input));
  for (const patch of [{ amount: 1 }, { orderId: "other" }, { terminalId: "other" }, { requestId: "other" }, { source: "app_callback" }, { approvalNumber: null }])
    assert.throws(() => applyVerifiedTerminalPaymentResult(sent, { ...result, ...patch } as VerifiedTerminalPaymentResult));
  assert.throws(() => applyVerifiedTerminalPaymentResult(prepareTerminalPayment(input), result));
  const approved = applyVerifiedTerminalPaymentResult(terminalPaymentNeedsVerification(sent, true), result);
  assert.equal(approved.status, "approved");
  assert.deepEqual(applyVerifiedTerminalPaymentResult(approved, result), approved);
  assert.equal(terminalPaymentNeedsVerification(approved, true), approved);
  assert.throws(() => applyVerifiedTerminalPaymentResult(approved, { ...result, providerTransactionId: "another" }));
  const cancelled = applyVerifiedTerminalPaymentResult(approved, { ...result, outcome: "cancelled" });
  assert.equal(cancelled.status, "cancelled");
  assert.throws(() => applyVerifiedTerminalPaymentResult(cancelled, result));
  assert.throws(() => applyVerifiedTerminalPaymentResult(sent, { ...result, outcome: "cancelled" }));
});
