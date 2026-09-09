import assert from "node:assert/strict";
import test from "node:test";

import {
  getMenuEditorCapabilitiesForMenuSite,
  getMenuEditorServiceTypeForMenuSite,
} from "./menu-editor-capabilities";

test("Dining multi-page templates can manage pages without enabling display-only page controls", () => {
  const capabilities = getMenuEditorCapabilitiesForMenuSite(
    "business_basic_multi_monthly",
    "menu",
    { supportsMultiPage: true },
  );

  assert.equal(getMenuEditorServiceTypeForMenuSite("business_basic_multi_monthly", "menu"), "menu");
  assert.equal(capabilities.canManageMenuPages, true);
  assert.equal(capabilities.supportsDisplayPageTypes, false);
  assert.equal(capabilities.supportsDisplayPromotionPages, false);
  assert.equal(capabilities.supportsDisplayMenuLayoutTypes, false);
});

test("Dining single-page templates keep page management disabled", () => {
  const capabilities = getMenuEditorCapabilitiesForMenuSite(
    "business_basic_single_monthly",
    "menu",
    { supportsMultiPage: false },
  );

  assert.equal(capabilities.canManageMenuPages, false);
});
