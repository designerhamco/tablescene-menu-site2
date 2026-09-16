import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../scripts/qa-public-surfaces.mjs", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  scripts?: Record<string, string>;
};

test("공개 화면 회귀 QA는 핵심 페이지와 모든 판매 템플릿을 PC·모바일에서 검사한다", () => {
  for (const route of [
    '"/apply"',
    '"/faq"',
    '"/sign-in"',
    '"/templates/cafe_design_a/preview"',
    '"/templates/cafe_mocha_forest_a/preview"',
    '"/templates/cafe_sunday_line_a/preview"',
    '"/templates/cafe_round_focus_a/preview"',
    '"/templates/dining_aube_table_a/preview"',
    '"/templates/dining_aube_table_b/preview"',
    '"/templates/display_menu_a/preview?page=3"',
  ]) {
    assert.match(source, new RegExp(route.replace(/[/?]/g, "\\$&")));
  }

  assert.match(source, /key: "desktop", width: 1440, height: 900/);
  assert.match(source, /key: "mobile", width: 390, height: 844/);
  assert.match(source, /PUBLIC_SURFACE_QA_ROUTE/);
  assert.match(source, /reducedMotion: "reduce"/);
  assert.match(source, /serviceWorkers: "block"/);
  assert.equal(packageJson.scripts?.["qa:public-surfaces"], "node scripts/qa-public-surfaces.mjs");
});

test("공개 화면 회귀 QA는 HTTP·콘솔·페이지·overflow·이미지 실패를 차단한다", () => {
  assert.match(source, /responseStatus >= 400/);
  assert.match(source, /waitUntil: "domcontentloaded"/);
  assert.match(source, /waitForLoadState\("networkidle", \{ timeout: Math\.min\(navigationTimeout, 5_000\) \}\)\.catch/);
  assert.match(source, /waitForFunction\(\(\) => document\.body\?\.innerText\.trim\(\)\.length >= 10/);
  assert.match(source, /horizontalOverflow > 2/);
  assert.match(source, /naturalWidth === 0/);
  assert.match(source, /message\.type\(\) === "error"/);
  assert.match(source, /page\.on\("pageerror"/);
  assert.match(source, /page\.on\("requestfailed"/);
  assert.match(source, /Failed to load resource: net::ERR_CACHE_WRITE_FAILURE/);
  assert.match(source, /values: \["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"\]/);
  assert.match(source, /violation\.impact === "critical" \|\| violation\.impact === "serious"/);
  assert.match(source, /accessibility \$\{violation\.impact\}/);
  assert.match(source, /isPrefetch \|\| isDevReload/);
  assert.match(source, /if \(failed\.length > 0\) process\.exitCode = 1/);
});

test("공개 화면 회귀 QA는 메뉴판 미리보기 도움말의 최초 노출과 두 종료 방식을 검사한다", () => {
  assert.match(source, /getByRole\("dialog", \{ name: "메뉴판 미리보기 사용 안내" \}\)/);
  assert.match(source, /getByRole\("button", \{ name: "닫기", exact: true \}\)/);
  assert.match(source, /getByRole\("checkbox", \{ name: "오늘 하루 보지 않기" \}\)/);
  assert.match(source, /await hideTodayCheckbox\.check\(\);/);
  assert.match(source, /await closeButton\.click\(\);/);
  assert.match(source, /preview guide reopens during the dismissed browser session/);
  assert.match(source, /preview guide reopens after checking hide for today and closing/);
  assert.match(source, /route === "\/templates\/cafe_sunday_line_a\/preview"/);
  assert.match(source, /inspectDisplayPreviewControls/);
  assert.match(source, /data-display-preview-controls-visible/);
  assert.match(source, /page\.mouse\.move\(viewport\.width \/ 2, viewport\.height - 4\)/);
  assert.match(source, /display preview controls do not hide after leaving the bottom edge/);
});

test("공개 화면 회귀 QA는 원페이지 배치 안정화와 실제 DOM 잘림을 검사한다", () => {
  assert.match(source, /inspectCafeFitPresentation/);
  assert.match(source, /data-fit-presentation-state/);
  assert.match(source, /presentationState !== "ready"/);
  assert.match(source, /fitOverflow === "true"/);
  assert.match(source, /clippedCount/);
  assert.match(source, /menuElement\.scrollHeight > menuElement\.clientHeight \+ 1/);
  assert.match(source, /cafe fit: \$\{message\}/);
});
