import test from "node:test";
import assert from "node:assert/strict";
import { resolveMenuInteractionTheme, menuColorContrast } from "./menu-interaction-theme";

test("Order retains the representative fill while Call keeps the bright menu surface", () => {
  const t = resolveMenuInteractionTheme({ brand: "rgb(22, 95, 60)", surfaces: ["#fff", "#f6f3ed"], inks: ["#191c1b"] });
  assert.equal(t["--menu-order-bg"], "#165f3c");
  assert.equal(t["--menu-order-ink"], "#ffffff");
  assert.equal(t["--menu-call-bg"], "#ffffff");
  assert.equal(t["--menu-call-ink"], "#165f3c");
  assert.equal(t["--menu-call-border"], "#165f3c");
  assert.equal(t["--menu-call-circle-bg"], "#165f3c");
});
test("a bright representative keeps its fill and receives contrasting ink", () => {
  const t = resolveMenuInteractionTheme({ brand: "#fff9ee", surfaces: ["#252525", "#fff"], inks: ["#713f36", "#33221e"] });
  assert.equal(t["--menu-order-bg"], "#fff9ee");
  assert.equal(t["--menu-order-ink"], "#191c1b");
  assert.equal(t["--menu-call-bg"], "#ffffff");
  assert.equal(t["--menu-call-border"], "#713f36");
});
test("a light brand on dark paper retains its brand fill", () => {
  const t = resolveMenuInteractionTheme({ brand: "#f7eedc", surfaces: ["#15181b"], inks: ["#f7eedc"] });
  assert.equal(t["--menu-order-bg"], "#f7eedc");
  assert.equal(t["--menu-order-ink"], "#191c1b");
  assert.equal(t["--menu-call-bg"], "#f7eedc");
  assert.equal(t["--menu-call-circle-bg"], "#f7eedc");
});
test("all-light or invalid palettes still produce readable controls", () => {
  for (const brand of ["#fff", "#777", "rgb(100% 100% 100%)", "invalid", "#fefecc"]) {
    const t = resolveMenuInteractionTheme({ brand, surfaces: ["transparent", "#fff", "rgba(0,0,0,0)"] });
    assert.ok(menuColorContrast(t["--menu-order-bg"], t["--menu-order-ink"]) >= 4.5);
    assert.ok(menuColorContrast(t["--menu-call-bg"], t["--menu-call-ink"]) >= 4.5);
  }
});
test("alpha representative fill composites over its real surface", () => {
  const t = resolveMenuInteractionTheme({ brand: "rgba(0 0 0 / 50%)", surfaces: ["rgba(0,0,0,0)", "#fff"] });
  assert.equal(t["--menu-call-circle-bg"], "#808080");
  assert.equal(t["--menu-order-bg"], "#808080");
  assert.equal(t["--menu-call-bg"], "#ffffff");
  assert.equal(t["--menu-order-ink"], "#000000");
});
