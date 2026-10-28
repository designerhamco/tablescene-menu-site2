import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

expect.configure({ timeout: 15_000 });

const baseUrl = process.env.SHAPED_TABS_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = process.env.SHAPED_TABS_QA_OUTPUT ?? "/tmp/artimenu-shaped-tabs-qa";
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const results = [];

async function assertUnderlineRail(list, { compact = false } = {}) {
  await expect(list).toHaveCSS("padding-left", "0px");
  await expect(list).toHaveCSS("padding-right", "0px");
  const geometry = await list.evaluate(element => {
    const first = element.firstElementChild?.getBoundingClientRect();
    const last = element.lastElementChild?.getBoundingClientRect();
    const rail = element.getBoundingClientRect();
    return first && last ? {
      firstInset: first.left - rail.left,
      lastInset: rail.right - last.right,
    } : null;
  });
  assert.ok(geometry, "underline tab list must contain tabs");
  assert.ok(Math.abs(geometry.firstInset) < .6, `rail starts ${geometry.firstInset}px before its first tab`);
  if (compact) assert.ok(Math.abs(geometry.lastInset) < .6, `compact rail ends ${geometry.lastInset}px after its last tab`);
}

try {
  for (const width of [375, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));

    await page.goto(`${baseUrl}/design-system#shaped-tabs`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    for (const label of ["디자인 시스템 메뉴"]) {
      await assertUnderlineRail(page.getByRole("tablist", { name: label }));
    }
    for (const label of ["서비스 탐색 예시", "템플릿 라이브러리 서비스"]) {
      const primaryList = page.getByRole("tablist", { name: label });
      await expect(primaryList).toHaveAttribute("data-hierarchy", "primary");
      await expect(primaryList).toHaveClass(/site-page-tabs/);
    }
    const stateTabs = page.getByRole("tablist", { name: "상태값 변경 예시" });
    await expect(stateTabs).toHaveAttribute("data-hierarchy", "state");
    await expect(stateTabs).toHaveClass(/site-tabs-outline/);
    await expect(stateTabs.getByRole("tab", { selected: true })).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(stateTabs.getByRole("tab", { selected: true })).toHaveCSS("border-top-width", "2px");
    const pageTabs = page.getByRole("tablist", { name: "서비스 탐색 예시" });
    await expect(pageTabs).toHaveCSS("border-top-left-radius", "8px");
    await expect(pageTabs.getByRole("tab", { selected: true })).toHaveCSS("border-top-left-radius", "0px");
    await expect(pageTabs.getByRole("tab", { selected: true })).toHaveCSS("background-color", "rgb(21, 24, 30)");
    const hierarchySection = page.locator("#selection-hierarchy-title").locator("xpath=../..");
    const hierarchy = page.getByRole("list", { name: "상위에서 하위로 이어지는 탭 위계" });
    const hierarchyTabs = hierarchy.locator('[data-slot="tabs"]');
    await expect(hierarchyTabs.nth(0)).toHaveAttribute("data-hierarchy", "primary");
    await expect(hierarchyTabs.nth(0).locator('[data-slot="tabs-list"]')).toHaveClass(/site-page-tabs/);
    await expect(hierarchyTabs.nth(1)).toHaveAttribute("data-hierarchy", "secondary");
    await expect(hierarchyTabs.nth(1).locator('[data-slot="tabs-list"]')).toHaveClass(/site-topic-tabs/);
    await expect(hierarchyTabs.nth(2)).toHaveAttribute("data-hierarchy", "embedded");
    await expect(hierarchyTabs.nth(2)).toHaveCSS("border-top-width", "0px");
    if (width >= 768) {
      const levelLefts = await hierarchy.locator("li").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().left));
      assert.ok(levelLefts.every((left, index) => index === 0 || left > levelLefts[index - 1]), `hierarchy does not step inward at ${width}px`);
    }
    const designSystemOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(designSystemOverflow, 0, `design system page overflow at ${width}px`);
    await hierarchySection.screenshot({ path: `${output}/hierarchy-${width}.png` });

    const section = page.locator("#shaped-tabs");
    await section.scrollIntoViewIfNeeded();

    const areaRoot = section.locator(".site-area-tabs-root").first();
    const areaList = areaRoot.locator(".site-area-tabs");
    const areaActive = areaList.getByRole("tab", { selected: true });
    await expect(areaRoot).toBeVisible();
    await expect(areaRoot).toHaveCSS("border-top-width", "0px");
    await expect(areaRoot).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(areaList).toHaveCSS("overflow-x", "auto");
    await expect(areaList).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(areaActive).toHaveCSS("font-weight", "600");
    await expect(areaActive).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(areaActive).toHaveCSS("border-top-width", "1px");
    await expect(areaActive).toHaveCSS("border-top-left-radius", "8px");
    await expect(areaActive).toHaveCSS("border-top-right-radius", "8px");
    await expect(areaActive).toHaveCSS("border-bottom-left-radius", "0px");
    await expect(areaList).toHaveCSS("column-gap", "0px");
    await expect(areaRoot.locator(".site-area-panel").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(areaRoot.locator(".site-area-panel").first()).toHaveCSS("border-left-width", "1px");
    await expect(areaRoot.locator(".site-area-panel").first()).toHaveCSS("border-right-width", "1px");
    await expect(areaRoot.locator(".site-area-panel").first()).toHaveCSS("border-bottom-width", "1px");
    assert.equal(await areaActive.evaluate(element => getComputedStyle(element, "::before").maskImage), "none");

    await areaActive.focus();
    await expect(areaActive).toHaveCSS("outline-width", "2px");
    await page.keyboard.press("ArrowRight");
    await expect(areaList.getByRole("tab", { selected: true })).toHaveText("기본 템플릿");
    await page.keyboard.press("ArrowRight");
    await expect(areaList.getByRole("tab", { selected: true })).toHaveText("디자인 템플릿");

    await section.screenshot({ path: `${output}/library-${width}.png` });

    await page.goto(`${baseUrl}/templates`, { waitUntil: "networkidle" });
    const serviceTabs = page.getByRole("tablist", { name: "서비스 및 페이지 유형 선택" });
    await expect(serviceTabs).toHaveAttribute("data-hierarchy", "primary");
    await expect(serviceTabs).toHaveClass(/site-page-tabs/);
    await expect(serviceTabs.getByRole("tab", { selected: true })).toHaveCSS("background-color", "rgb(21, 24, 30)");
    const catalogTabs = page.getByRole("tablist", { name: "템플릿 종류 선택" });
    await expect(catalogTabs).toHaveAttribute("data-hierarchy", "embedded");
    await expect(catalogTabs).toHaveClass(/site-area-tabs/);
    await expect(catalogTabs).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const catalogArea = catalogTabs.locator("xpath=..");
    await expect(catalogArea).toHaveClass(/site-area-tabs-root/);
    await expect(catalogArea).toHaveCSS("border-top-width", "0px");
    await expect(catalogArea).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(catalogArea.locator(".site-area-panel")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    assert.equal(await page.locator(".site-contained-tabs").count(), 0);
    assert.equal(await catalogTabs.getByRole("tab", { selected: true }).evaluate(element => getComputedStyle(element, "::before").maskImage), "none");
    await expect(catalogTabs.getByRole("tab", { selected: true })).toHaveText("디자인 템플릿");
    await expect(catalogTabs.getByRole("tab", { selected: true })).toHaveCSS("background-color", "rgb(255, 255, 255)");
    const catalogGeometry = await catalogArea.evaluate(element => {
      const root = element.getBoundingClientRect();
      const list = element.querySelector('[data-slot="tabs-list"]')?.getBoundingClientRect();
      return list ? { left: list.left - root.left, right: root.right - list.right } : null;
    });
    assert.ok(catalogGeometry, "catalog area tabs must have a tab list");
    assert.ok(Math.abs(catalogGeometry.left) < .6 && Math.abs(catalogGeometry.right) < .6, `catalog tab rule escapes its area at ${width}px`);
    const categoryButtons = page.getByRole("group", { name: "업종 선택" }).getByRole("button");
    await expect(categoryButtons.first().locator("svg")).toBeVisible();
    await expect(categoryButtons.first().locator(".site-choice-tile-icon")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    assert.equal(await categoryButtons.locator(".site-emoji-icon").count(), 0);
    await page.screenshot({ path: `${output}/templates-industries-${width}.png`, fullPage: true });
    await catalogTabs.getByRole("tab", { name: "기본 템플릿" }).focus();
    await page.keyboard.press("Enter");
    await expect(catalogTabs.getByRole("tab", { selected: true })).toHaveText("기본 템플릿");
    const catalogOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(catalogOverflow, 0, `template page overflow at ${width}px`);
    await page.screenshot({ path: `${output}/templates-${width}.png`, fullPage: true });

    await page.goto(`${baseUrl}/templates/cafe_real_matcha_a/preview?device=pc`, { waitUntil: "networkidle" });
    const previewGuide = page.getByRole("dialog", { name: "메뉴판 미리보기 사용 안내" });
    if (await previewGuide.isVisible()) await previewGuide.getByRole("button", { name: "닫기" }).click();
    const optionsToggle = page.locator("[data-preview-options-toggle]");
    await expect(optionsToggle).toBeVisible();
    if (await optionsToggle.getAttribute("aria-expanded") !== "true") await optionsToggle.click();
    await expect(optionsToggle).toHaveAttribute("aria-expanded", "true");
    const previewTabs = page.getByRole("tablist", { name: "미리보기 옵션 종류" });
    const previewArea = previewTabs.locator("xpath=..");
    await expect(previewTabs).toHaveAttribute("data-hierarchy", "embedded");
    await expect(previewTabs).toHaveClass(/site-area-tabs/);
    await expect(previewArea).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(previewArea.locator(".site-area-panel").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(previewTabs.getByRole("tab", { selected: true })).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.screenshot({ path: `${output}/preview-options-${width}.png`, fullPage: false });

    await page.goto(`${baseUrl}/guides`, { waitUntil: "networkidle" });
    await assertUnderlineRail(page.getByRole("tablist", { name: "플랜별 사용가이드" }), { compact: true });
    const guideOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(guideOverflow, 0, `guide page overflow at ${width}px`);

    await page.goto(`${baseUrl}/faq?tab=faq`, { waitUntil: "networkidle" });
    const supportTabs = page.getByRole("tablist", { name: "고객센터 메뉴" });
    await expect(supportTabs).toHaveAttribute("data-hierarchy", "secondary");
    await expect(supportTabs).toHaveClass(/site-topic-tabs/);
    await assertUnderlineRail(supportTabs);
    await expect(supportTabs.getByRole("tab", { selected: true })).toHaveCSS("border-bottom-color", "rgb(21, 24, 30)");
    await expect(supportTabs.getByRole("tab", { selected: true })).toHaveText("FAQ");
    await supportTabs.getByRole("tab", { name: "공지사항" }).focus();
    await page.keyboard.press("Enter");
    await expect(supportTabs.getByRole("tab", { selected: true })).toHaveText("공지사항");
    const supportOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(supportOverflow, 0, `support page overflow at ${width}px`);
    await page.screenshot({ path: `${output}/support-${width}.png`, fullPage: true });

    assert.deepEqual(errors, [], `browser errors at ${width}px`);
    results.push({ width, designSystemOverflow, catalogOverflow, guideOverflow, supportOverflow });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed: results.length, results }));
