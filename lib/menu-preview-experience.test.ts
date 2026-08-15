import assert from "node:assert/strict";
import test from "node:test";

import { buildMenuPreviewOrderCallConfig } from "./menu-preview-experience";

const menuSiteId = "11111111-1111-4111-8111-111111111111";

test("standard preview does not inject order or call UI", () => {
  assert.equal(buildMenuPreviewOrderCallConfig({ experience: "standard", menuSiteId, storeName: "AUBE" }), undefined);
});

test("call preview opens a write-free call dialog", () => {
  const config = buildMenuPreviewOrderCallConfig({ experience: "call", menuSiteId, storeName: "AUBE" });
  assert.equal(config?.callEnabled, true);
  assert.equal(config?.orderEnabled, false);
  assert.equal(config?.previewOnly, true);
  assert.equal(config?.previewInitialPanel, "call");
});

test("prepay preview opens the mobile checkout without enabling real payment", () => {
  const config = buildMenuPreviewOrderCallConfig({ experience: "prepay", menuSiteId, storeName: "AUBE" });
  assert.equal(config?.checkoutMode, "prepay");
  assert.equal(config?.previewOnly, true);
  assert.equal(config?.previewInitialPanel, "checkout");
  assert.equal(config?.orderCatalog?.length, 2);
});
