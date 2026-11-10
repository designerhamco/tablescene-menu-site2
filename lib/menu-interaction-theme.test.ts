import test from "node:test";
import assert from "node:assert/strict";
import { resolveMenuInteractionTheme, resolveMenuToolsInk, compositeMenuSurface, menuColorContrast } from "./menu-interaction-theme";

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
test("a bright category keeps its fill and uses the darkest readable configured ink", () => {
  const t = resolveMenuInteractionTheme({ category: "#fff9ee", surfaces: ["#252525", "#fff"], inks: ["#713f36", "#33221e"] });
  assert.equal(t["--menu-order-bg"], "#fff9ee");
  assert.equal(t["--menu-order-ink"], "#252525");
  assert.equal(t["--menu-call-circle-ink"], "#191c1b");
  assert.equal(t["--menu-call-bg"], "#ffffff");
  assert.equal(t["--menu-call-border"], "#fff9ee");
});
test("a light category on dark paper retains its category fill", () => {
  const t = resolveMenuInteractionTheme({ category: "#f7eedc", surfaces: ["#15181b"], inks: ["#f7eedc"] });
  assert.equal(t["--menu-order-bg"], "#f7eedc");
  assert.equal(t["--menu-order-ink"], "#15181b");
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
  assert.equal(t["--menu-order-ink"], "#000000");
});

test("Order replaces unreadable bright paper with the darkest readable configured color", () => {
  const theme = resolveMenuInteractionTheme({ category: "#08E39A", surfaces: ["#EED2D2"], inks: ["#17BE86", "#191C1B"] });
  assert.equal(theme["--menu-order-bg"], "#08e39a");
  assert.equal(theme["--menu-order-ink"], "#191c1b");
  assert.equal(theme["--menu-call-circle-ink"], "#191c1b");
});


test("MELLOW light category uses its native wine before neutral fallback", () => {
  const theme = resolveMenuInteractionTheme({ category: "#ECEAB7", surfaces: ["#792839"], inks: ["#ECEAB7"] });
  assert.equal(theme["--menu-order-bg"], "#eceab7");
  assert.equal(theme["--menu-order-ink"], "#792839");
  assert.ok(menuColorContrast(theme["--menu-order-bg"], theme["--menu-order-ink"]) >= 4.5);
});

test("configured swatches precede neutral fallback and never return unreadable Order text", () => {
  for (const category of ["#fff", "#777", "#08E39A", "#fefecc", "invalid", "rgba(0 0 0 / 50%)"]) {
    const theme = resolveMenuInteractionTheme({ category, surfaces: ["#792839", "#ECEAB7"], inks: ["#f7eedc"] });
    assert.ok(menuColorContrast(theme["--menu-order-bg"], theme["--menu-order-ink"]) >= 4.5);
  }
});

test("Dining tools use readable surface ink independently of action fills", () => {
  assert.equal(resolveMenuToolsInk({preferred:"#17191f",surface:"#0d172a"}), "#ffffff");
  assert.equal(resolveMenuToolsInk({preferred:"#17191f",surface:"#ffffff"}), "#17191f");
  assert.equal(resolveMenuToolsInk({preferred:"#ffffff",surface:"#ffffff"}), "#191c1b");
  assert.equal(resolveMenuToolsInk({preferred:"#c5a165",surface:"#0d172a",palette:["#ffffff"]}), "#c5a165");
  assert.equal(resolveMenuToolsInk({preferred:"#17191f",surface:"#0d172a",palette:["#eceab7", "#c5a165"]}), "#eceab7");
  assert.equal(resolveMenuToolsInk({preferred:"#ffffff",surface:"#ffffff",palette:["#792839", "#c5a165"]}), "#792839");
  for (const surface of ["#0d172a", "#f7f2ea", "#792839", "#888888"]) {
    const ink=resolveMenuToolsInk({preferred:"#c5a165",surface});
    assert.ok(menuColorContrast(ink,surface)>=4.5);
  }
});

test("Dining actions follow page-title ink independently of category ink and Basic", () => {
  const inputs = { pageTitle: "#C5A165", surfaces: ["#ffffff"], inks: ["#0d172a"] };
  const first = resolveMenuInteractionTheme({ ...inputs, category: "#b81838" });
  const second = resolveMenuInteractionTheme({ ...inputs, category: "#328632" });
  assert.deepEqual(first, second);
  assert.equal(first["--menu-order-bg"], "#c5a165");
  assert.equal(first["--menu-call-circle-bg"], "#c5a165");
  assert.equal(first["--menu-call-ink"], "#c5a165");
  assert.equal(first["--menu-call-border"], "#c5a165");
  assert.equal(resolveMenuInteractionTheme({ category: "#b81838", surfaces: inputs.surfaces })["--menu-order-bg"], "#b81838");
});
test("tool selection uses the brightest readable page swatch after store-copy ink", () => {
  assert.equal(resolveMenuToolsInk({preferred:"#ECEAB7",surface:"#792839",palette:["#FFFFFF"]}), "#eceab7");
  assert.equal(resolveMenuToolsInk({preferred:"#191c1b",surface:"#0d172a",palette:["#C5A165", "#ECEAB7"]}), "#eceab7");
  assert.equal(resolveMenuToolsInk({preferred:"#eceab7",surface:"#ffffff",palette:["#A66D52", "#2D2020"]}), "#2d2020");
  assert.equal(compositeMenuSurface("#FFFFFF", "#000000", .5), "#808080");
  assert.equal(compositeMenuSurface("#FFFFFF", "transparent", 1), "#ffffff");
  assert.equal(compositeMenuSurface("#000000", "#FFFFFF", .25), "#404040");
});
