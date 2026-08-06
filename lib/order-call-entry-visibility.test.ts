import assert from "node:assert/strict";
import test from "node:test";

import {
  getLockedOrderCallEntryConfig,
  getOrderCallEntryVisibility,
  type OrderCallEntryConfig,
} from "../components/public-menu/order-call/types";

function createConfig(overrides: Partial<OrderCallEntryConfig> = {}): OrderCallEntryConfig {
  return {
    mode: "preview",
    orderEnabled: true,
    callEnabled: true,
    hasValidTableSession: true,
    orderingOpen: true,
    languageSlotEnabled: true,
    storeName: "AUBE COFFEE",
    tableLabel: "TABLE 3",
    cartCount: 2,
    ...overrides,
  };
}

test("locked entry config keeps the common header and actions absent", () => {
  assert.deepEqual(getOrderCallEntryVisibility(getLockedOrderCallEntryConfig({ storeName: "AUBE COFFEE" })), {
    showHeader: false,
    showLanguage: false,
    showTableLabel: false,
    showCall: false,
    showCart: false,
  });
});

test("valid table sessions expose only independently enabled actions", () => {
  assert.deepEqual(getOrderCallEntryVisibility(createConfig({ orderEnabled: false })), {
    showHeader: true,
    showLanguage: true,
    showTableLabel: true,
    showCall: true,
    showCart: false,
  });
  assert.deepEqual(getOrderCallEntryVisibility(createConfig({ callEnabled: false })), {
    showHeader: true,
    showLanguage: true,
    showTableLabel: true,
    showCall: false,
    showCart: true,
  });
});

test("missing table sessions fail closed for table, Call, and cart", () => {
  assert.deepEqual(getOrderCallEntryVisibility(createConfig({ hasValidTableSession: false })), {
    showHeader: true,
    showLanguage: true,
    showTableLabel: false,
    showCall: false,
    showCart: false,
  });
});

test("closed ordering hides cart without affecting Call", () => {
  assert.deepEqual(getOrderCallEntryVisibility(createConfig({ orderingOpen: false })), {
    showHeader: true,
    showLanguage: true,
    showTableLabel: true,
    showCall: true,
    showCart: false,
  });
});
