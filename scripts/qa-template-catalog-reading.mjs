import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.CATALOG_READING_QA_BASE || "http://127.0.0.1:3019";
const output = process.env.CATALOG_READING_QA_OUTPUT || "/tmp/artimenu-catalog-reading-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], errors = [];
const catalog = `${base}/templates?plan=basic&category=designer`;
async function pageAt(width, javaScriptEnabled = true) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce", javaScriptEnabled });
  page.on("pageerror", error => errors.push(error.message));
  return page;
}
const gridOn = page => page.locator(".site-catalog-results .site-template-grid");
async function columns(grid) {
  return grid.evaluate(element => ({ columns: getComputedStyle(element).gridTemplateColumns.split(" ").length, gap: parseFloat(getComputedStyle(element).columnGap), viewport: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth }));
}
try {
  for (const width of [320, 390, 640, 767, 768, 1440]) {
    const page = await pageAt(width);
    await page.goto(catalog, { waitUntil: "networkidle" });
    const size = width < 768 ? "large" : "small";
    const grid = gridOn(page);
    await expect(grid).toHaveAttribute("data-thumbnail-size", size);
    await expect(page.locator(`[aria-label="썸네일 ${size === "large" ? "크게" : "작게"} 보기"]`)).toHaveAttribute("data-state", "on");
    const actual = await columns(grid);
    assert.equal(actual.columns, width < 640 ? 1 : width < 768 ? 2 : 3);
    assert.equal(actual.overflow, 0);
    assert.equal(new URL(page.url()).searchParams.has("view"), false);
    if (width === 390) {
      await grid.locator("article").first().screenshot({ path: `${output}/mobile-large-default.png` });
      await page.setViewportSize({ width: 820, height: 1000 });
      await expect(grid).toHaveAttribute("data-thumbnail-size", "small");
      await page.setViewportSize({ width: 390, height: 1000 });
      await expect(grid).toHaveAttribute("data-thumbnail-size", "large");
    }
    results.push({ case: "responsive default", width, size, ...actual });
    console.log("PASS default", width, size);
    await page.close();
  }
  for (const width of [390, 1440]) {
    const page = await pageAt(width);
    await page.goto(catalog, { waitUntil: "networkidle" });
    const grid = gridOn(page);
    for (const size of ["small", "large"]) {
      if (width < 768) await page.goto(`${catalog}&view=${size}`, { waitUntil: "networkidle" });
      else {
        const control = page.locator(`[aria-label="썸네일 ${size === "large" ? "크게" : "작게"} 보기"]`);
        if (await control.getAttribute("data-state") === "on") await page.locator(`[aria-label="썸네일 ${size === "large" ? "작게" : "크게"} 보기"]`).click();
        await control.click();
      }
      await expect(grid).toHaveAttribute("data-thumbnail-size", size);
      assert.equal(new URL(page.url()).searchParams.get("view"), size);
      await page.getByRole("tab", { name: "다이닝", exact: true }).click();
      await expect(grid).toHaveAttribute("data-thumbnail-size", size);
      assert.equal(new URL(page.url()).searchParams.get("view"), size);
      await page.reload({ waitUntil: "networkidle" });
      await expect(grid).toHaveAttribute("data-thumbnail-size", size);
      await page.getByRole("tab", { name: "베이직", exact: true }).click();
      if (width === 390) {
        assert.equal((await columns(grid)).columns, size === "large" ? 1 : 2);
        await page.setViewportSize({ width: 820, height: 1000 });
        await expect(grid).toHaveAttribute("data-thumbnail-size", size);
        await page.setViewportSize({ width: 390, height: 1000 });
        await expect(grid).toHaveAttribute("data-thumbnail-size", size);
      }
    }
    results.push({ case: "explicit choices survive URL, service, reload and resize", width });
    console.log("PASS explicit choices", width);
    await page.close();
  }
  for (const width of [390, 640, 768]) {
    const page = await pageAt(width, false);
    await page.goto(catalog, { waitUntil: "networkidle" });
    const actual = await columns(gridOn(page));
    assert.equal(actual.columns, width < 640 ? 1 : width < 768 ? 2 : 3);
    assert.equal(actual.overflow, 0);
    results.push({ case: "server-rendered default without JavaScript", width, ...actual });
    console.log("PASS server render", width);
    await page.close();
  }
  for (const width of [390, 820, 1440]) {
    const page = await pageAt(width);
    await page.goto(`${base}/templates/cafe_real_matcha_a`, { waitUntil: "networkidle" });
    const gallery = page.getByRole("region", { name: "REAL MATCHA 디자인 갤러리", exact: true });
    await gallery.locator('.site-image-carousel-slide[aria-hidden="false"] img').click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await gallery.getByRole("button", { name: "모바일 QR 메뉴", exact: true }).click();
    await expect(gallery.getByRole("status")).toHaveText("2/3");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await gallery.getByRole("region", { name: "REAL MATCHA 이미지", exact: true }).press("ArrowRight");
    await expect(gallery.getByRole("status")).toHaveText("3/3");
    const hero = page.locator('[data-template-story] img').first();
    await hero.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    assert.equal(await hero.evaluate(image => Boolean(image.closest("button"))), false);
    await expect(page.locator(".site-image-open-trigger, .site-image-viewer")).toHaveCount(0);
    results.push({ case: "detail selection without enlargement", width });
    console.log("PASS detail", width);
    await page.close();
  }
  const page = await pageAt(390);
  await page.goto(`${base}/design-system`, { waitUntil: "networkidle" });
  const notice = page.getByRole("dialog", { name: "위치 편집은 PC에서 해 주세요", exact: true });
  if (await notice.isVisible()) {
    await notice.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  }
  const panel = page.locator(".site-notification-panel[data-compact]");
  await panel.getByRole("button", { name: "모두 읽기", exact: true }).click();
  await panel.getByRole("tab", { name: /읽지 않음/ }).click();
  await expect(panel.getByRole("heading", { name: "읽지 않은 알림이 없습니다", exact: true })).toBeVisible();
  assert.equal(await panel.locator('.site-notification-feed[data-state="active"]').evaluate(element => parseFloat(getComputedStyle(element).paddingTop)), 24);
  results.push({ case: "notification empty spacing retained", width: 390 });
  await page.close();
  assert.deepEqual(errors, []);
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ checked: results.length, failed: 0, output }));
} finally { await browser.close(); }
