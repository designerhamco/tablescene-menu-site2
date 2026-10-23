import test from "node:test";
import assert from "node:assert/strict";
import { resolveMenuInteractionTheme, menuColorContrast } from "./menu-interaction-theme";

test("Order and Dining circle use category fill while rectangular Call keeps the bright menu surface", () => {
  const t = resolveMenuInteractionTheme({ category: "rgb(22, 95, 60)", surfaces: ["#fff", "#f6f3ed"], inks: ["#191c1b"] });
  assert.equal(t["--menu-order-bg"], "#165f3c");
  assert.equal(t["--menu-order-ink"], "#ffffff");
  assert.equal(t["--menu-call-bg"], "#ffffff");
  assert.equal(t["--menu-call-ink"], "#165f3c");
  assert.equal(t["--menu-call-border"], "#165f3c");
  assert.equal(t["--menu-call-circle-bg"], "#165f3c");
  assert.equal(t["--menu-call-circle-ink"], "#ffffff");
  assert.equal(t["--menu-call-circle-border"], "#165f3c");
});
test("a bright category keeps its fill and the brightest distinct menu ink", () => {
  const t = resolveMenuInteractionTheme({ category: "#fff9ee", surfaces: ["#252525", "#fff"], inks: ["#713f36", "#33221e"] });
  assert.equal(t["--menu-order-bg"], "#fff9ee");
  assert.equal(t["--menu-order-ink"], "#ffffff");
  assert.equal(t["--menu-call-circle-ink"], "#191c1b");
  assert.equal(t["--menu-call-bg"], "#ffffff");
  assert.equal(t["--menu-call-border"], "#fff9ee");
});
test("a light category on dark paper retains its category fill", () => {
  const t = resolveMenuInteractionTheme({ category: "#f7eedc", surfaces: ["#15181b"], inks: ["#f7eedc"] });
  assert.equal(t["--menu-order-bg"], "#f7eedc");
  assert.equal(t["--menu-order-ink"], "#191c1b");
  assert.equal(t["--menu-call-bg"], "#f7eedc");
  assert.equal(t["--menu-call-circle-bg"], "#f7eedc");
});
test("Call preserves its readable circle and the requested category ink", () => {
  for (const category of ["#fff", "#777", "rgb(100% 100% 100%)", "invalid", "#fefecc"]) {
    const t = resolveMenuInteractionTheme({ category, surfaces: ["transparent", "#fff", "rgba(0,0,0,0)"] });
    assert.ok(menuColorContrast(t["--menu-call-circle-bg"], t["--menu-call-circle-ink"]) >= 4.5);
    assert.equal(t["--menu-call-ink"], t["--menu-order-bg"]);
  }
});
test("alpha category fill composites over its real surface", () => {
  const t = resolveMenuInteractionTheme({ category: "rgba(0 0 0 / 50%)", surfaces: ["rgba(0,0,0,0)", "#fff"] });
  assert.equal(t["--menu-call-circle-bg"], "#808080");
  assert.equal(t["--menu-order-bg"], "#808080");
  assert.equal(t["--menu-call-bg"], "#ffffff");
  assert.equal(t["--menu-order-ink"], "#ffffff");
});

test("Order uses the actual bright menu paper instead of a dark contrast substitution", () => {
  const theme = resolveMenuInteractionTheme({ category: "#08E39A", surfaces: ["#EED2D2"], inks: ["#17BE86", "#191C1B"] });
  assert.equal(theme["--menu-order-bg"], "#08e39a");
  assert.equal(theme["--menu-order-ink"], "#eed2d2");
  assert.equal(theme["--menu-call-circle-ink"], "#191c1b");
});
