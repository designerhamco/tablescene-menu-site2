import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSiteChipTone } from "./site-chip";

test("site chips distinguish draft/private/paid while sharing green for public and active", () => {
  assert.notEqual(getSiteChipTone("작성 중"), getSiteChipTone("비공개"));
  assert.equal(getSiteChipTone("공개 중"), getSiteChipTone("이용 중"));
  assert.notEqual(getSiteChipTone("결제 완료"), getSiteChipTone("이용 중"));
  assert.equal(getSiteChipTone("사장"), "role");
  assert.equal(getSiteChipTone("직원"), "role");
  assert.equal(getSiteChipTone("무료체험 중"), "trial");
  assert.equal(getSiteChipTone("published"), getSiteChipTone("공개 중"));
  assert.equal(getSiteChipTone("draft"), getSiteChipTone("작성 중"));
});

test("inactive and unpaid states are not misclassified as active or a failed payment", () => {
  assert.notEqual(getSiteChipTone("비활성"), "active");
  assert.equal(getSiteChipTone("미결제"), "pending");
  assert.equal(getSiteChipTone("결제 실패"), "error");
  assert.notEqual(getSiteChipTone("관리자 보관"), "role");
  assert.equal(getSiteChipTone("복구 가능 기간 종료"), "error");
  assert.equal(getSiteChipTone("constructor"), "neutral");
});

test("filled site chip tokens preserve at least AA contrast against white text", () => {
  const css = readFileSync(new URL("../styles/ui-system.css", import.meta.url), "utf8");
  const luminance = (hex: string) => {
    const rgb = hex.match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
  };
  const colors = [...css.matchAll(/--ui-chip-[a-z]+:\s*#([0-9a-f]{6})/g)];
  assert.ok(colors.length >= 12);
  for (const [, color] of colors) assert.ok(1.05 / (luminance(color) + .05) >= 4.5, color);
});
