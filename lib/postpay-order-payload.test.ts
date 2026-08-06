import assert from "node:assert/strict";
import test from "node:test";

const payloadModule = await import(
  new URL("./postpay-order-payload.ts", import.meta.url).href
) as typeof import("./postpay-order-payload");

const {
  InvalidPostpayOrderPayloadError,
  parsePostpayOrderPayload,
} = payloadModule;

const SITE_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const ITEM_ID = "33333333-3333-4333-8333-333333333333";
const OPTION_ID = "44444444-4444-4444-8444-444444444444";

function validPayload() {
  return {
    menuSiteId: SITE_ID,
    clientRequestId: REQUEST_ID,
    requestText: "  덜 맵게 부탁드려요.  ",
    lines: [{ menuItemId: ITEM_ID, quantity: 2, optionValueIds: [OPTION_ID] }],
  };
}

test("postpay payload trims requests and preserves validated lines", () => {
  assert.deepEqual(parsePostpayOrderPayload(validPayload()), {
    menuSiteId: SITE_ID,
    clientRequestId: REQUEST_ID,
    requestText: "덜 맵게 부탁드려요.",
    lines: [{ menuItemId: ITEM_ID, quantity: 2, optionValueIds: [OPTION_ID] }],
  });
});

test("postpay payload enforces line and total quantity limits", () => {
  assert.throws(
    () => parsePostpayOrderPayload({ ...validPayload(), lines: [] }),
    InvalidPostpayOrderPayloadError,
  );
  assert.throws(
    () => parsePostpayOrderPayload({
      ...validPayload(),
      lines: [
        { menuItemId: ITEM_ID, quantity: 20, optionValueIds: [] },
        { menuItemId: ITEM_ID, quantity: 20, optionValueIds: [] },
        { menuItemId: ITEM_ID, quantity: 11, optionValueIds: [] },
      ],
    }),
    /최대 50개/,
  );
});

test("postpay payload rejects duplicate options and malformed identifiers", () => {
  assert.throws(
    () => parsePostpayOrderPayload({
      ...validPayload(),
      lines: [{ menuItemId: ITEM_ID, quantity: 1, optionValueIds: [OPTION_ID, OPTION_ID] }],
    }),
    InvalidPostpayOrderPayloadError,
  );
  assert.throws(
    () => parsePostpayOrderPayload({ ...validPayload(), menuSiteId: "bad" }),
    InvalidPostpayOrderPayloadError,
  );
});

test("postpay payload caps customer request length", () => {
  assert.throws(
    () => parsePostpayOrderPayload({ ...validPayload(), requestText: "가".repeat(301) }),
    /300자/,
  );
});
