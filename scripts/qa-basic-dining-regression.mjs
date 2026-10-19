import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
import {
  measureOnePageMobileRhythm,
  getOnePageMobileRhythmFailures,
} from "./lib/one-page-mobile-rhythm.mjs";
import {
  measureMenuPriceAlignment,
  getMenuPriceAlignmentFailures,
} from "./lib/menu-price-alignment.mjs";
const base = process.env.ORDER_QA_BASE || "http://localhost:3017";
const keys = [
  "cafe_design_a",
  "cafe_mocha_forest_a",
  "cafe_sunday_line_a",
  "cafe_van_gogh_a",
  "cafe_round_focus_a",
  "restaurant_onue_a",
  "fast_food_loop_bagel_a",
];
const cases = [];
for (const key of keys) {
  for (const [device, w, h] of [
    ["pc", 1512, 762],
    ["tablet", 1180, 820],
    ["tablet", 820, 1180],
    ["mobile", 320, 844],
    ["mobile", 390, 844],
    ["mobile", 430, 844],
  ])
    cases.push({ key, device, w, h, features: false, lang: "ko" });
  for (const [device, w, h] of [
    ["pc", 1512, 762],
    ["tablet", 1180, 820],
    ["tablet", 820, 1180],
    ["mobile", 390, 844],
  ])
    cases.push({ key, device, w, h, features: true, lang: "ko" });
  for (const lang of ["en", "zh", "ja"])
    for (const [device, w, h] of [
      ["mobile", 390, 844],
      ["tablet", 820, 1180],
    ])
      cases.push({ key, device, w, h, features: true, lang });
}
if (process.env.ORDER_QA_RETRY) {
  const failures = JSON.parse(
    await fs.readFile(process.env.ORDER_QA_RETRY, "utf8"),
  ).failures;
  cases.splice(0, cases.length, ...failures);
}
const browser = await chromium.launch();
const results = [],
  failures = [],
  errors = [];
async function check(c) {
  const page = await browser.newPage({
    viewport: { width: c.w, height: c.h },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push({ case: c, message: e.message }));
  try {
    await page.goto(
      base +
        "/templates/" +
        c.key +
        "/preview?" +
        new URLSearchParams({
          device: c.device,
          view: "actual",
          embedded: "1",
          lang: c.lang,
          ...(c.features ? { callPreview: "on", orderPreview: "on" } : {}),
        }),
      { waitUntil: "domcontentloaded", timeout: 60000 },
    );
    await page.evaluate(() => document.fonts.ready);
    if (c.device === "mobile")
      await page.waitForSelector('[data-mobile-brand-fit="ready"]', {
        timeout: 60000,
      });
    else
      await page.waitForSelector(
        c.key === 'cafe_design_a' ? '[data-paged-ready="true"]' : '.cafe-a-desktop-fit-board[data-fit-presentation-state="ready"]',
        { timeout: 60000 },
      );
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => {
      const visible = (e) => {
        const s = getComputedStyle(e),
          r = e.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.height > 0 &&
          s.visibility !== "hidden" &&
          s.display !== "none"
        );
      };
      const board = [
        ...document.querySelectorAll(".cafe-a-desktop-fit-board"),
      ].find(visible);
      const scroll = document.querySelector('[data-spacing-contract="contained-reading"]');
      const menu = scroll?.querySelector("[data-scroll-menu]") ?? board?.querySelector(".cafe-a-fit-menu-scroll-root");
      const r = (scroll ?? board)?.getBoundingClientRect();
      const name = [
        ...document.querySelectorAll("[data-cafe-a-menu-name]"),
      ].find(visible);
      const items = [
        ...(menu?.querySelectorAll("[data-cafe-a-menu-item]") ?? []),
      ].filter(visible);
      const clipped = items
        .filter((e) => {
          const b = e.getBoundingClientRect();
          return (
            (!scroll && b.bottom > r.bottom + 1) ||
            b.right > r.right + 1 ||
            b.left < r.left - 1
          );
        })
        .map((e) => e.textContent.slice(0, 40));
      return {
        viewport: [innerWidth, innerHeight],
        contained: Boolean(scroll),
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        clipped,
        nameSize: name ? parseFloat(getComputedStyle(name).fontSize) : null,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
        menu: menu
          ? {
              height: menu.clientHeight,
              scrollHeight: menu.scrollHeight,
              width: menu.clientWidth,
              scrollWidth: menu.scrollWidth,
            }
          : null,
        adds: [...document.querySelectorAll("[data-menu-order-add]")].filter(
          visible,
        ).length,
        actions: [
          ...document.querySelectorAll("[data-one-page-table-actions], [data-scroll-actions]"),
        ].filter(visible).length,
      };
    });
    assert.deepEqual(m.viewport, [c.w, c.h]);
    assert.ok(m.width <= c.w + 1, "horizontal overflow");
    assert.equal(m.adds > 0, c.features);
    assert.equal(m.actions > 0, c.features);
    if (c.device === "mobile")
      assert.deepEqual(
        getOnePageMobileRhythmFailures(
          await page.evaluate(measureOnePageMobileRhythm),
        ),
        [],
      );
    else {
      assert.ok(m.height <= c.h + 1, "canvas page scroll");
      assert.deepEqual(m.clipped, []);
      assert.ok(m.nameSize >= m.rem - 0.1);
      if (m.menu) {
        if (!m.contained) assert.ok(m.menu.scrollHeight <= m.menu.height + 1);
        assert.ok(m.menu.scrollWidth <= m.menu.width + 1);
      }
    }
    assert.deepEqual(
      getMenuPriceAlignmentFailures(
        await page.evaluate(measureMenuPriceAlignment),
      ),
      [],
    );
    results.push({ ...c, ...m });
    console.log("PASS", JSON.stringify(c));
  } catch (e) {
    failures.push({ ...c, error: e.message });
    console.log(
      "FAIL",
      JSON.stringify({ ...c, error: e.message.slice(0, 300) }),
    );
    await page
      .screenshot({
        path:
          "/private/tmp/basic-dining-qa/regression-" +
          c.key +
          "-" +
          c.device +
          "-" +
          c.lang +
          "-" +
          c.features +
          ".png",
      })
      .catch(() => {});
  } finally {
    await page.close();
  }
}
let index = 0;
try {
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (index < cases.length) {
        const c = cases[index++];
        await check(c);
      }
    }),
  );
} finally {
  await browser.close();
  await fs.writeFile(
    "/private/tmp/basic-dining-qa/regression-report.json",
    JSON.stringify({ base, results, failures, errors }, null, 2),
  );
}
console.log(
  JSON.stringify({ checked: results.length, failed: failures.length, errors }),
);
if (failures.length || errors.length) process.exitCode = 1;
