import test from "node:test";
import assert from "node:assert/strict";
import {
  GUIDE_DEVICES,
  GUIDE_PLANS,
  getGuideDevice,
  getGuideBrowsers,
  getGuideBrowser,
  getGuideSections,
  normalizeGuidePlan,
} from "./usage-guides";

test("가이드의 모든 플랜·기기·브라우저 조합에 유효한 설명과 고유 목차가 있다", () => {
  for (const plan of GUIDE_PLANS)
    for (const device of GUIDE_DEVICES)
      for (const browser of device.browsers) {
        const actualDevice = getGuideDevice(plan.id, device.id);
        const actualBrowser = getGuideBrowser(actualDevice, browser);
        assert.ok(getGuideBrowsers(actualDevice).includes(actualBrowser));
        const sections = getGuideSections(plan.id, device.id, browser);
        assert.equal(
          new Set(sections.map((section) => section.id)).size,
          sections.length,
        );
        assert.ok(
          sections.every(
            (section) =>
              section.title && section.body && section.steps.length >= 3,
          ),
        );
        assert.ok(sections.some((section) => section.id === "fullscreen"));
        assert.ok(sections.some((section) => section.id === "zoom"));
        for (const section of sections)
          for (const source of section.sources ?? [])
            assert.equal(new URL(source.href).protocol, "https:");
      }
});
test("지원하지 않는 기기·브라우저 조합을 안내하지 않는다", () => {
  assert.equal(getGuideBrowser("windows", "safari"), "chrome");
  assert.equal(getGuideBrowser("ipad", "edge"), "safari");
  assert.equal(getGuideDevice("display", "android"), "windows");
  assert.equal(getGuideDevice("display", "ipad"), "windows");
  assert.equal(normalizeGuidePlan("unknown"), "basic");
  assert.equal(normalizeGuidePlan("dining"), "basic");
  assert.equal(normalizeGuidePlan("basic"), "basic");
  assert.equal(normalizeGuidePlan("display"), "display");
});
test("터치 기기에 PC F11이나 완전한 전체 화면을 약속하지 않는다", () => {
  for (const device of ["ipad", "android"] as const)
    for (const browser of getGuideBrowsers(device)) {
      const sections = getGuideSections("basic", device, browser);
      assert.ok(sections[0].note?.includes("QR"));
      assert.ok(
        !sections
          .flatMap((section) => section.steps)
          .some((step) => JSON.stringify(step).includes("F11")),
      );
    }
});
