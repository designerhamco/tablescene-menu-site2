import test from "node:test";
import assert from "node:assert/strict";
import { buildKscatCreditLabRequest, inspectKscatCreditLabReply, inspectKscatVersionReply, kscatLoopbackUrl, KSCAT_VERSION_REQUEST, parseKscatWebReply } from "./kscat-protocol";

const callback = "artimenu_11111111111141118111111111111111";
const base = { terminalId: "DPT0TEST03", telegramNumber: "000000000001", amount: 11000, vat: 1000, service: 0, taxFree: 0 };
const wrap = (value: unknown) => `${callback}(${JSON.stringify(value)});`;
const version = { REQ: "AP", TRADEFLAG: "VR", RES: "0000", RESPCODE: "0000", VERSION: "20260914" };

test("KSCAT connection request is only a framed version query on loopback", () => {
  assert.equal(KSCAT_VERSION_REQUEST, "AP\x020004VR\x03\r");
  assert.equal(kscatLoopbackUrl("27098").href, "http://127.0.0.1:27098/");
  assert.equal(kscatLoopbackUrl("00001").href, "http://127.0.0.1:1/");
  for (const value of ["", "0", "65536", "027098", "27098/path", "27098@remote.test", "27098\n", "https://other.test", "1.2"])
    assert.throws(() => kscatLoopbackUrl(value));
});

test("legacy JSONP is data only and supports documented single-quote string maps", () => {
  assert.deepEqual({ ...parseKscatWebReply(wrap(version), callback) }, version);
  assert.deepEqual({ ...parseKscatWebReply(`${callback}({'REQ':'AP', TRADEFLAG:'VR', 'VERSION':'20260914'})`, callback) }, { REQ: "AP", TRADEFLAG: "VR", VERSION: "20260914" });
  assert.equal(parseKscatWebReply(`${callback}({MSG:'quote\\\' and \\uac00'})`, callback).MSG, "quote' and 가");
});

test("JSONP parser rejects executable expressions, duplicate keys and extra statements", () => {
  for (const raw of [wrap(version).replace(callback, "wrong"), `${callback}({RES:'0000',RES:'9999'})`, `${callback}({RES:window.value})`,
    `${callback}({RES:()=>1})`, `${callback}({RES:{nested:'value'}})`, `${callback}({RES:['value']})`, `${callback}({__proto__:'bad'})`,
    `${callback}({RES:'0000',})`, `${callback}({RES:'0000'});alert(1);`, `${callback}({RES:'0000\\n'})`, wrap(version) + "x",
    `${callback}({RES:'${"x".repeat(4097)}'})`, "x".repeat(32769)]) assert.throws(() => parseKscatWebReply(raw, callback));
});

test("version evidence must identify the requested command and a real calendar date", () => {
  assert.deepEqual(inspectKscatVersionReply(version), { resultCode: "0000", versionDate: "2026-09-14" });
  for (const patch of [{ TRADEFLAG: "IC" }, { REQ: "CC" }, { RES: "9999" }, { RESPCODE: "9999" }, { VERSION: "20260230" }, { VERSION: "20260914\n" }, { VERSION: "19990101" }])
    assert.throws(() => inspectKscatVersionReply({ ...version, ...patch }));
});

test("credit lab frames have independent byte offsets, correct tax fields and default signature policy", () => {
  const request = buildKscatCreditLabRequest(base);
  assert.equal(request.length, 458); assert.equal(request.slice(0, 7), "AP0452\x02");
  assert.equal(request.slice(7, 16), "IC010200N"); assert.equal(request.slice(16, 26), base.terminalId);
  assert.equal(request.slice(30, 42), base.telegramNumber); assert.equal(request.charCodeAt(193), 28);
  assert.equal(request.slice(196, 208), "000000011000"); assert.equal(request.slice(220, 232), "000000001000");
  assert.equal(request.slice(232, 244), "000000000000"); // Credit supply field is zero in normative workbook.
  assert.equal(request.at(-3), " "); assert.equal(request.slice(-2), "\x03\r");
});

test("credit lab input forbids unbound sequences, card injection and invalid monetary breakdowns", () => {
  for (const patch of [{ terminalId: "DPT0TEST03\n" }, { telegramNumber: "000000000000" }, { telegramNumber: "1" },
    { amount: 0 }, { amount: 100_000_000 }, { amount: 1.5 }, { vat: 12000 }, { service: -1 }, { taxFree: 11000 }])
    assert.throws(() => buildKscatCreditLabRequest({ ...base, ...patch }));
});

test("cancellation lab preserves original approval references and rejects invalid dates", () => {
  const request = buildKscatCreditLabRequest(base, { originalApprovalNumber: "TESTAPP1", originalApprovalDate: "261104" });
  assert.equal(request.slice(11, 15), "0420"); assert.equal(request.slice(274, 286), "TESTAPP1    "); assert.equal(request.slice(286, 292), "261104");
  for (const originalApprovalDate of ["260230", "261132", "261104\n"])
    assert.throws(() => buildKscatCreditLabRequest(base, { originalApprovalNumber: "TESTAPP1", originalApprovalDate }));
});

const approval = { REQ: "AP", TRADEFLAG: "IC", CLASSFLAG: "01", TERMID: base.terminalId, TELEGRAMNO: base.telegramNumber,
  TELEGRAMFLAG: "0210", RES: "0000", ERRCODE: "00", STATUS: "O", RESPCODE: "0000", CORPRESPCODE: "0000", APPROVALNO: "TESTAPP1    ",
  TRADEUNIQUENO: "123456789012        ", TRADETIME: "261104130000", WORKINGKEY: "must-not-leak", FILLER: "must-not-leak" };
test("a successful matching local approval still requires server verification and strips card/key fields", () => {
  assert.deepEqual(inspectKscatCreditLabReply(approval, base), { status: "verification_required", reportedOutcome: "approved", approvalNumber: "TESTAPP1", providerTransactionId: "123456789012" });
  assert.equal(inspectKscatCreditLabReply({ ...approval, TELEGRAMFLAG: "0430" }, base, true).reportedOutcome, "cancelled");
  for (const patch of [{ STATUS: "X" }, { RES: "9999" }, { ERRCODE: "90" }, { RESPCODE: "0800" }])
    assert.equal(inspectKscatCreditLabReply({ ...approval, ...patch }, base).reportedOutcome, "unknown");
});

test("mismatched or incomplete local approvals cannot be attached to a different order request", () => {
  for (const patch of [{ TERMID: "OTHER00001" }, { TELEGRAMNO: "000000000002" }, { TELEGRAMFLAG: "0430" }, { APPROVALNO: "" },
    { TRADEUNIQUENO: "" }, { TRADETIME: "261104250000" }, { TRADETIME: "260230120000" }, { CLASSFLAG: "25" }])
    assert.throws(() => inspectKscatCreditLabReply({ ...approval, ...patch }, base));
});
