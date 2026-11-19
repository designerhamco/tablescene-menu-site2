import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const base = process.env.PATTERN_CLEARANCE_BASE || "http://localhost:3058";
const loopPath = "/templates/fast_food_loop_bagel_a/preview?device=mobile&view=actual";
const dockSelector = "[data-one-page-call-dock]";
const near = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) <= 0.3, `${label}: ${actual} versus ${expected}`);

function measure(root) {
  const box = root.getBoundingClientRect();
  const dock = root.querySelector("[data-one-page-call-dock]");
  const dockBox = dock?.getBoundingClientRect();
  const readSafeArea = document.createElement("span");
  readSafeArea.style.cssText = "position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
  document.body.append(readSafeArea);
  const style = getComputedStyle(readSafeArea);
  const safeTop = parseFloat(style.paddingTop);
  const safeBottom = parseFloat(style.paddingBottom);
  readSafeArea.remove();
  const topBand = parseFloat(getComputedStyle(root, "::before").height) || 0;
  const bottomBand = parseFloat(getComputedStyle(root, "::after").height) || 0;
  const content = root.querySelector("[data-cafe-a-scroll-content]");
  const row = root.querySelector("[data-one-page-call-bar]");
  const table = row?.querySelector("[data-one-page-table-label]").getBoundingClientRect();
  const rowBox = row?.getBoundingClientRect();
  const iconTops = [...(row?.querySelectorAll("button > svg") ?? [])].map(svg => {
    const bounds = svg.getBoundingClientRect();
    const stroke = parseFloat(getComputedStyle(svg).strokeWidth) / 2;
    return bounds.top + (svg.getBBox().y - stroke) * bounds.height / svg.viewBox.baseVal.height - box.top;
  });

  return {
    topBand, bottomBand, safeTop, safeBottom, iconTops, width: innerWidth,
    inset: parseFloat(getComputedStyle(content).paddingInlineStart),
    hitHeights: [...(row?.querySelectorAll("button") ?? [])].map(button => button.getBoundingClientRect().height),
    tableCenterDifference: table && rowBox ? table.x + table.width / 2 - rowBox.x - rowBox.width / 2 : undefined,
    dockPosition: dock && getComputedStyle(dock).position,
    dockPaint: dock && getComputedStyle(dock).backgroundColor,
    bottomOfActions: dockBox?.bottom,
    contentEnd: content.getBoundingClientRect().bottom,
    viewportClearance: dockBox && innerHeight - dockBox.bottom,
    bottomBandGap: dockBox && box.bottom - bottomBand - dockBox.bottom,
    effectiveBottomGap: dockBox && box.bottom - Math.max(bottomBand, safeBottom) - dockBox.bottom,
    order: [...(dock?.querySelectorAll("button") ?? [])].map(button => button.dataset.onePageCallButton),
  };
}

const browser = await chromium.launch();
const cases = [
  { width: 320, call: true },
  { width: 390, call: true, order: true },
  { width: 390, call: true, order: true, framed: true },
  { width: 430, order: true },
  { width: 390, call: true, order: true, safeTop: 36, safeBottom: 34 },
  { width: 390, call: false, order: false },
  { width: 390, call: true, order: true, patternHidden: true },
];
if (process.env.PATTERN_CLEARANCE_FIXTURES === "1") {
  cases.push({ width: 390, call: true, order: true, custom: true });
  cases.push({ width: 390, call: true, custom: true, safeTop: 36, safeBottom: 34 });
}

try {
  for (const { width, call, order, safeTop = 0, safeBottom = 0, patternHidden, custom, framed } of cases) {
    const viewport = framed ? { width: 1512, height: 900 } : { width, height: 844 };
    const page = await browser.newPage({ viewport, isMobile: !framed, hasTouch: !framed, reducedMotion: "reduce" });
    try {
      if (safeTop || safeBottom) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: safeTop, bottom: safeBottom } });
      }
      const settings = new URLSearchParams({
        callPreview: call ? "on" : "off", orderPreview: order ? "on" : "off",
        ...(patternHidden ? { designPreview: JSON.stringify({ hidePatternBands: true }) } : {}),
      });
      const path = custom
        ? `/__qa/basic-design?device=mobile&design=basic-top-row-album&pattern=on&call=${call ? "on" : "off"}&order=${order ? "on" : "off"}`
        : `${framed ? loopPath.replace("&view=actual", "") : loopPath}&${settings}`;
      assert.equal((await page.goto(base + path)).status(), 200);
      const scope = framed ? page.frameLocator("[data-preview-frame-shell] iframe") : page;
      const root = scope.locator("main.cafe-a-typography").first();
      await root.waitFor();
      await root.evaluate(() => document.fonts.ready);
      const first = await root.evaluate(measure);
      assert.equal(first.width, width);
      near(first.safeTop, safeTop, "expected safe top");
      near(first.safeBottom, safeBottom, "expected safe bottom");
      near(first.topBand, first.bottomBand, "same pattern height on both sides");
      if (custom) near(first.topBand, 32, "chosen album pattern height");
      if (!call && !order) {
        assert.equal(await root.locator(dockSelector).count(), 0);
        assert.ok(first.topBand > 0);
        continue;
      }
      assert.deepEqual(first.order, [...(call ? ["mobile-bottom"] : []), ...(order ? ["mobile-order-bottom"] : [])]);
      assert.equal(first.iconTops.length, 2);
      first.iconTops.forEach(top => near(top - Math.max(first.topBand, safeTop), first.inset, "top icon clearance"));
      first.hitHeights.forEach(height => near(height, 44, "44px hit target"));
      near(first.tableCenterDifference, 0, "table label centered");
      assert.equal(first.dockPaint, "rgba(0, 0, 0, 0)");
      near(first.viewportClearance, 12 + safeBottom, "dock stays within reach before scrolling");
      assert.equal(first.dockPosition, patternHidden ? "fixed" : "sticky");

      for (const remaining of [64, 32, 12, 0]) {
        await root.evaluate((_, remaining) => scrollTo({ top: document.scrollingElement.scrollHeight - innerHeight - remaining, behavior: "instant" }), remaining);
        const end = await root.evaluate(measure);
        if (patternHidden) {
          near(end.viewportClearance, 12 + safeBottom, "pattern off keeps original dock placement");
        } else {
          assert.ok(end.bottomBandGap >= end.inset - 0.3, "dock always stays ahead of the lower band");
          if (remaining === 0) {
            near(end.effectiveBottomGap, end.inset, "bottom clearance at scroll end");
            assert.ok(end.contentEnd < end.bottomOfActions - 44, "last menu and notices precede dock");
          }
        }
      }
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`PASS ${cases.length} mobile pattern clearance cases`);
