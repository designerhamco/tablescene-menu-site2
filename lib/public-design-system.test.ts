import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const navbarSource = readSource("../app/components/layout/Navbar.tsx");
const footerSource = readSource("../app/components/layout/Footer.tsx");
const termsSource = readSource("../app/terms/page.tsx");
const privacySource = readSource("../app/privacy/page.tsx");
const faqSource = readSource("../app/faq/page.tsx");
const pricingSource = readSource("../app/pricing/page.tsx");
const customSource = readSource("../app/custom/page.tsx");

test("공통 헤더와 푸터는 페이지와 같은 사이트 컨테이너 여백을 쓴다", () => {
  assert.match(navbarSource, /site-container relative flex h-full/);
  assert.match(footerSource, /site-container/);
});

test("주요 공개 페이지는 표준 페이지 타이틀을 사용한다", () => {
  for (const source of [termsSource, privacySource, faqSource, pricingSource, customSource]) {
    assert.match(source, /site-page-title/);
  }

  assert.doesNotMatch(termsSource, /text-5xl/);
  assert.doesNotMatch(privacySource, /text-5xl/);
});
