import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KOREAN_FONT_OPTIONS } from "./font-options";
import { getBasicTimeSaleFont } from "./basic-time-sale-font";
import { getTypographyCssVariables, mergeTypographySettings } from "./template-typography-presets";
import DefaultDesignScope from "../components/menu-templates/defaults/DefaultDesignScope";
import { CafeATypographyFontAssets } from "../components/menu-templates/CafeDesignA";

test("every selectable Korean face has a supported promotion weight and matching extra assets", () => {
  for (const font of KOREAN_FONT_OPTIONS) {
    const result = getBasicTimeSaleFont(font.value);
    assert.ok(result.weight >= 1 && result.weight <= 1000, font.value);
    if (result.asset) {
      const css = readFileSync(`public${result.asset.href}`, "utf8");
      const weights = [...css.matchAll(/font-weight:\s*(\d+);/g)].map(match => Number(match[1]));
      assert.ok(weights.length > 0);
      assert.ok(weights.every(weight => weight === result.weight), font.value);
      assert.ok(css.includes(`font-family: 'ArtiMenuTimeSale-${font.value}'`));
      assert.ok(css.includes("format('woff2')"));
    }
  }
  assert.equal(getBasicTimeSaleFont("pretendard").weight, 900);
  assert.equal(getBasicTimeSaleFont("asta-sans").weight, 800);
  assert.equal(getBasicTimeSaleFont("gowun-batang").weight, 700);
  assert.equal(getBasicTimeSaleFont("nanum-gothic").weight, 800);
  assert.equal(getBasicTimeSaleFont("gowun-dodum").weight, 400);
  assert.equal(getBasicTimeSaleFont("hangulnuri").weight, 700);
});

test("saved common font selection resolves the promotion family and its actual weight", () => {
  const settings = mergeTypographySettings("cafe_design_a", { korean_font_key: "hahmlet" });
  const variables = getTypographyCssVariables(settings, "cafe_design_a") as Record<string, string>;
  assert.equal(variables["--menu-time-sale-font-weight"], "900");
  assert.ok(variables["--menu-time-sale-font-family"].includes("ArtiMenuTimeSale-hahmlet"));
  assert.ok(!variables["--menu-font-ko"].includes("ArtiMenuTimeSale"));
});

test("extra maximum-weight faces load only inside Basic default design scopes", () => {
  const settings = mergeTypographySettings("cafe_design_a", { korean_font_key: "gothic-a1" });
  const assets = createElement(CafeATypographyFontAssets, { typographySettings: settings });
  const native = renderToStaticMarkup(assets);
  // eslint-disable-next-line react/no-children-prop -- The scope requires children in its typed props.
  const standard = renderToStaticMarkup(createElement(DefaultDesignScope, {
    layout: "basic-top-row",
    children: assets,
  }));
  assert.ok(!native.includes("/fonts/time-sale/"));
  assert.ok(standard.includes("/fonts/time-sale/gothic-a1-900.css"));
});
