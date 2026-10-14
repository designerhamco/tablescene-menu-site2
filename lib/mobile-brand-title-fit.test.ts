import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getMobileBrandMeasurementTexts, selectMobileBrandTitleFit } from "./mobile-brand-title-fit";

test("short mobile brand uses the width-relative 56px ceiling, not unlimited fill", () => {
  const widths = new Map([["KOHI", 235]]);
  for (const width of [272, 342, 382]) {
    const fit = selectMobileBrandTitleFit("KOHI", widths, width);
    assert.deepEqual(fit.lines, ["KOHI"]);
    assert.ok(Math.abs(fit.fontSize / width - 56 / 342) < 0.00001);
    assert.ok(fit.fontSize * 235 / 100 / width >= 0.38);
    assert.ok(fit.fontSize >= 44);
  }
});

test("long multiword names balance at word boundaries with a shared size", () => {
  const widths = new Map([["ESPRESSO BASEBASE", 920], ["ESPRESSO", 430], ["BASEBASE", 450]]);
  const fit = selectMobileBrandTitleFit("ESPRESSO BASEBASE", widths, 342);
  assert.deepEqual(fit.lines, ["ESPRESSO", "BASEBASE"]);
  assert.ok(fit.fontSize >= 44);
  assert.equal(fit.fontSize, 44);
  assert.ok(fit.fontSize * 450 / 100 / 342 <= 0.75);
  assert.ok(fit.fontSize * 430 / 100 / 342 > 0.55);
});

test("44px minimum takes priority over target coverage when an intact word needs more width", () => {
  const fit = selectMobileBrandTitleFit("ESPRESSO BASEBASE", new Map([["ESPRESSO BASEBASE", 1200], ["ESPRESSO", 590], ["BASEBASE", 610]]), 342);
  assert.equal(fit.fontSize, 44);
  assert.deepEqual(fit.lines, ["ESPRESSO", "BASEBASE"]);
  assert.equal(fit.naturalWrap, false);
});

test("long names keep the fewest balanced whole-word rows that fit at the minimum", () => {
  const title = "SUNDAY ROASTERS COFFEE HOUSE";
  const units = new Map([["SUNDAY", 377], ["ROASTERS", 475], ["COFFEE", 368], ["HOUSE", 302]]);
  const widths = new Map(getMobileBrandMeasurementTexts(title).map((text) => {
    const words = text.split(" ");
    return [text, words.every((word) => units.has(word)) ? words.reduce((sum, word) => sum + units.get(word)!, 0) + (words.length - 1) * 30 : NaN];
  }));
  const fit = selectMobileBrandTitleFit(title, widths, 342);
  assert.deepEqual(fit.lines, ["SUNDAY", "ROASTERS", "COFFEE HOUSE"]);
  assert.equal(fit.fontSize, 44);
});

test("CJK and oversized words retain every grapheme without truncating", () => {
  for (const title of ["서울숲에서마시는커피", "SUPERCALIFRAGILISTIC"]) {
    const texts = getMobileBrandMeasurementTexts(title);
    const widths = new Map(texts.map((text) => [text, Array.from(text).length * 75]));
    const fit = selectMobileBrandTitleFit(title, widths, 272);
    assert.equal(fit.lines.join(""), title);
    assert.ok(fit.lines.length > 1);
    assert.ok(fit.fontSize >= 44);
    for (const line of fit.lines) assert.ok(widths.get(line)! * fit.fontSize / 100 <= 272.01);
  }
});

test("extreme names, invalid measurements and width preserve text at the minimum", () => {
  const title = "가".repeat(80);
  assert.deepEqual(selectMobileBrandTitleFit(title, new Map(), 272), { lines: [title], fontSize: 44, naturalWrap: true });
  assert.equal(selectMobileBrandTitleFit("KOHI", new Map([["KOHI", 235]]), NaN).fontSize, 44);
  assert.equal(selectMobileBrandTitleFit("KOHI", new Map([["KOHI", 235]]), 342, 60).fontSize >= 60, true);
  assert.ok(getMobileBrandMeasurementTexts("가".repeat(1000)).length < 2);
});

test("single lines prefer 100% when they fit without breaching the visual ceiling", () => {
  const fit = selectMobileBrandTitleFit("ESPRESSO", new Map([["ESPRESSO", 500]]), 342);
  assert.deepEqual(fit.lines, ["ESPRESSO"]);
  assert.equal(fit.fontSize, 56);
});

test("multiline visual ceiling is 44px at 342px inner width; extremely short names do not overscale", () => {
  const widths = new Map([["A B C", 850], ["A B", 375], ["B C", 375], ["A", 125], ["B", 125], ["C", 125]]);
  const fit = selectMobileBrandTitleFit("A B C", widths, 342);
  assert.equal(fit.fontSize, 44);
  assert.equal(fit.lines.length, 2);
  assert.equal(selectMobileBrandTitleFit("I", new Map([["I", 30]]), 342).fontSize, 56);
});

test("all seven use the mobile gate only and logos bypass the width fitter", () => {
  const source = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  const identity = source.slice(source.indexOf("function StoreIdentity"), source.indexOf("function CafeAFooterInfo"));
  assert.ok(identity.indexOf("if (useLogo)") < identity.indexOf("if (mobileAutoFit)"));
  assert.match(source, /mobileAutoFit=\{mobileReading\}/);
  assert.match(source, /mobileReading=\{onePageRhythmMode === "mobile"\}/);
  const component = readFileSync(new URL("../components/menu-templates/shared/MobileBrandTitle.tsx", import.meta.url), "utf8");
  assert.match(component, /fit\?\.inputKey === inputKey/);
  assert.doesNotMatch(component, /ceilingScale/);
  assert.doesNotMatch(identity, /ceilingScale=/);
  assert.match(component, /document.fonts.ready/);
  assert.match(component, /previousWidth/);
  assert.doesNotMatch(component, /MutationObserver|fit-font-scale|setInterval/);
});
