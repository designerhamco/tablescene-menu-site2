import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getMobileBrandTitleCandidates, selectMobileBrandTitleFit } from "./mobile-brand-title-fit";

test("mobile brand fitting targets 80% for a short name without letter splitting", () => {
  const candidates = getMobileBrandTitleCandidates("KOHI");
  assert.deepEqual(candidates, [["KOHI"]]);
  const fit = selectMobileBrandTitleFit(candidates, new Map([["KOHI", 310]]), 342);
  assert.ok(Math.abs(fit.fontSize * 310 / 100 / 342 - 0.8) < 0.001);
  assert.equal(fit.fallbackWrap, false);
});

test("long names use balanced words with one consistent font size", () => {
  const fit = selectMobileBrandTitleFit(getMobileBrandTitleCandidates("SUNDAY ROASTERS"), new Map([["SUNDAY ROASTERS", 880], ["SUNDAY", 360], ["ROASTERS", 490]]), 342);
  assert.deepEqual(fit.lines, ["SUNDAY", "ROASTERS"]);
  assert.ok(fit.fontSize > 44 && fit.fontSize <= 72);
});

test("the title fit is bounded, keeps every character and supports CJK graphemes", () => {
  const short = selectMobileBrandTitleFit([["I"]], new Map([["I", 20]]), 342);
  assert.equal(short.fontSize, 128);
  const long = "X".repeat(200);
  const fit = selectMobileBrandTitleFit([[long]], new Map([[long, 10000]]), 272);
  assert.equal(fit.fontSize, 32);
  assert.equal(fit.fallbackWrap, true);
  assert.equal(fit.lines.join(""), long);
  const cjk = "서울숲에서마시는따뜻한커피";
  assert.ok(getMobileBrandTitleCandidates(cjk).some((lines) => lines.length === 2 && lines.join("") === cjk));
});

test("title pilot is explicitly mobile KOHI only, bypasses logos and ignores unrelated mutations", () => {
  const source = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  assert.match(source, /mobileAutoFit = mobileReading && data.menuSite.template_key === "cafe_kohi_a"/);
  assert.ok(source.indexOf("if (useLogo)") < source.indexOf("if (mobileAutoFit)"));
  const component = readFileSync(new URL("../components/menu-templates/shared/MobileBrandTitle.tsx", import.meta.url), "utf8");
  assert.match(component, /document\.fonts\.ready/);
  assert.match(component, /previousWidth/);
  assert.match(component, /fit\?\.inputKey === inputKey/);
  assert.match(component, /\[candidates, texts, inputKey\]/);
  assert.doesNotMatch(component, /MutationObserver|timeSales|fit-menu/);
});
