import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCustomerMenuPath,
  usesCustomerMenuPresentation,
} from "./menu-customer-presentation";
test("new representative QR URLs retain language and explicitly request customer presentation", () => {
  assert.equal(
    buildCustomerMenuPath("/menu/shop?lang=en"),
    "/menu/shop?lang=en&mode=customer",
  );
  assert.equal(buildCustomerMenuPath("/table/signed-id"), "/table/signed-id");
});
test("customer mode is independent of physical viewport and never changes Display", () => {
  assert.equal(usesCustomerMenuPresentation("customer", "cafe_design_a"), true);
  assert.equal(
    usesCustomerMenuPresentation("customer", "dining_aube_table_b"),
    true,
  );
  assert.equal(
    usesCustomerMenuPresentation("terminal", "cafe_design_a"),
    false,
  );
  assert.equal(
    usesCustomerMenuPresentation("customer", "display_menu_a"),
    false,
  );
});
