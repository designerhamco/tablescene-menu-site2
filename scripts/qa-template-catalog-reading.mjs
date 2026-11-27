import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 20_000 });

const base = process.env.CATALOG_READING_QA_BASE || "http://127.0.0.1:3019";
const output = process.env.CATALOG_READING_QA_OUTPUT || "/tmp/artimenu-catalog-reading-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], errors = [];
const catalog = `${base}/templates?plan=basic&category=designer`;
async function pageAt(width, javaScriptEnabled = true, hasTouch = false) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce", javaScriptEnabled, hasTouch });
  page.on("pageerror", error => errors.push(error.message));
  return page;
}
const gridOn = page => page.locator(".site-catalog-results .site-template-grid");
async function columns(grid) {
  return grid.evaluate(element => ({ columns: getComputedStyle(element).gridTemplateColumns.split(" ").length, gap: parseFloat(getComputedStyle(element).columnGap), viewport: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth }));
}
try {
  for (const [width, hasTouch] of [[1440, false], [390, true]]) {
    const page = await pageAt(width, true, hasTouch);
    await page.goto(`${base}/templates`, { waitUntil: "domcontentloaded" });
    const service = page.getByRole("combobox", { name: "메뉴판 유형", exact: true });
    const kinds = page.getByRole("tablist", { name: "템플릿 종류 선택" });
    await expect(service).toHaveValue("all");
    await expect(page.getByRole("button", { name: /좋아요/ }).first()).toBeEnabled();
    for (const type of ["basic", "dining", "display"]) {
      await expect(page.locator(`[data-catalog-service="${type}"]`).first()).toBeVisible();
    }
    await expect(page.locator(".site-catalog-kind-hint")).toHaveCount(0);
    await expect(kinds.getByRole("tab", { name: "디자인 템플릿", exact: true })).toHaveAccessibleDescription("완성된 디자인으로 시작");
    await service.selectOption("dining");
    await expect.poll(() => new URL(page.url()).searchParams.get("plan")).toBe("dining");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(service).toHaveValue("dining");
    await expect(page.getByRole("button", { name: /좋아요/ }).first()).toBeEnabled();
    await expect(page.locator('[data-catalog-service]:not([data-catalog-service="dining"])')).toHaveCount(0);
    await kinds.getByRole("tab", { name: "기본 템플릿", exact: true }).click();
    await expect(kinds.getByRole("tab", { selected: true })).toHaveAccessibleName("기본 템플릿");
    await service.selectOption("display");
    await expect(kinds).toHaveCount(0);
    await expect(page.locator('[data-catalog-service="display"]')).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "템플릿 페이지" })).toHaveCount(0);
    await service.selectOption("all");
    await expect(kinds.getByRole("tab", { selected: true })).toHaveAccessibleName("기본 템플릿");
    await expect(page.locator('[data-catalog-service="display"]')).toHaveCount(0);
    await kinds.getByRole("tab", { name: "디자인 템플릿", exact: true }).click();
    const search = page.getByRole("searchbox", { name: "템플릿 이름 검색", exact: true });
    await search.fill("qznoresult");
    await expect(page.getByRole("heading", { name: "조건에 맞는 템플릿이 없습니다" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "템플릿 페이지" })).toHaveCount(0);
    await search.fill("");
    const card = page.locator('[data-catalog-design="cafe_mocha_forest_a"]');
    const carousel = card.locator('.site-image-carousel');
    const counter = carousel.locator('.site-image-carousel-count');
    await expect(card.locator('[data-catalog-structure]')).toBeVisible();
    await expect(card.locator('[data-catalog-mood]')).toHaveCount(1);
    await expect(counter).toHaveText('1/4');
    if (hasTouch) {
      await expect(counter).toHaveCSS("opacity", "1");
    } else {
      await page.mouse.move(0, 0);
      await expect(counter).toHaveCSS("opacity", "0");
      await expect(carousel.locator(".site-image-carousel-arrows")).toHaveCSS("opacity", "0");
      await page.screenshot({ path: `${output}/catalog-desktop.jpg` });
      await carousel.hover();
      await expect(counter).toHaveCSS("opacity", "1");
      await expect(carousel.locator(".site-image-carousel-arrows")).toHaveCSS("opacity", "1");
      await carousel.getByRole("button", { name: /다음 이미지/ }).click();
      await expect(counter).toHaveText('2/4');
      await page.mouse.move(0, 0);
      await carousel.press("ArrowRight");
      await expect(counter).toHaveText('3/4');
      await expect(counter).toHaveCSS("opacity", "1");
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    results.push({ case: "catalog type, empty results and context-sensitive controls", width, hasTouch });
    console.log("PASS catalog filters and controls", width, hasTouch);
    await page.close();
  }
  for (const width of [320, 390, 640, 767, 768, 1440]) {
    const page = await pageAt(width);
    await page.goto(catalog, { waitUntil: "domcontentloaded" });
    const size = width < 768 ? "large" : "small";
    const grid = gridOn(page);
    await expect(grid).toHaveAttribute("data-thumbnail-size", size);
    await expect(page.locator(`[aria-label="썸네일 ${size === "large" ? "크게" : "작게"} 보기"]`)).toHaveAttribute("data-state", "on");
    const actual = await columns(grid);
    await expect(page.getByRole("navigation", { name: "템플릿 페이지" })).toHaveCount(0);
    assert.equal(actual.columns, width < 640 ? 1 : width < 768 ? 2 : width < 1024 ? 3 : 4);
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
    await page.goto(catalog, { waitUntil: "domcontentloaded" });
    const grid = gridOn(page);
    for (const size of ["small", "large"]) {
      if (width < 768) await page.goto(`${catalog}&view=${size}`, { waitUntil: "domcontentloaded" });
      else {
        const control = page.locator(`[aria-label="썸네일 ${size === "large" ? "크게" : "작게"} 보기"]`);
        if (await control.getAttribute("data-state") === "on") await page.locator(`[aria-label="썸네일 ${size === "large" ? "작게" : "크게"} 보기"]`).click();
        await control.click();
      }
      await expect(grid).toHaveAttribute("data-thumbnail-size", size);
      assert.equal(new URL(page.url()).searchParams.get("view"), size);
      await page.getByRole("combobox", { name: "메뉴판 유형", exact: true }).selectOption("dining");
      await expect(grid).toHaveAttribute("data-thumbnail-size", size);
      assert.equal(new URL(page.url()).searchParams.get("view"), size);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(grid).toHaveAttribute("data-thumbnail-size", size);
      await page.getByRole("combobox", { name: "메뉴판 유형", exact: true }).selectOption("basic");
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
    await page.goto(catalog, { waitUntil: "domcontentloaded" });
    const actual = await columns(gridOn(page));
    assert.equal(actual.columns, width < 640 ? 1 : width < 768 ? 2 : 3);
    assert.equal(actual.overflow, 0);
    results.push({ case: "server-rendered default without JavaScript", width, ...actual });
    console.log("PASS server render", width);
    await page.close();
  }
  for (const width of [390, 820, 1440]) {
    const page = await pageAt(width);
    await page.goto(`${base}/templates/cafe_real_matcha_a`, { waitUntil: "domcontentloaded" });
    const gallery = page.getByRole("region", { name: "REAL MATCHA 디자인 갤러리", exact: true });
    await gallery.locator('.site-image-carousel-slide[aria-hidden="false"] img').click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await gallery.getByRole("group", { name: "REAL MATCHA 이미지 선택", exact: true }).getByRole("button").nth(1).click();
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
  await page.goto(`${base}/design-system`, { waitUntil: "domcontentloaded" });
  const notice = page.getByRole("dialog", { name: "위치 편집은 PC에서 해 주세요", exact: true });
  if (await notice.isVisible()) {
    await notice.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  }
  const panel = page.locator(".site-notification-panel[data-compact]");
  await panel.getByRole("button", { name: "모두 읽음", exact: true }).click();
  await panel.getByRole("tab", { name: /읽지 않음/ }).click();
  await expect(panel.getByRole("heading", { name: "읽지 않은 알림이 없습니다", exact: true })).toBeVisible();
  assert.equal(await panel.locator('.site-notification-feed[data-state="active"]').evaluate(element => parseFloat(getComputedStyle(element).paddingTop)), 24);
  results.push({ case: "notification empty spacing retained", width: 390 });
  await page.close();
  assert.deepEqual(errors, []);
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ checked: results.length, failed: 0, output }));
} finally { await browser.close(); }
