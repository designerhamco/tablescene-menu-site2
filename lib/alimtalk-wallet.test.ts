import assert from "node:assert/strict";
import test from "node:test";
import { isAlimtalkPaymentId, isAlimtalkTopupAmount } from "./alimtalk-wallet";
import { verifyAlimtalkPayment, type AlimtalkPayment } from "./server/alimtalk-payment-verification";

const intent = { payment_id: "alimtalk_11111111-1111-4111-8111-111111111111", owner_id: "owner", menu_site_id: "menu", amount: 10000, store_id: "store", channel_key: "channel" };
const paid = (): AlimtalkPayment => ({ id: intent.payment_id, storeId: "store", currency: "KRW", status: "PAID", channel: { id: "provider-channel-id", key: "channel",type:"LIVE" },
  amount: { total: 10000, paid: 10000, cancelled: 0 }, customData: { purpose: "alimtalk_topup", owner_id: "owner", menu_site_id: "menu" } });
test("only approved denominations and server payment ID format", () => {
  for (const amount of [10000,30000,50000]) assert(isAlimtalkTopupAmount(amount));
  for (const value of [0, -10000, 10001, "10000", NaN, Infinity]) assert(!isAlimtalkTopupAmount(value));
  assert(isAlimtalkPaymentId(intent.payment_id)); assert(!isAlimtalkPaymentId("ai-credit-id")); assert(!isAlimtalkPaymentId(`../${intent.payment_id}`));
});
test("verified paid payment and string customData can settle", () => {
  assert.equal(verifyAlimtalkPayment(paid(), intent), "paid");
  assert.equal(verifyAlimtalkPayment({ ...paid(), customData: JSON.stringify(paid().customData) }, intent), "paid");
});
for (const [label, mutate] of [
  ["payment replay", { id: "another-payment" }], ["other store", { storeId: "other-store" }],
  ["other PG channel", { channel: { id: "channel", key: "another-channel",type:"LIVE" } }], ["other currency", { currency: "USD" }],
  ["TEST channel funding production wallet",{channel:{id:"provider-channel-id",key:"channel",type:"TEST"}}],
  ["unknown channel environment",{channel:{id:"provider-channel-id",key:"channel"}}],
  ["underpayment", { amount: { total: 10000, paid: 9999, cancelled: 0 } }],
  ["price tampering", { amount: { total: 50000, paid: 50000, cancelled: 0 } }],
  ["unknown cancellation", { amount: { total: 10000, paid: 10000 } }],
  ["AI credit payment reuse", { customData: { purpose: "ai_credit_purchase", owner_id: "owner", menu_site_id: "menu" } }],
  ["other merchant", { customData: { purpose: "alimtalk_topup", owner_id: "another-owner", menu_site_id: "menu" } }],
  ["other menu", { customData: { purpose: "alimtalk_topup", owner_id: "owner", menu_site_id: "another-menu" } }],
  ["missing purpose", { customData: undefined }],
] as const) test(`reject ${label}`, () => assert.throws(() => verifyAlimtalkPayment({ ...paid(), ...mutate }, intent)));
test("unpaid is pending; partial or full refunds require review, never another credit", () => {
  assert.equal(verifyAlimtalkPayment({ ...paid(), status: "READY" }, intent), "pending");
  assert.equal(verifyAlimtalkPayment({ ...paid(), amount: { total: 10000, paid: 10000, cancelled: 12 } }, intent), "review");
  assert.equal(verifyAlimtalkPayment({ ...paid(), status: "CANCELLED",amount:{total:10000,paid:10000,cancelled:10000} }, intent), "review");
  assert.throws(()=>verifyAlimtalkPayment({...paid(),status:"CANCELLED"},intent));
  assert.throws(()=>verifyAlimtalkPayment({...paid(),amount:{total:10000,paid:10000,cancelled:10001}},intent));
});
