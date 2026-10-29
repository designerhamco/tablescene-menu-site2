import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

expect.configure({ timeout: 15_000 });
const baseUrl = process.env.SHAPED_TABS_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = process.env.SHAPED_TABS_QA_OUTPUT ?? "/tmp/artimenu-tab-roles-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];

async function assertPageTabs(list) {
  await expect(list).toHaveAttribute("data-purpose", "page");
  await expect(list).toHaveClass(/site-page-tabs/);
  await expect(list).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(list).toHaveCSS("border-top-width", "0px");
  await expect(list).toHaveCSS("column-gap", "24px");
  const active = list.locator('[aria-selected="true"], [aria-current="page"]');
  await expect(active).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(active).toHaveCSS("border-top-left-radius", "0px");
  await expect(active).toHaveCSS("border-top-width", "0px");
  await expect(active).toHaveCSS("border-bottom-width", "3px");
  await expect(active).toHaveCSS("border-bottom-color", "rgb(21, 24, 30)");
  await expect(active).toHaveCSS("color", "rgb(21, 24, 30)");
  await expect(active).toHaveCSS("font-size", "18px");
  await expect(active).toHaveCSS("font-weight", "600");
  await expect(active).toHaveCSS("flex-grow", "0");
  const inactive = list.locator('[role="tab"][aria-selected="false"]:not(:disabled):not([aria-disabled="true"])').first();
  await expect(inactive).toHaveCSS("font-weight", "500");
  await expect(inactive).toHaveCSS("color", "rgb(114, 114, 114)");
}
async function assertArea(root) {
  await expect(root).toHaveAttribute("data-purpose", "section");
  const list = root.locator('.site-area-tabs').first();
  const active = list.getByRole("tab", { selected: true });
  await expect(active).toHaveCSS("border-top-left-radius", "8px");
  await expect(active).toHaveCSS("border-bottom-left-radius", "0px");
  await expect(active).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(active).toHaveCSS("border-top-width", "1px");
  const panel = root.locator('.site-area-panel').first();
  await expect(panel).toHaveCSS("background-color", "rgb(255, 255, 255)");
  for (const edge of ["left", "right", "bottom"]) await expect(panel).toHaveCSS(`border-${edge}-width`, "0px");
  const bounds = await root.evaluate(element => {
    const parent = element.getBoundingClientRect();
    const rail = element.querySelector('.site-area-tabs').getBoundingClientRect();
    return { left: rail.left - parent.left, right: parent.right - rail.right };
  });
  assert.ok(Math.abs(bounds.left) < .6 && Math.abs(bounds.right) < .6, "area baseline must end inside its content width");
}
async function assertCategory(group) {
  await expect(group).toHaveAttribute("data-purpose", "category");
  await expect(group).toHaveClass(/site-topic-tabs/);
  await expect(group.locator('[aria-pressed="true"]')).toHaveCSS("border-bottom-color", "rgb(21, 24, 30)");
  assert.equal(await group.locator('.site-filter').count(), 0, "topic categories must not use boxed filter buttons");
}
async function noOverflow(page) {
  const difference = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.equal(difference, 0, `page overflow at ${page.url()}`);
  return difference;
}

try {
  for (const width of [375, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${baseUrl}/design-system`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await assertPageTabs(page.getByRole("tablist", { name: "디자인 시스템 메뉴" }));
    const templatePattern = page.getByRole("region", { name: "템플릿 페이지 포함 관계 예시" });
    await assertPageTabs(templatePattern.getByRole("tablist", { name: "템플릿 구조 주요 화면" }));
    await assertArea(templatePattern.locator('[data-slot="tabs"][data-purpose="section"]'));
    const patternFilter = templatePattern.getByRole("group", { name: "템플릿 구조 업종 필터" });
    await patternFilter.getByRole("button", { name: "레스토랑", exact: true }).click();
    await expect(templatePattern.getByRole("status")).toContainText("베이직 · 디자인 템플릿 · 레스토랑 결과");
    await templatePattern.getByRole("tab", { name: "기본 템플릿", exact: true }).click();
    await expect(templatePattern.getByRole("status")).toContainText("기본 템플릿 · 레스토랑 결과");
    const supportPattern = page.getByRole("region", { name: "고객센터 페이지 포함 관계 예시" });
    await expect(supportPattern.getByRole("tablist")).toHaveCount(0);
    await expect(supportPattern.getByRole("link", { name: "공지사항 전체보기" })).toHaveAttribute("href", "/faq/notices");
    const patternCategory = supportPattern.getByRole("group", { name: "고객센터 구조 주제 분류" });
    await assertCategory(patternCategory);
    await patternCategory.getByRole("button", { name: "이용 환경", exact: true }).click();
    await expect(supportPattern.getByRole("status")).toHaveText("FAQ · 이용 환경 목록");
    assert.equal(await supportPattern.locator('.site-area-tabs').count(), 0);
    const stateList = page.getByRole("tablist", { name: "상태값 변경 예시" });
    await expect(stateList).toHaveAttribute("data-purpose", "state");
    await expect(stateList).toHaveClass(/site-tabs-outline/);
    await stateList.getByRole("tab", { name: "보관 중", exact: true }).click();
    await page.mouse.move(0, 0);
    await expect(stateList.getByRole("tab", { selected: true })).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(stateList.getByRole("tab", { selected: true })).toHaveCSS("border-top-width", "2px");
    const roleSection = page.locator('#selection-hierarchy-title').locator('xpath=../..');
    await roleSection.screenshot({ path: `${output}/roles-${width}.png` });
    const section = page.locator('#shaped-tabs');
    const area = section.locator('[data-slot="tabs"][data-purpose="section"]').first();
    await assertArea(area);
    const areaList = area.getByRole("tablist");
    await areaList.getByRole("tab", { selected: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(areaList.getByRole("tab", { selected: true })).toHaveText("기본 템플릿");
    await page.keyboard.press("ArrowRight");
    await expect(areaList.getByRole("tab", { selected: true })).toHaveText("디자인 템플릿");
    const designSystemOverflow = await noOverflow(page);
    await section.screenshot({ path: `${output}/library-${width}.png` });
    const notificationTabs = page.getByRole('tablist', { name: '알림 분류' });
    await expect(notificationTabs).toHaveAttribute('data-purpose', 'category');
    await expect(notificationTabs).toHaveClass(/site-topic-tabs/);
    await expect(notificationTabs).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await notificationTabs.getByRole('tab', { name: /읽지 않음/ }).click();
    await expect(notificationTabs.getByRole('tab', { selected: true })).toContainText('읽지 않음');
    await expect(notificationTabs.getByRole('tab', { selected: true })).toHaveCSS('border-bottom-color', 'rgb(21, 24, 30)');

    await page.goto(`${baseUrl}/templates`, { waitUntil: "networkidle" });
    const serviceTabs = page.getByRole("tablist", { name: "서비스 및 페이지 유형 선택" });
    await assertPageTabs(serviceTabs);
    const catalogTabs = page.getByRole("tablist", { name: "템플릿 종류 선택" });
    await assertArea(catalogTabs.locator('xpath=..'));
    await expect(page.getByRole("group", { name: "업종 선택" }).getByRole('button').first().locator('svg')).toBeVisible();
    await page.screenshot({ path: `${output}/templates-${width}.png`, fullPage: true });
    await catalogTabs.getByRole('tab', { name: '기본 템플릿' }).click();
    await expect(catalogTabs.getByRole('tab', { selected: true })).toHaveText('기본 템플릿');
    const catalogOverflow = await noOverflow(page);

    await page.goto(`${baseUrl}/templates/cafe_real_matcha_a/preview?device=pc`, { waitUntil: "networkidle" });
    const guide = page.getByRole("dialog", { name: "메뉴판 미리보기 사용 안내" });
    if (await guide.isVisible()) await guide.getByRole("button", { name: "닫기" }).click();
    const toggle = page.locator('[data-preview-options-toggle]');
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    const previewTabs = page.getByRole('tablist', { name: '미리보기 옵션 종류' });
    await assertArea(previewTabs.locator('xpath=..'));
    await page.screenshot({ path: `${output}/preview-options-${width}.png` });

    await page.goto(`${baseUrl}/guides`, { waitUntil: "networkidle" });
    await assertPageTabs(page.getByRole('tablist', { name: '플랜별 사용가이드' }));
    const guideOverflow = await noOverflow(page);
    await page.goto(`${baseUrl}/faq?tab=faq`, { waitUntil: "networkidle" });
    await expect(page.getByRole('tablist', { name: '고객센터 메뉴' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '자주 묻는 질문', exact: true })).toBeVisible();
    const categories = page.getByRole('group', { name: '주제 선택' });
    await assertCategory(categories);
    await categories.getByRole('button', { name: '이용 환경', exact: true }).click();
    await expect(page.locator('[data-purpose="category"] [aria-pressed="true"]')).toHaveText('이용 환경');
    await assertCategory(categories);
    await expect(page.getByRole('region', { name: '자주 묻는 질문', exact: true }).getByRole('status')).toHaveText(/전체 \d+개/);
    await page.screenshot({ path: `${output}/support-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: '공지사항 전체보기' }).click();
    await expect(page).toHaveURL(/\/faq\/notices$/);
    await expect(categories.getByRole('button', { name: '전체', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const supportOverflow = await noOverflow(page);
    assert.deepEqual(errors, [], `browser errors at ${width}px`);
    results.push({ width, designSystemOverflow, catalogOverflow, guideOverflow, supportOverflow });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ passed: results.length, results }));
