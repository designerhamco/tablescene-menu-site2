import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const base = process.env.COMPONENT_SCALE_QA_BASE_URL || "http://127.0.0.1:3039";
const browser = await chromium.launch();

async function verifyControl(control, height, font) {
  await expect(control).toBeVisible();
  await expect(control).toHaveCSS("height", `${height}px`);
  await expect(control).toHaveCSS("font-size", `${font}px`);
}

async function verifyFooter(page, width, font) {
  const footer = page.locator("#site-footer");
  const mobile = width < 768;
  if (mobile) {
    const guide = footer.locator("details").filter({ has: page.locator("summary", { hasText: "이용 안내" }) });
    const summary = guide.locator("summary");
    await expect(summary.locator("span")).toHaveCSS("font-size", `${font.control}px`);
    assert.equal((await summary.boundingBox()).height, 44);
    await summary.press("Enter");
    await verifyControl(guide.getByRole("link", { name: "자주 묻는 질문", exact: true }), 44, font.control);
    await verifyControl(guide.getByRole("link", { name: "1:1 문의", exact: true }), 44, font.control);
    await expect(guide.getByRole("link", { name: "마이 메뉴", exact: true })).toHaveCount(0);
    await footer.locator("summary", { hasText: "사업자 정보" }).press("Enter");
  } else {
    const nav = footer.getByRole("navigation", { name: "푸터 메뉴" });
    for (const name of ["서비스", "이용 안내", "고객지원"]) {
      await expect(nav.getByRole("heading", { name, exact: true })).toHaveCSS("font-size", `${font.primary}px`);
    }
    await verifyControl(nav.getByRole("link", { name: "베이직", exact: true }), 32, font.control);
    await verifyControl(nav.getByRole("link", { name: "마이 메뉴", exact: true }), 32, font.control);
    await verifyControl(nav.getByRole("link", { name: "1:1 문의하기", exact: true }), 44, font.control);
  }
  await verifyControl(footer.getByRole("link", { name: "010-3646-0642", exact: true }), mobile ? 44 : 32, font.control);
  await verifyControl(footer.getByRole("link", { name: "admin@dndcommerce.co.kr", exact: true }), mobile ? 44 : 32, font.control);
}

try {
  for (const [width, height, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false], [2560, 1080, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, reducedMotion: "reduce" });
    try {
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const scale = 1 + Math.min(1, Math.max(0, (width - 1600) / 1000)) * .125;
      const font = { control: +(14 * scale).toFixed(2), primary: +(16 * scale).toFixed(2) };

      async function open(path) {
        const response = await page.goto(base + path, { waitUntil: "domcontentloaded" });
        assert.ok(response?.ok(), path);
        await page.evaluate(() => document.fonts.ready);
        const viewport = await page.evaluate(() => [innerWidth, innerHeight, matchMedia("(pointer: coarse)").matches]);
        assert.deepEqual(viewport, [width, height, touch]);
      }

      await open("/design-system");
      if (width < 768) {
        const notice = page.getByRole("dialog").filter({ hasText: "위치 편집은 PC에서 해 주세요" });
        await notice.getByRole("button", { name: "확인", exact: true }).click();
      }
      const buttonExamples = page.locator('[aria-labelledby="control-states-title"]');
      await verifyControl(buttonExamples.getByRole("button", { name: "동작 확인", exact: true }), 44, font.control);
      await verifyControl(buttonExamples.getByRole("button", { name: "밀집 도구 32px", exact: true }), 32, font.control);
      await verifyControl(buttonExamples.getByRole("button", { name: "주요 완료 48px", exact: true }), 48, font.primary);
      await verifyControl(buttonExamples.getByRole("button", { name: "화면 주요 행동", exact: true }), 44, font.primary);
      await verifyControl(buttonExamples.getByRole("button", { name: "추가 도구", exact: true }), 40, font.control);
      const state = page.getByRole("tablist", { name: "상태값 변경 예시" });
      assert.equal((await state.boundingBox()).height, 44);
      await verifyControl(state.getByRole("tab", { selected: true }), 36, font.control);

      const native = page.locator('[aria-labelledby="select-contract-title"] select:enabled');
      const select = page.locator("#custom-select-demo");
      for (const control of [native, select]) {
        await verifyControl(control, 44, font.primary);
        await expect(control).toHaveCSS("padding-right", width < 768 ? "40px" : "36px");
      }
      await native.selectOption("draft");
      await expect(native).toHaveValue("draft");
      await expect(select.locator("svg")).toHaveCSS("width", "16px");
      await select.press("Enter");
      const option = page.getByRole("option", { name: "작성 중", exact: true });
      await verifyControl(option, touch ? 40 : 32, font.control);
      await page.keyboard.press("Escape");
      await expect(select).toBeFocused();

      await open("/sign-in");
      await verifyControl(page.getByRole("button", { name: "로그인", exact: true }), 48, font.primary);
      await open("/templates");
      await verifyControl(page.getByRole("group", { name: "메뉴판 유형", exact: true }).getByRole("radio", { checked: true }), touch ? 44 : 32, font.control);
      const catalogKind = page.getByRole("tablist", { name: "템플릿 종류 선택" }).getByRole("tab", { selected: true });
      assert.ok((await catalogKind.boundingBox()).height >= 44);
      const preview = page.getByRole("link", { name: /REAL MATCHA.*미리보기/ });
      await verifyControl(preview, 44, font.control);
      await expect(preview).toHaveAttribute("target", "_blank");
      await verifyFooter(page, width, font);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}×${height} (${touch ? "touch" : "mouse"}): buttons, tabs, selects, footer`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
