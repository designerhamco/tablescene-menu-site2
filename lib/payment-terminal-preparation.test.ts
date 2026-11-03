import assert from "node:assert/strict";
import test from "node:test";
import { emptyPaymentTerminalDraft, parsePaymentTerminalDraft, paymentTerminalMissingFields, paymentTerminalSupportInfo, PAYMENT_TERMINAL_PROVIDER_INFO } from "./payment-terminal-preparation";
import { buildNiceAppPosLabRequest, inspectNiceAppPosLabCallback } from "./nice-apppos-lab";

test("incomplete preparation is allowed, but credentials, unknown transports and activation flags are rejected", () => {
  const blank = emptyPaymentTerminalDraft("nice_apppos_ios");
  assert.deepEqual(parsePaymentTerminalDraft(blank), blank);
  assert.equal(paymentTerminalMissingFields(blank).length, 3);
  for (const extra of [{ apiKey: "secret" }, { chargeEnabled: true }, { callbackUrl: "https://other.test" }, { provider: "unknown" }])
    assert.throws(() => parsePaymentTerminalDraft({ ...blank, ...extra }));
  for (const info of Object.values(PAYMENT_TERMINAL_PROVIDER_INFO)) assert.equal(info.chargeEnabled, false);
});

test("preparation normalizes only business formatting and validates each provider's fields", () => {
  const base = { ...emptyPaymentTerminalDraft("nice_apppos_ios"), businessNumber: "123-45-67890", terminalModel: " NM-400 " };
  assert.equal(parsePaymentTerminalDraft(base).businessNumber, "1234567890");
  assert.equal(parsePaymentTerminalDraft(base).terminalModel, "NM-400");
  for (const patch of [{ businessNumber: "123" }, { terminalId: "id&amount=1" }, { terminalModel: "model\nextra" }, { localPort: "1234" }])
    assert.throws(() => parsePaymentTerminalDraft({ ...base, ...patch }));
  for (const port of ["0", "65536", "1.5", "abc"]) assert.throws(() => parsePaymentTerminalDraft({ ...base, provider: "ksnet_kscat_windows", localPort: port }));
  assert.equal(parsePaymentTerminalDraft({ ...base, provider: "ksnet_kscat_windows", localPort: "27098" }).localPort, "27098");
});

test("support copy masks merchant identifiers and never claims a verified connection", () => {
  const info = paymentTerminalSupportInfo("site-id", { ...emptyPaymentTerminalDraft("nice_apppos_ios"), businessNumber: "1234567890", terminalId: "AB12345678" });
  assert.ok(!info.includes("1234567890")); assert.ok(!info.includes("AB12345678"));
  assert.ok(info.includes("******7890")); assert.ok(info.includes("검증 전"));
});

const request = { amount: 15000, catid: "TEST000001", businessNumber: "0000000000", oid: "TEST000001", state: "11111111-1111-4111-8111-111111111111" };
test("NICE lab request encodes the app callback and contains no browser-supplied callback override", () => {
  const url = new URL(buildNiceAppPosLabRequest(request));
  assert.equal(url.protocol, "apppos:"); assert.equal(url.hostname, "pay");
  assert.equal(url.searchParams.get("price"), "15000"); assert.equal(url.searchParams.get("gubun"), "0100");
  const callback = new URL(url.searchParams.get("returnURI")!);
  assert.equal(callback.hostname, "result"); assert.equal(callback.searchParams.get("state"), request.state);
  for (const patch of [{ amount: 0 }, { amount: 100_000_000 }, { amount: 1.5 }, { oid: "too-long-oid" }, { oid: request.oid + "\n" }, { state: "short" }, { businessNumber: "abc" }])
    assert.throws(() => buildNiceAppPosLabRequest({ ...request, ...patch }));
});

function callback(patch: Record<string, string> = {}) {
  const query = new URLSearchParams({ state: request.state, oid: request.oid, gubun: "0101", resultCode: "0000", appPrice: "15000", appNo: "TESTAPP1", appDt: "261103120000", ...patch });
  return `artimenu-terminal-lab://result?${query}`;
}
test("even a matching successful NICE callback requires provider verification", () => {
  assert.deepEqual(inspectNiceAppPosLabCallback(callback(), request), { status: "verification_required", resultCode: "0000" });
  assert.deepEqual(inspectNiceAppPosLabCallback(callback({ resultCode: "9999" }), request), { status: "verification_required", resultCode: "9999" });
  for (const raw of [callback({ appPrice: "1" }), callback({ oid: "OTHER00001" }), callback({ state: "wrong" }), callback({ gubun: "0401" }), callback({ resultCode: "0000\n" }), callback() + "&resultCode=0000", callback().replace("result?", "other?"), callback() + "#fragment"])
    assert.throws(() => inspectNiceAppPosLabCallback(raw, request));
});
