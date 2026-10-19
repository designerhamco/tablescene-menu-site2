import test from "node:test";
import assert from "node:assert/strict";
import { resolveMenuInteractionTheme, menuColorContrast } from "./menu-interaction-theme";

test("dark brand uses the menu's light paper and matching outlined Call", () => {
  const t = resolveMenuInteractionTheme({ brand: "rgb(22, 95, 60)", surfaces: ["#fff", "#f6f3ed"], inks: ["#191c1b"] });
  assert.equal(t["--menu-order-bg"], "#165f3c");
  assert.equal(t["--menu-order-ink"], "#ffffff");
  assert.equal(t["--menu-call-bg"], "#ffffff");
  assert.equal(t["--menu-call-ink"], "#165f3c");
  assert.equal(t["--menu-call-border"], "#165f3c");
});
test("bright brand remains the Order fill while unreadable text gets a darker menu ink", () => {
  const t = resolveMenuInteractionTheme({ brand: "#ffe500", surfaces: ["#faf6eb"], inks: ["#222"] });
  assert.equal(t["--menu-order-bg"], "#ffe500");
  assert.equal(t["--menu-order-ink"], "#222222");
  assert.equal(t["--menu-call-ink"], "#222222");
  assert.equal(t["--menu-order-border"], "#222222");
});
test("dark menu retains its own surface and light brand", () => {
  const t = resolveMenuInteractionTheme({ brand: "#f7eedc", surfaces: ["#15181b"], inks: ["#f7eedc"] });
  assert.equal(t["--menu-order-bg"], "#f7eedc");
  assert.equal(t["--menu-order-ink"], "#15181b");
  assert.equal(t["--menu-call-bg"], "#15181b");
  assert.equal(t["--menu-call-ink"], "#f7eedc");
});
test("all light palettes and middle gray still produce readable controls", () => {
  for (const brand of ["#fff", "#777", "rgb(100% 100% 100%)", "invalid", "#fefecc"]) {
    const t = resolveMenuInteractionTheme({ brand, surfaces: ["transparent", "#fff", "rgba(0,0,0,0)"] });
    assert.ok(menuColorContrast(t["--menu-order-bg"], t["--menu-order-ink"]) >= 4.5);
    assert.ok(menuColorContrast(t["--menu-call-bg"], t["--menu-call-ink"]) >= 4.5);
    assert.ok(menuColorContrast(t["--menu-order-border"], "#fff") >= 3);
  }
});
test("alpha brand colors resolve as rendered, transparent surfaces are ignored", () => {
  const t = resolveMenuInteractionTheme({ brand: "rgba(0 0 0 / 50%)", surfaces: ["rgba(0,0,0,0)", "#fff"] });
  assert.equal(t["--menu-order-bg"], "#808080");
  assert.equal(t["--menu-call-bg"], "#ffffff");
  assert.equal(t["--menu-order-ink"], "#000000");
});
