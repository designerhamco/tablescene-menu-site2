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
    const images = [...document.images];
    images.forEach(image => { image.loading = "eager"; });
    await Promise.race([
      Promise.all(images.map(image => image.decode().catch(() => {}))),
      new Promise(resolve => window.setTimeout(resolve, 10_000)),
    ]);
  });
}

async function inspect(page, width, height) {
  const sidebar = page.getByRole("complementary", { name: "템플릿 정보 및 시작" });
  const info = sidebar.getByRole("region", { name: "템플릿 상세 정보" });
  const actions = sidebar.locator("[data-template-detail-actions]");
  const gallery = sidebar.getByRole("region", { name: /디자인 갤러리/ });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(sidebar).toHaveAttribute("data-docked", "false");
  await expect(gallery).toBeVisible();
  await expect(actions).toHaveAttribute("data-scroll-more", "false");
  await expect(page.getByRole("button", { name: "AI 상담 열기" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "맨 위로 이동" })).toHaveCount(0);
  const geometry = await sidebar.evaluate(sidebar => {
    const story = sidebar.nextElementSibling;
    const side = sidebar.getBoundingClientRect();
    const content = story.getBoundingClientRect();
    return {
      viewport: [innerWidth, innerHeight], overflow: document.documentElement.scrollWidth - innerWidth,
      sidebar: { x: side.x, y: side.y, right: side.right, bottom: side.bottom, height: side.height, scroll: sidebar.scrollHeight, client: sidebar.clientHeight },
      story: { x: content.x, y: content.y, right: content.right, bottom: content.bottom },
      pageHeight: document.documentElement.scrollHeight,
      headerBottom: document.querySelector("[data-site-header]").getBoundingClientRect().bottom,
      gap: parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5,
      brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src),
    };
  });
  assert.deepEqual(geometry.viewport, [width, height]);
  assert.equal(geometry.overflow, 0);
  assert.deepEqual(geometry.brokenImages, []);
  if (width >= 768) {
    assert.ok(geometry.story.right < geometry.sidebar.x, "Story and sidebar must occupy separate columns");
    assert.ok(await info.evaluate(element => element.scrollHeight <= element.clientHeight + 1), "Initial information is expanded without internal clipping");
    const checkActions = () => actions.locator("a, button").evaluateAll(buttons => buttons.map(button => {
      const rect = button.getBoundingClientRect();
      const headerBottom = document.querySelector("[data-site-header]").getBoundingClientRect().bottom;
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { top: rect.top, bottom: rect.bottom, inViewport: rect.top >= headerBottom && rect.bottom <= innerHeight, unobscured: button === hit || button.contains(hit) };
    }));
    if ([1024, 1366].includes(width)) await page.screenshot({ path: `${output}/${width}x${height}-expanded.png` });
    const initialArea = await actions.boundingBox();
    const trigger = Math.max(1, geometry.sidebar.y - geometry.headerBottom - geometry.gap, initialArea.y + initialArea.height - height + geometry.gap);
    geometry.dockAt = trigger;
    await page.evaluate(top => window.scrollTo({ top, behavior: "instant" }), Math.max(0, trigger - 2));
    await expect(sidebar).toHaveAttribute("data-docked", "false");
    await expect(gallery).toBeVisible();
    const before = await actions.boundingBox();
    await page.evaluate(top => window.scrollTo({ top, behavior: "instant" }), trigger + 2);
    await expect(sidebar).toHaveAttribute("data-docked", "true");
    await expect(gallery).toBeHidden();
    const pinnedActions = await checkActions();
    assert.equal(pinnedActions.length, 2);
    assert.ok(pinnedActions.every(button => button.inViewport && button.unobscured), "Both actions are visible and clickable after reaching the dock");
    assert.ok(Math.abs(pinnedActions[1].bottom - (height - geometry.gap)) < 2, "Actions dock at the viewport bottom");
    if (initialArea.y + initialArea.height > height - geometry.gap) {
      assert.ok(Math.abs(before.y + before.height - pinnedActions[1].bottom) < 4, "Actions do not jump when the gallery collapses");
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), geometry.pageHeight, "Docking preserves document geometry");
    const overflows = await info.evaluate(element => element.scrollHeight > element.clientHeight + 1);
    await expect(actions).toHaveAttribute("data-scroll-more", String(overflows));
    if (overflows) {
      await expect(info).toHaveAttribute("tabindex", "0");
      await expect(sidebar.locator("[data-template-detail-fade]")).toHaveCSS("opacity", "1");
    }
    await info.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(actions).toHaveAttribute("data-scroll-more", "false");
    await expect(sidebar.locator("[data-template-detail-fade]")).toHaveCSS("opacity", "0");
    const afterInfoScroll = await checkActions();
    assert.ok(afterInfoScroll.every((button, index) => button.inViewport && button.unobscured && Math.abs(button.top - pinnedActions[index].top) < 1), "Information scrolls independently while both actions stay fixed");
    await info.evaluate(element => { element.scrollTop = 0; });
    await page.evaluate(top => window.scrollTo({ top, behavior: "instant" }), trigger + 600);
    await expect(sidebar).toHaveAttribute("data-docked", "true");
    assert.ok((await checkActions()).every(button => button.inViewport && button.unobscured), "Both actions stay visible while the left column scrolls");
    if ([1024, 1366].includes(width)) await page.screenshot({ path: `${output}/${width}x${height}-docked.png` });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    const end = await actions.evaluate(element => ({ bottom: element.getBoundingClientRect().bottom, storyBottom: element.closest("aside").nextElementSibling.getBoundingClientRect().bottom }));
    assert.ok(end.bottom <= end.storyBottom + 1, "The dock stops with its column before the site footer");
    // Crossing the same boundary in both directions must restore the gallery
    // without moving the threshold when its rendered height changes.
    for (const offset of [-2, 2, -2]) {
      await page.evaluate(top => window.scrollTo({ top, behavior: "instant" }), Math.max(0, trigger + offset));
      await expect(sidebar).toHaveAttribute("data-docked", String(offset > 0));
    }
    await expect(gallery).toBeVisible();
    assert.equal(await info.evaluate(element => element.scrollTop), 0);
  } else {
    assert.ok(geometry.story.y >= geometry.sidebar.bottom, "Mobile shows template information before the story");
    assert.equal(geometry.sidebar.scroll, geometry.sidebar.client);
    await expect(sidebar.locator("[data-template-detail-fade]")).toHaveCSS("display", "none");
    const note = await sidebar.getByText(/첫 구독은 계정당|디스플레이는 현재/).boundingBox();
    const buttonArea = await actions.boundingBox();
    assert.ok(note.y >= buttonArea.y + buttonArea.height, "Mobile preserves the original actions-then-billing-note order");
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await expect(sidebar).toHaveAttribute("data-docked", "false");
    await expect(gallery).toBeVisible();
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(sidebar).toHaveAttribute("data-docked", "false");
  return geometry;
}

try {
  for (const [width, height] of [[320, 844], [390, 844], [430, 932], [640, 960], [768, 500], [768, 1024], [820, 1180], [1024, 400], [1024, 600], [1180, 820], [1280, 600], [1366, 600], [1440, 650], [1440, 900], [1920, 1080]]) {
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
      await expect(sidebar.getByRole("link", { name: "이 디자인으로 시작" })).toHaveAttribute("href", `/apply/display?template=${route}`);
    } else {
      const href = await sidebar.getByRole("link", { name: "이 디자인으로 시작" }).getAttribute("href");
      const url = new URL(href, base);
      assert.equal(url.pathname, "/apply/basic");
      assert.equal(url.searchParams.get("product"), `business_basic_${tier}_monthly`);
      assert.equal(url.searchParams.get("template"), route === "cafe_real_matcha_a" ? "cafe_design_a" : route === "cafe_sunday_roasters_a" ? "cafe_sunday_line_a" : route);
      await expect(sidebar).toContainText(tier === "multi" ? "8,800원" : "6,800원");
    }
    await page.setViewportSize({ width: 1024, height: 500 });
    await settle(page);
    await inspect(page, 1024, 500);
    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page);
    await inspect(page, 390, 844);
    results.push({ case: "catalog", route, tier, viewports: [[1440, 900], [1024, 500], [390, 844]] });
    await page.close();
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  await page.goto(`${base}/templates/cafe_real_matcha_a`, { waitUntil: "networkidle" });
  await settle(page);
  const sidebarInfo = page.getByRole("region", { name: "템플릿 상세 정보" });
  const footer = page.locator("[data-template-detail-actions]");
  const sidebar = page.getByRole("complementary", { name: "템플릿 정보 및 시작" });
  await page.setViewportSize({ width: 1024, height: 400 });
  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: "instant" }));
  await expect(sidebar).toHaveAttribute("data-docked", "true");
  await expect(footer).toHaveAttribute("data-scroll-more", "true");
  const dockedScroll = await page.evaluate(() => window.scrollY);
  await sidebarInfo.focus();
  await sidebarInfo.press("End");
  await expect(footer).toHaveAttribute("data-scroll-more", "false");
  assert.equal(await page.evaluate(() => window.scrollY), dockedScroll);
  await sidebarInfo.press("Home");
  await expect(footer).toHaveAttribute("data-scroll-more", "true");
  await expect.poll(() => sidebarInfo.evaluate(element => element.scrollTop)).toBe(0);
  await page.setViewportSize({ width: 1024, height: 1400 });
  await expect(footer).toHaveAttribute("data-scroll-more", "false");
  await page.setViewportSize({ width: 1024, height: 400 });
  await expect(footer).toHaveAttribute("data-scroll-more", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toHaveAttribute("data-docked", "false");
  await expect(sidebar.getByRole("region", { name: /디자인 갤러리/ })).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 400 });
  await inspect(page, 1024, 400);
  results.push({ case: "resize-and-keyboard", fade: "overflow, end, no-overflow, overflow restored", keyboard: "End/Home scroll only the docked information", mobile: "undocks and restores gallery" });
  await page.evaluate(() => { document.documentElement.style.fontSize = "125%"; });
  await inspect(page, 1024, 400);
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  results.push({ case: "enlarged-text", viewport: [1024, 400], rootFont: "125%", expandedAndDocked: "no clipping or covered actions" });
  const selectedImage = page.getByRole("button", { name: "오른쪽 디테일", exact: true });
  await selectedImage.click();
  await selectedImage.focus();
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
  await expect(sidebar).toHaveAttribute("data-docked", "true");
  await expect(sidebarInfo).toBeFocused();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(sidebar).toHaveAttribute("data-docked", "false");
  await expect(selectedImage).toBeVisible();
  await expect(selectedImage).toHaveAttribute("aria-pressed", "true");
  results.push({ case: "gallery-restoration", selection: "preserved", hiddenFocus: "moves to information without scrolling" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/templates`, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "고객지원 열기" })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
  await expect(page.getByRole("button", { name: "맨 위로 이동" })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
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
  await page.getByRole("button", { name: "템플릿 공유하기" }).click();
  await page.getByRole("button", { name: "링크 복사", exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `${base}/templates/cafe_real_matcha_a`);
  await page.keyboard.press("Escape");
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
