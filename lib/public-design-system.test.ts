import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const navbarSource = readSource("../app/components/layout/Navbar.tsx");
const footerSource = readSource("../app/components/layout/Footer.tsx");
const termsSource = readSource("../app/terms/page.tsx");
const privacySource = readSource("../app/privacy/page.tsx");
const faqSource = readSource("../app/faq/page.tsx");
const faqComponentSource = readSource("../app/components/common/FAQ.tsx");
const homeProductStorySource = readSource("../app/components/home/HomeProductStory.tsx");
const applySource = readSource("../app/apply/page.tsx");
const templateGallerySource = readSource("../components/apply/TemplateGallery.tsx");
const pricingSource = readSource("../app/pricing/page.tsx");
const customSource = readSource("../app/custom/page.tsx");

test("공통 헤더와 푸터는 페이지와 같은 사이트 컨테이너 여백을 쓴다", () => {
  assert.match(navbarSource, /site-container relative flex h-full/);
  assert.match(footerSource, /site-container/);
  assert.match(faqComponentSource, /<div className="site-container">/);
  assert.doesNotMatch(faqComponentSource, /md:max-w-6xl/);
  assert.match(faqSource, /<section className="site-container pb-24">/);
});

test("공개 페이지의 검정 CTA는 홈과 같은 표면 규칙을 공유한다", () => {
  assert.match(homeProductStorySource, /className="site-dark-cta/);
  assert.match(faqSource, /className="site-dark-cta/);
  assert.match(applySource, /className="site-dark-cta/);
});

test("만들기 템플릿 썸네일은 하나의 24px 라운드 외곽선만 사용한다", () => {
  assert.match(templateGallerySource, /rounded-\[1\.5rem\].*ring-1 ring-inset/);
  assert.doesNotMatch(templateGallerySource, /rounded-2xl border border-zinc-200 bg-zinc-100/);
});

test("주요 공개 페이지는 표준 페이지 타이틀을 사용한다", () => {
  for (const source of [termsSource, privacySource, faqSource, pricingSource, customSource]) {
    assert.match(source, /site-page-title/);
  }

  assert.doesNotMatch(termsSource, /text-5xl/);
  assert.doesNotMatch(privacySource, /text-5xl/);
});
