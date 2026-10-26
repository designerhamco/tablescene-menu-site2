import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const base = process.env.COMPONENT_SCALE_QA_BASE_URL || "http://127.0.0.1:3039";
const browser = await chromium.launch();
const results = [];

const tabCases = [
  { name: "대 · 페이지의 주요 분류", height: 48, font: 16 },
  { name: "중 · 섹션 안의 분류", height: 44, font: 15 },
  { name: "소 · 도구 안의 세부 선택", height: 40, font: 14 },
];

try {
  for (const width of [320, 390, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/design-system`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);

    const measurements = [];
    for (const item of tabCases) {
      const rail = page.getByRole("tablist", { name: `${item.name} underline 예시` });
      const tab = rail.getByRole("tab", { name: "선택 1" });
      const value = await tab.evaluate(element => {
        const railElement = element.closest('[role="tablist"]');
        const rail = railElement.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return {
          railHeight: rail.height,
          tabHeight: box.height,
          font: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      });
      assert.equal(value.railHeight, item.height);
      assert.equal(value.tabHeight, item.height);
      assert.equal(value.font, item.font);
      measurements.push(value);
    }

    const xlButton = page.getByRole("button", { name: "주요 시작 52px", exact: true });
    assert.equal((await xlButton.boundingBox()).height, 52);
    const search = page.getByPlaceholder("어떤 점이 궁금하신가요?");
    const searchMetrics = await search.evaluate(element => {
      const style = getComputedStyle(element);
      return { height: element.getBoundingClientRect().height, font: Number.parseFloat(style.fontSize) };
    });
    assert.equal(searchMetrics.height, 56);
    assert.equal(searchMetrics.font, width >= 1024 ? 17 : 16);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    if (width === 1440) {
      await page.getByRole("heading", { name: "대 · 페이지의 주요 분류", exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: "/tmp/artimenu-component-scale-1440.png" });
    }

    for (const path of ["/templates", "/guides", "/faq"]) {
      await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${path} ${width}px overflow`);
    }

    assert.deepEqual(errors, []);
    results.push({ width, measurements, xlButton: 52, search: searchMetrics, overflow: 0 });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
