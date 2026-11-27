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
  const desktop = await list.evaluate(() => innerWidth >= 1024);
  const size = await list.getAttribute("data-size");
  const large = size === "lg";
  await expect(list).toHaveAttribute("data-purpose", "page");
  await expect(list).toHaveClass(/site-page-tabs/);
  await expect(list).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(list).toHaveCSS("border-top-width", "0px");
  await expect(list).toHaveCSS("column-gap", large ? "20px" : "16px");
  const active = list.locator('[aria-selected="true"], [aria-current="page"]');
  await expect(active).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(active).toHaveCSS("border-top-left-radius", "0px");
  await expect(active).toHaveCSS("border-top-width", "0px");
  const indicator = await active.evaluate(element => {
    const style = getComputedStyle(element, "::after");
    return { height: style.height, bottom: style.bottom, color: style.backgroundColor };
  });
  assert.deepEqual(indicator, { height: "3px", bottom: "4px", color: "rgb(21, 24, 30)" });
  assert.ok((await active.boundingBox()).height >= (desktop ? 44 : large ? 40 : 36));
  await expect(active).toHaveCSS("color", "rgb(21, 24, 30)");
  await expect(active).toHaveCSS("font-size", desktop ? "18px" : large ? "16px" : "14px");
  await expect(active).toHaveCSS("font-weight", "600");
  await expect(active).toHaveCSS("flex-grow", "0");
  const inactive = list.locator('[role="tab"][aria-selected="false"]:not(:disabled):not([aria-disabled="true"])').first();
  await expect(inactive).toHaveCSS("font-weight", "500");
  await expect(inactive).toHaveCSS("color", "rgb(150, 150, 150)");
}
async function assertArea(root) {
  await expect(root).toHaveAttribute("data-purpose", "section");
  const list = root.locator('.site-area-tabs').first();
  const active = list.getByRole("tab", { selected: true });
  await expect(active).toHaveCSS("border-top-left-radius", "8px");
  await expect(active).toHaveCSS("border-bottom-left-radius", "8px");
  await expect(active).toHaveCSS("background-color", "rgb(21, 24, 30)");
  await expect(active).toHaveCSS("border-top-width", "1px");
  const desktop = await list.evaluate(() => innerWidth >= 1024);
  await expect(active).toHaveCSS("font-size", desktop && (await list.getAttribute("data-size")) !== "sm" ? "16px" : "14px");
  assert.ok((await active.boundingBox()).height >= (await list.getAttribute("data-size") === "sm" ? 40 : 44));
  const panel = root.locator(".site-area-panel:visible");
  if (await panel.count()) await expect(panel).toHaveCSS("border-bottom-width", "0px");
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
    await page.goto(`${baseUrl}/design-system`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    if (width < 768) {
      const notice = page.getByRole("dialog").filter({ hasText: "위치 편집은 PC에서 해 주세요" });
      await notice.getByRole("button", { name: "확인", exact: true }).click();
    }
    await assertPageTabs(page.getByRole("tablist", { name: "디자인 시스템 메뉴" }));
    const templatePattern = page.getByRole("region", { name: "템플릿 페이지 포함 관계 예시" });
    await templatePattern.getByRole("group", { name: "메뉴판 유형", exact: true }).getByRole("radio", { name: "베이직", exact: true }).click();
    await assertArea(templatePattern.locator('[data-slot="tabs"][data-purpose="section"]'));
    const patternFilter = templatePattern.getByRole("group", { name: "템플릿 구조 업종 필터" });
    await patternFilter.getByRole("button", { name: "레스토랑", exact: true }).press("Enter");
    await expect(templatePattern.getByRole("status")).toContainText("베이직 · 디자인 템플릿 · 레스토랑 결과");
    await templatePattern.getByRole("tab", { name: "기본 템플릿", exact: true }).click();
    await expect(templatePattern.getByRole("status")).toContainText("기본 템플릿 · 레스토랑 결과");
    const supportPattern = page.getByRole("region", { name: "고객센터 페이지 포함 관계 예시" });
    await expect(supportPattern.getByRole("tablist")).toHaveCount(0);
    await supportPattern.getByRole("button", { name: "고객센터 메뉴" }).press("ArrowDown");
    const supportLinks = page.getByRole("navigation", { name: "고객센터 하위 메뉴" });
    await expect(supportLinks.getByRole("link", { name: "공지사항", exact: true })).toHaveAttribute("href", "/faq/notices");
    await supportLinks.getByRole("link", { name: "자주 묻는 질문", exact: true }).press("Escape");
    const patternCategory = supportPattern.getByRole("group", { name: "고객센터 구조 주제 분류" });
    await assertCategory(patternCategory);
    await patternCategory.getByRole("button", { name: "이용 환경", exact: true }).press("Enter");
    await expect(supportPattern.getByRole("status")).toHaveText("FAQ · 이용 환경 목록");
    assert.equal(await supportPattern.locator('.site-area-tabs').count(), 0);
    const stateList = page.getByRole("tablist", { name: "상태값 변경 예시" });
    await expect(stateList).toHaveAttribute("data-purpose", "state");
    await expect(stateList).toHaveClass(/site-tabs-outline/);
    await stateList.getByRole("tab", { name: /^만료·보관/ }).click();
    await page.mouse.move(0, 0);
    const activeState = stateList.getByRole("tab", { selected: true });
    await expect(activeState).toHaveCSS("background-color", "rgb(21, 24, 30)");
    await expect(activeState).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(activeState).toHaveCSS("border-top-width", "0px");
    const activeCount = activeState.locator(".site-tab-count");
    await expect(activeCount).toHaveCSS("color", "rgb(219, 222, 227)");
    assert.ok(await activeState.evaluate(tab =>
      parseFloat(getComputedStyle(tab.querySelector(".site-tab-count")).fontSize) <
      parseFloat(getComputedStyle(tab).fontSize)
    ));
    const roleSection = page.locator('#selection-hierarchy-title').locator('xpath=../..');
    await roleSection.screenshot({ path: `${output}/roles-${width}.png` });
    const section = page.locator('#shaped-tabs');
    const orders = section.getByRole("tablist", { name: "주문 관리 화면 전환 예시" });
    await assertPageTabs(orders);
    await orders.getByRole("tab", { name: "현재 주문" }).press("End");
    await expect(orders.getByRole("tab", { selected: true })).toHaveText("주문 설정");
    const rooms = section.getByRole("tablist", { name: "문서형 룸 탭 예시" });
    await expect(rooms).toHaveClass(/site-document-tabs/);
    const addRoom = section.getByRole("button", { name: "룸 추가" });
    await expect(addRoom).toHaveCSS("width", "40px");
    assert.ok((await addRoom.boundingBox()).x < (await rooms.boundingBox()).x);
    await rooms.getByRole("tab", { name: "룸 1" }).press("ArrowRight");
    const selectedRoom = rooms.getByRole("tab", { name: "룸 2", selected: true });
    const roomTabBody = selectedRoom.locator("..");
    await expect(roomTabBody).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(roomTabBody).toHaveCSS("border-bottom-color", "rgb(255, 255, 255)");
    const roomPanel = section.getByRole("tabpanel", { name: "룸 2" });
    await expect(roomPanel).toContainText("룸 2의 배치를 편집하는 영역입니다.");
    await expect(roomPanel.locator("[data-room-tabs-surface]")).toHaveCSS("border-top-width", "0px");
    await expect.poll(() => roomTabBody.evaluate(tabBody => {
      const stack = tabBody.closest(".site-floor-room-tabs");
      const panel = stack.querySelector('[role="tabpanel"][data-state="active"]');
      return Math.round(tabBody.getBoundingClientRect().bottom - panel.getBoundingClientRect().top);
    })).toBe(0);
    const operationRoomLists = page.getByRole("tablist", { name: /^(매장 공간|주문 내역 룸)$/ });
    await expect(operationRoomLists).toHaveCount(4);
    for (const list of await operationRoomLists.all()) await expect(list).toHaveAttribute("data-variant", "document");
    const multiRoomLists = operationRoomLists.filter({ has: page.getByRole("tab", { name: /^테라스/ }) });
    await expect(multiRoomLists).toHaveCount(3);
    const gridAppearance = [];
    for (const list of await multiRoomLists.all()) {
      const activeRoom = list.getByRole("tab", { selected: true });
      await expect(activeRoom).toHaveCSS("font-size", "16px");
      await expect(activeRoom.locator("..")).toHaveCSS("border-bottom-color", "rgb(255, 255, 255)");
      const root = list.locator("xpath=ancestor::*[contains(@class,'site-floor-room-tabs')][1]");
      const panel = root.getByRole("tabpanel");
      await expect(panel.locator("[data-room-tabs-surface]")).toHaveCSS("border-top-width", "0px");
      const grid = panel.locator(".site-floor-canvas");
      await expect(grid).toHaveAttribute("data-floor-grid", "5");
      gridAppearance.push(await grid.evaluate(el => ({
        ratio: getComputedStyle(el).aspectRatio,
        dots: getComputedStyle(el, "::before").backgroundImage,
        tableRadius: getComputedStyle(el.querySelector('[data-point-kind="table"]')).borderRadius,
        kioskRadius: getComputedStyle(el.querySelector('[data-point-kind="kiosk"]')).borderRadius,
      })));
      const otherRoom = list.getByRole("tab", { name: /^테라스/ });
      await otherRoom.click();
      await expect(otherRoom).toHaveAttribute("aria-selected", "true");
      await expect(panel.getByRole("group", { name: /^테라스.*배치도$/ })).toBeVisible();
    }
    assert.deepEqual(gridAppearance[1], gridAppearance[0]);
    assert.deepEqual(gridAppearance[2], gridAppearance[0]);
    assert.equal(gridAppearance[0].tableRadius, "0px");
    assert.equal(gridAppearance[0].kioskRadius, "12px");
    if (width >= 768) assert.ok(gridAppearance[0].dots.startsWith("repeating-linear-gradient"));
    const designSystemOverflow = await noOverflow(page);
    await section.screenshot({ path: `${output}/library-${width}.png` });
    const notificationTabs = page.getByRole('tablist', { name: '알림 분류' });
    await expect(notificationTabs).toHaveAttribute('data-purpose', 'category');
    await expect(notificationTabs).toHaveClass(/site-topic-tabs/);
    await expect(notificationTabs).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await notificationTabs.getByRole('tab', { name: /읽지 않음/ }).click();
    await expect(notificationTabs.getByRole('tab', { selected: true })).toContainText('읽지 않음');
    await expect(notificationTabs.getByRole('tab', { selected: true })).toHaveCSS('border-bottom-color', 'rgb(21, 24, 30)');

    await page.goto(`${baseUrl}/templates`, { waitUntil: "load" });
    const serviceFilter = page.getByRole("group", { name: "메뉴판 유형", exact: true });
    await expect(serviceFilter.getByRole("radio", { name: "베이직", exact: true })).toHaveAttribute("aria-checked", "true");
    await serviceFilter.getByRole("radio", { name: "베이직", exact: true }).click();
    const catalogTabs = page.getByRole("tablist", { name: "템플릿 종류 선택" });
    await assertArea(catalogTabs.locator('xpath=ancestor::*[@data-slot="tabs"][1]'));
    await page.screenshot({ path: `${output}/templates-${width}.png`, fullPage: true });
    await expect(async () => {
      await catalogTabs.getByRole('tab', { name: '기본 템플릿' }).click();
      await expect(catalogTabs.getByRole('tab', { selected: true })).toHaveAccessibleName('기본 템플릿', { timeout: 1500 });
    }).toPass({ timeout: 15_000 });
    const catalogOverflow = await noOverflow(page);

    await page.goto(`${baseUrl}/templates/cafe_real_matcha_a`, { waitUntil: "load" });
    const detailActions = page.locator("[data-template-detail-actions]");
    const previewAction = detailActions.getByRole("link", { name: "미리보기", exact: true });
    const startAction = detailActions.getByRole("link", { name: "이 디자인으로 시작", exact: true });
    await expect(previewAction).toBeVisible();
    await expect(startAction).toBeVisible();
    const footerWidth = (await detailActions.boundingBox()).width;
    assert.equal((await previewAction.boundingBox()).width, footerWidth);
    assert.equal((await startAction.boundingBox()).width, footerWidth);

    await page.goto(`${baseUrl}/templates/cafe_real_matcha_a/preview?device=pc`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const guide = page.getByRole("dialog", { name: "메뉴판 미리보기 사용 안내" });
    if (await guide.isVisible()) await guide.getByRole("button", { name: "닫기" }).click();
    const toggle = page.locator('[data-preview-options-toggle]');
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const previewTabs = page.getByRole('tablist', { name: '미리보기 옵션 종류' });
    await assertArea(previewTabs.locator('xpath=ancestor::*[@data-slot="tabs"][1]'));
    await page.screenshot({ path: `${output}/preview-options-${width}.png` });

    await page.mouse.move(0, 0);
    await page.goto(`${baseUrl}/guides`, { waitUntil: "domcontentloaded" });
    await assertPageTabs(page.getByRole('tablist', { name: '플랜별 사용가이드' }));
    const guideOverflow = await noOverflow(page);
    await page.goto(`${baseUrl}/faq?tab=faq`, { waitUntil: "load" });
    await expect(page.getByRole('tablist', { name: '고객센터 메뉴' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '자주 묻는 질문', exact: true })).toBeVisible();
    const categories = page.getByRole('group', { name: '주제 선택' });
    await assertCategory(categories);
    await categories.getByRole('button', { name: '이용 환경', exact: true }).press('Enter');
    await expect(page.locator('[data-purpose="category"] [aria-pressed="true"]')).toHaveText('이용 환경');
    await assertCategory(categories);
    await expect(page.getByRole('region', { name: '자주 묻는 질문', exact: true }).getByRole('status')).toHaveText(/전체 \d+개/);
    await page.screenshot({ path: `${output}/support-${width}.png`, fullPage: true });
    await page.mouse.move(0, 0);
    await page.goto(`${baseUrl}/faq/notices`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/faq\/notices$/);
    const noticeTabs = page.getByRole('tablist', { name: '공지 유형' });
    await assertPageTabs(noticeTabs);
    await expect(noticeTabs.getByRole('tab', { name: '전체 공지', exact: true, selected: true })).toBeVisible();
    const supportOverflow = await noOverflow(page);
    assert.deepEqual(errors, [], `browser errors at ${width}px`);
    results.push({ width, designSystemOverflow, catalogOverflow, guideOverflow, supportOverflow });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ passed: results.length, results }));
