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
  assert.equal(packageJson.scripts?.["qa:public-surfaces"], "node scripts/qa-public-surfaces.mjs");
});

test("공개 화면 회귀 QA는 HTTP·콘솔·페이지·overflow·이미지 실패를 차단한다", () => {
  assert.match(source, /responseStatus >= 400/);
  assert.match(source, /horizontalOverflow > 2/);
  assert.match(source, /naturalWidth === 0/);
  assert.match(source, /message\.type\(\) === "error"/);
  assert.match(source, /page\.on\("pageerror"/);
  assert.match(source, /page\.on\("requestfailed"/);
  assert.match(source, /errorText === "net::ERR_ABORTED" && new URL\(request\.url\(\)\)\.searchParams\.has\("_rsc"\)/);
  assert.match(source, /if \(failed\.length > 0\) process\.exitCode = 1/);
});
