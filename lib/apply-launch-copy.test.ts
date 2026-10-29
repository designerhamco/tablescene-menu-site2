import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const applyPageSource = readFileSync(new URL("../app/apply/page.tsx", import.meta.url), "utf8");
const templatesPageSource = readFileSync(new URL("../app/templates/page.tsx", import.meta.url), "utf8");
const applyOrderFormSource = readFileSync(
  new URL("../components/apply/ApplyOrderForm.tsx", import.meta.url),
  "utf8",
);
const templateGallerySource = readFileSync(
  new URL("../components/apply/TemplateGallery.tsx", import.meta.url),
  "utf8",
);
const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const typographyStylesSource = readFileSync(new URL("../styles/typography.css", import.meta.url), "utf8");
const marketingSectionCopySource = readFileSync(
  new URL("../app/components/home/MarketingSectionCopy.tsx", import.meta.url),
  "utf8",
);

test("만들기와 디자인 템플릿 목록은 서로 다른 진입 화면을 사용한다", () => {
  assert.doesNotMatch(applyPageSource, /TemplateGallery/);
  assert.match(applyPageSource, /어떤 메뉴판을 만들까요/);
  assert.match(templatesPageSource, /TemplateGallery/);
  for (const label of ["베이직", "다이닝", "디스플레이", "기본 템플릿", "디자인 템플릿"]) assert.ok(templateGallerySource.includes(label));
  assert.match(templateGallerySource, /filterCatalogDesigns/);
  assert.doesNotMatch(templateGallerySource, /얼리버드 월|정상가/);
  assert.match(templateGallerySource, /const TEMPLATES_PER_PAGE = 6/);
  assert.match(templateGallerySource, /aria-label="템플릿 종류 선택"/);
  assert.match(templateGallerySource, /CatalogDesignCard/);
  assert.doesNotMatch(templateGallerySource, /템플릿 1개별 월 구독/);
});

test("일반 페이지 타이틀과 본문은 홈과 같은 디자인 시스템 규칙을 쓴다", () => {
  assert.match(applyPageSource, /SitePageHeader|type-page-title/);
  assert.match(applyPageSource, /site-body/);
  assert.match(marketingSectionCopySource, /type-section-title/);
  assert.match(globalStylesSource, /styles\/typography\.css/);
  assert.match(typographyStylesSource, /\.type-page-title/);
  assert.match(typographyStylesSource, /\.type-section-title/);
  assert.match(typographyStylesSource, /\.type-body-lg/);
  assert.match(typographyStylesSource, /\.type-body-sm/);
  assert.match(typographyStylesSource, /--type-page-title-size:/);
  assert.match(applyPageSource, /필요한 메뉴판 유형을 선택/);
  assert.doesNotMatch(applyPageSource, /text-emerald/);
});

test("사업자 인증 안내는 핵심 문장과 펼쳐보는 결제 안내로 정리한다", () => {
  assert.match(applyOrderFormSource, /결제·증빙 안내/);
  assert.match(applyOrderFormSource, /결제수단 등록 후 30일 무료체험이 시작/);
  assert.match(applyOrderFormSource, /확인 완료 후 매월 자동결제가 진행/);
  assert.doesNotMatch(applyOrderFormSource, /자동결제는 아직 준비 중이며/);
});
