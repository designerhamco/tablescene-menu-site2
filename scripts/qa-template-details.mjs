import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import axe from "axe-core";

const base = process.env.TEMPLATE_DETAIL_QA_BASE_URL || "http://127.0.0.1:3000";
const output = process.env.TEMPLATE_DETAIL_QA_OUTPUT || "/tmp/artimenu-template-detail-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const templates = [
  ["cafe_real_matcha_a", "REAL MATCHA", "single"],
  ["cafe_mocha_forest_a", "모카 포레스트", "single"],
  ["cafe_sunday_roasters_a", "선데이 로스터스", "single"],
  ["cafe_van_gogh_a", "Van Gogh", "single"],
  ["cafe_round_focus_a", "ROSY ORANGE", "single"],
  ["fast_food_loop_bagel_a", "루프베이글", "single"],
  ["restaurant_onue_a", "온유 테이블", "single"],
  ["dining_aube_table_a", "오브 테이블", "multi"],
  ["dining_aube_table_b", "메종 마레", "multi"],
  ["display_menu_a", "썸머 블루", "display"],
];

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
}

async function inspect(page, width, height) {
  const geometry = await page.locator('aside[aria-label="템플릿 정보 및 시작"]').evaluate(sidebar => {
    const story = sidebar.nextElementSibling;
    const side = sidebar.getBoundingClientRect();
    const content = story.getBoundingClientRect();
    return {
      viewport: [innerWidth, innerHeight], overflow: document.documentElement.scrollWidth - innerWidth,
      sidebar: { x: side.x, y: side.y, right: side.right, bottom: side.bottom, height: side.height, scroll: sidebar.scrollHeight, client: sidebar.clientHeight, position: getComputedStyle(sidebar).position, targetTop: parseFloat(getComputedStyle(sidebar).top) },
      story: { x: content.x, y: content.y, right: content.right, bottom: content.bottom },
      brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src),
    };
  });
  assert.deepEqual(geometry.viewport, [width, height]);
  assert.equal(geometry.overflow, 0);
  assert.deepEqual(geometry.brokenImages, []);
  if (width >= 768) {
    assert.equal(geometry.sidebar.position, "sticky");
    assert.ok(geometry.story.right < geometry.sidebar.x, "Story and sidebar must occupy separate columns");
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    const pinned = await page.locator('aside[aria-label="템플릿 정보 및 시작"]').boundingBox();
    assert.ok(Math.abs(pinned.y - geometry.sidebar.targetTop) < 2, "Sidebar stays below the fixed site header");
    await page.locator('aside[aria-label="템플릿 정보 및 시작"]').evaluate(sidebar => { sidebar.scrollTop = sidebar.scrollHeight; });
    const actions = page.getByRole("link", { name: "미리보기", exact: true });
    const bounds = await actions.boundingBox();
    assert.ok(bounds.y >= pinned.y && bounds.y + bounds.height <= height, "Actions remain reachable on short screens");
    await page.locator('aside[aria-label="템플릿 정보 및 시작"]').evaluate(sidebar => { sidebar.scrollTop = 0; });
  } else {
    assert.equal(geometry.sidebar.position, "static");
    assert.ok(geometry.story.y >= geometry.sidebar.bottom, "Mobile shows template information before the story");
    assert.equal(geometry.sidebar.scroll, geometry.sidebar.client);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  return geometry;
}

try {
  for (const [width, height] of [[320, 844], [390, 844], [430, 932], [640, 960], [768, 1024], [820, 1180], [1024, 600], [1180, 820], [1440, 900], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(`${base}/templates/cafe_real_matcha_a`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    await settle(page);
    const geometry = await inspect(page, width, height);
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.filter(item => ["critical", "serious"].includes(item.impact)).map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })));
    assert.deepEqual(violations, []);
    assert.deepEqual(errors, []);
    if ([390, 820, 1440].includes(width)) {
      await page.screenshot({ path: `${output}/${width}-top.png` });
      await page.screenshot({ path: `${output}/${width}-full.png`, fullPage: true });
    }
    results.push({ case: "responsive", ...geometry });
    await page.close();
  }

  for (const [route, name, tier] of templates) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const response = await page.goto(`${base}/templates/${route}`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
    assert.ok((await page.title()).startsWith(name));
    const sidebar = page.getByRole("complementary", { name: "템플릿 정보 및 시작" });
    await expect(sidebar.getByRole("link", { name: "미리보기", exact: true })).toHaveAttribute("href", `/templates/${route}/preview`);
    if (tier === "display") {
      await expect(sidebar.getByRole("button", { name: "디스플레이 신청 준비 중" })).toBeDisabled();
    } else {
      const href = await sidebar.getByRole("link", { name: "이 디자인으로 시작" }).getAttribute("href");
      const url = new URL(href, base);
      assert.equal(url.pathname, "/apply/basic");
      assert.equal(url.searchParams.get("product"), `business_basic_${tier}_monthly`);
      assert.equal(url.searchParams.get("template"), route === "cafe_real_matcha_a" ? "cafe_design_a" : route === "cafe_sunday_roasters_a" ? "cafe_sunday_line_a" : route);
      await expect(sidebar).toContainText(tier === "multi" ? "6,900원" : "4,900원");
    }
    await inspect(page, 1440, 900);
    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page);
    await inspect(page, 390, 844);
    results.push({ case: "catalog", route, tier, viewports: [[1440, 900], [390, 844]] });
    await page.close();
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  await page.goto(`${base}/apply`, { waitUntil: "networkidle" });
  const thumbnail = page.getByRole("link", { name: "REAL MATCHA 상세 보기", exact: true });
  await expect(thumbnail).not.toHaveAttribute("target", "_blank");
  await thumbnail.click();
  await expect(page).toHaveURL(`${base}/templates/cafe_real_matcha_a`);
  await page.getByRole("button", { name: "오른쪽 디테일", exact: true }).click();
  await expect(page.getByRole("button", { name: "오른쪽 디테일", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "다음 디자인 이미지" }).click();
  await expect(page.getByRole("button", { name: "전체 디자인", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "전체 디자인", exact: true }).press("ArrowLeft");
  await expect(page.getByRole("button", { name: "오른쪽 디테일", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "템플릿 링크 복사" }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `${base}/templates/cafe_real_matcha_a`);
  await page.getByRole("link", { name: "이 디자인으로 시작" }).click();
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  const next = new URL(page.url()).searchParams.get("next");
  assert.ok(next.includes("template=cafe_design_a"));
  assert.ok(next.includes("product=business_basic_single_monthly"));
  results.push({ case: "interactions", thumbnail: "same-tab detail", gallery: "click, wrap and keyboard", share: "clipboard", checkout: "login retains selection" });
  for (const route of ["unknown-design", "cafe_brew_chapter_a", "cafe_real_matcha_paged_test", "cafe_kohi_a"]) {
    const response = await page.goto(`${base}/templates/${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 404, route);
    results.push({ case: "unavailable", route, status: 404 });
  }
  await context.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ checked: results.length, failed: 0, output }));
} finally {
  await browser.close();
}
