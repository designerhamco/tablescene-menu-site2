import assert from "node:assert/strict";
import test from "node:test";
import { getApplicableOrderCustomization, isOrderCustomizationValid, parseMenuOrderCustomization } from "./menu-order-customization";

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

test("line customization preserves a choice, a request, or both independently from paid options", () => {
  const line = validPayload().lines[0];
  const lines = [
    { ...line, productOption: " 덜 맵게 " },
    { ...line, lineRequest: " 파 제외 " },
    { ...line, productOption: "맵게", lineRequest: "양파 제외" },
  ];
  assert.deepEqual(parsePostpayOrderPayload({ ...validPayload(), lines }).lines, [
    { ...line, productOption: "덜 맵게" },
    { ...line, lineRequest: "파 제외" },
    lines[2],
  ]);
  assert.throws(() => parsePostpayOrderPayload({ ...validPayload(), lines: [{ ...line, lineRequest: "가".repeat(61) }] }));
  assert.throws(() => parsePostpayOrderPayload({ ...validPayload(), lines: [{ ...line, productOption: "가".repeat(21) }] }));
  assert.throws(() => parsePostpayOrderPayload({ ...validPayload(), lines: [{ ...line, lineRequest: "파\n제외" }] }));
});

test("editor product options default the title and enforce saved selection rules", () => {
  const choices = [" 덜 맵게 ", "보통", "맵게", "아주 맵게", "순하게"];
  const config = parseMenuOrderCustomization({ title: "", choices, allowRequest: false });
  assert.equal(config.title, "상품 옵션");
  assert.equal(config.choices[0], "덜 맵게");
  assert.equal(isOrderCustomizationValid(config, "덜 맵게", null), true);
  assert.equal(isOrderCustomizationValid(config, null, "파 제외"), false);
  assert.equal(isOrderCustomizationValid({ ...config, allowRequest: true }, null, "파 제외"), true);
  assert.equal(isOrderCustomizationValid(config, "삭제된 선택지", null), false);
  assert.throws(() => parseMenuOrderCustomization({ ...config, choices: [...choices, "여섯 번째"] }));
  assert.throws(() => parseMenuOrderCustomization({ ...config, choices: ["가".repeat(21)] }));
  assert.throws(() => parseMenuOrderCustomization({ ...config, choices: ["HOT", "hot"] }));
});

test("set-only product choices depend on the selected price column and remain required", () => {
  const config = { title: "음료", choices: ["레몬 에이드"], allowRequest: true, priceColumnIds: ["set"] };
  const parsed = parseMenuOrderCustomization(config);
  assert.deepEqual(parsed, config);
  assert.throws(() => parseMenuOrderCustomization({ ...config, priceColumnIds: [] }));
  for (const column of ["single", undefined]) {
    const inactive = getApplicableOrderCustomization(config, column);
    assert.equal(isOrderCustomizationValid(inactive, null, null), true);
    assert.equal(isOrderCustomizationValid(inactive, "레몬 에이드", null), false);
    assert.equal(isOrderCustomizationValid(inactive, null, "얼음 제외"), false);
  }
  const active = getApplicableOrderCustomization(config, "set");
  assert.equal(isOrderCustomizationValid(active, null, "얼음 제외"), false);
  assert.equal(isOrderCustomizationValid(active, "레몬 에이드", "얼음 제외"), true);
});


test("course orders use one category identity and reject mixed identities or item options", () => {
  const menuSiteId="11111111-1111-4111-8111-111111111111",clientRequestId="22222222-2222-4222-8222-222222222222",category="33333333-3333-4333-8333-333333333333";
  const line={menuCategoryId:category,quantity:2,optionValueIds:[]};
  const parsed=parsePostpayOrderPayload({menuSiteId,clientRequestId,lines:[line]});assert.equal(parsed.lines[0].menuCategoryId,category);assert.equal(parsed.lines[0].menuItemId,undefined);
  assert.throws(()=>parsePostpayOrderPayload({menuSiteId,clientRequestId,lines:[{...line,menuItemId:category}]}));
  assert.throws(()=>parsePostpayOrderPayload({menuSiteId,clientRequestId,lines:[{...line,optionValueIds:[category]}]}));
});
