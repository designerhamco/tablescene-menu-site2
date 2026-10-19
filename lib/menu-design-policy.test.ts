import assert from "node:assert/strict";
import test from "node:test";
import { canUseMenuDesign, DEFAULT_DESIGN_REVIEWS, getDefaultDesignReview, MENU_LAYOUTS, type MenuDesign, type MenuLayoutId } from "./menu-design-policy";
import { getMenuPlanMonthlyPrice } from "./menu-plan-pricing";
import { buildTemplatePreviewUrl } from "./menu-preview-devices";

test("design access spans layouts inside one service but never crosses services", () => {
  for (const [id, layout] of Object.entries(MENU_LAYOUTS)) {
    const standard: MenuDesign = { id, label: id, layout: id as MenuLayoutId, kind: "standard" };
    const designer = { ...standard, kind: "designer" as const };
    assert.equal(canUseMenuDesign(layout.service, "standard", standard), true);
    assert.equal(canUseMenuDesign(layout.service, "standard", designer), false);
    assert.equal(canUseMenuDesign(layout.service, "all", designer), true);
    assert.equal(canUseMenuDesign(layout.service === "basic" ? "dining" : "basic", "all", standard), false);
  }
});

test("price amounts can change independently of design access", () => {
  assert.deepEqual(["regular", "earlyBird"].flatMap(offer => ["basic", "dining"].flatMap(service => ["standard", "all"].map(access => getMenuPlanMonthlyPrice(service as "basic" | "dining", access as "standard" | "all", offer as "regular" | "earlyBird")))), [5900, 7800, 8900, 10800, 4900, 6800, 6900, 8800]);
  const changed = { basic: { regular: 7000, earlyBird: 5000 }, dining: { regular: 10000, earlyBird: 8000 }, designMonthly: 2000 };
  assert.equal(getMenuPlanMonthlyPrice("basic", "all", "earlyBird", changed), 7000);
  assert.equal(canUseMenuDesign("basic", "all", DEFAULT_DESIGN_REVIEWS[0]), true);
});

test("review choice survives device, feature and new-window URLs and rejects mismatched engines", () => {
  for (const design of DEFAULT_DESIGN_REVIEWS) {
    const url = buildTemplatePreviewUrl(design.renderer, { design: design.id }, { device: "mobile", actual: true, orderPreview: true });
    assert.ok(url.includes(`design=${design.id}`));
    assert.equal(getDefaultDesignReview(design.id, design.renderer), design);
    assert.equal(getDefaultDesignReview(design.id, "display_menu_a"), undefined);
  }
  assert.equal(getDefaultDesignReview("unknown", "cafe_design_a"), undefined);
});
