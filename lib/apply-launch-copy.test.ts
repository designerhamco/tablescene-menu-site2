import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const applyPageSource = readFileSync(new URL("../app/apply/page.tsx", import.meta.url), "utf8");
const paidApplyPageSource = readFileSync(
  new URL("../app/apply/_components/PaidApplyPage.tsx", import.meta.url),
  "utf8",
);
const applyOrderFormSource = readFileSync(
  new URL("../components/apply/ApplyOrderForm.tsx", import.meta.url),
  "utf8",
);
const templateGallerySource = readFileSync(
  new URL("../components/apply/TemplateGallery.tsx", import.meta.url),
  "utf8",
);
const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const marketingSectionCopySource = readFileSync(
  new URL("../app/components/home/MarketingSectionCopy.tsx", import.meta.url),
  "utf8",
);

test("만들기 화면은 판매 가능한 템플릿을 서비스와 페이지 유형별로 탐색한다", () => {
  assert.match(applyPageSource, /TemplateGallery/);
  assert.match(templateGallerySource, /다이닝 원페이지/);
  assert.match(templateGallerySource, /다이닝 멀티페이지/);
  assert.match(templateGallerySource, /디스플레이/);
  assert.match(templateGallerySource, /getDiningTierLabel/);
  assert.match(templateGallerySource, /같은 페이지 유형의 템플릿을 언제든 교체/);
  assert.match(templateGallerySource, /const TEMPLATES_PER_PAGE = 8/);
  assert.match(templateGallerySource, /target="_blank"/);
  assert.match(templateGallerySource, /INDUSTRY_GROUPS\.map/);
  assert.match(templateGallerySource, /템플릿 준비 중/);
  assert.doesNotMatch(templateGallerySource, /visibleIndustryGroups/);
  assert.doesNotMatch(templateGallerySource, /다이닝 페이지 유형 선택/);
  assert.doesNotMatch(applyPageSource, /멀티페이지는 실제 디자인 템플릿 공개/);
  assert.doesNotMatch(paidApplyPageSource, /멀티페이지는 실제 디자인 템플릿 공개/);
});

test("일반 페이지 타이틀과 본문은 홈과 같은 디자인 시스템 규칙을 쓴다", () => {
  assert.match(applyPageSource, /site-page-title/);
  assert.match(applyPageSource, /site-body/);
  assert.match(marketingSectionCopySource, /site-section-title/);
  assert.match(globalStylesSource, /\.site-page-title,\s*\.site-section-title/);
  assert.match(globalStylesSource, /\.site-body-title/);
  assert.match(globalStylesSource, /\.site-body\s*\{/);
  assert.match(globalStylesSource, /\.site-body-support/);
  assert.match(globalStylesSource, /font-size: 3rem/);
  assert.match(applyPageSource, /템플릿을 미리 보고 원하는 디자인으로 메뉴판을 시작하고, 구독 중에는/);
  assert.doesNotMatch(applyPageSource, /text-emerald/);
});

test("사업자 인증 안내는 핵심 문장과 펼쳐보는 결제 안내로 정리한다", () => {
  assert.match(applyOrderFormSource, /결제·증빙 안내/);
  assert.match(applyOrderFormSource, /결제수단 등록 후 30일 무료체험이 시작/);
  assert.match(applyOrderFormSource, /선택한 결제 주기로 자동결제가 진행/);
  assert.doesNotMatch(applyOrderFormSource, /자동결제는 아직 준비 중이며/);
});
