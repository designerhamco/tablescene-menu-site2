import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const globalsSource = readSource("../app/globals.css");
const rootLayoutSource = readSource("../app/layout.tsx");
const navbarSource = readSource("../app/components/layout/Navbar.tsx");
const officialNavbarSource = readSource("../components/layout/OfficialSiteNavbar.tsx");
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
const mypageSource = readSource("../app/mypage/page.tsx");
const mypageLoadingSource = readSource("../app/mypage/loading.tsx");
const mypageErrorSource = readSource("../app/mypage/error.tsx");
const mypageInquirySource = readSource("../app/mypage/inquiries/page.tsx");
const mypageStaffSource = readSource("../app/mypage/staff/page.tsx");
const mypageNewMenuSource = readSource("../app/mypage/menus/new/page.tsx");
const mypageEditSource = readSource("../app/mypage/menus/[menuId]/edit/page.tsx");
const mypageQrSource = readSource("../app/mypage/menus/[menuId]/qr/page.tsx");
const mypageImportSource = readSource("../app/mypage/menus/[menuId]/import/page.tsx");
const mypageConvertSource = readSource("../app/mypage/menus/[menuId]/convert/page.tsx");
const mypagePreviewSource = readSource("../app/mypage/menus/[menuId]/preview/page.tsx");
const displayProductStorySource = readSource("../app/components/display/DisplayProductStory.tsx");
const templateShowcaseSource = readSource("../app/components/home/TemplateShowcase.tsx");
const operationPageSources = [
  "calls",
  "orders",
  "pickup",
  "sales",
  "tables",
].map((section) => readSource(`../app/mypage/menus/[menuId]/${section}/page.tsx`));
const storeOperationsShellSource = readSource("../components/mypage/StoreOperationsShell.tsx");

test("공통 헤더와 푸터는 페이지와 같은 사이트 컨테이너 여백을 쓴다", () => {
  assert.match(navbarSource, /site-container relative flex h-full/);
  assert.match(footerSource, /site-container/);
  assert.match(faqComponentSource, /<div className="site-container">/);
  assert.doesNotMatch(faqComponentSource, /md:max-w-6xl/);
  assert.match(faqSource, /<section className="site-container pb-24">/);
});

test("넓은 화면의 페이지 여백은 헤더와 같은 최대 폭 기준을 계산한다", () => {
  assert.match(globalsSource, /\.site-gutter\s*\{[\s\S]*padding-inline:\s*max\(/);
  assert.match(globalsSource, /calc\(\(100vw - var\(--site-content-max\)\) \/ 2 \+ var\(--site-gutter\)\)/);
});

test("공통 헤더는 Next 링크만 사용해 페이지 본문을 한 번에 전환한다", () => {
  assert.match(navbarSource, /from 'next\/link'/);
  assert.match(navbarSource, /usePathname/);
  assert.doesNotMatch(navbarSource, /from 'react-router'/);
  assert.doesNotMatch(officialNavbarSource, /BrowserRouter|ReloadNextRouteOnNavigate|router\.replace/);
  assert.match(rootLayoutSource, /data-scroll-behavior="smooth"/);
});

test("마이페이지와 주요 서브페이지는 같은 사이트 여백 계약을 사용한다", () => {
  for (const source of [
    mypageSource,
    mypageLoadingSource,
    mypageErrorSource,
    mypageInquirySource,
    mypageStaffSource,
    mypageNewMenuSource,
    mypageEditSource,
    mypageQrSource,
    mypageImportSource,
    mypageConvertSource,
    mypagePreviewSource,
    storeOperationsShellSource,
  ]) {
    assert.match(source, /site-gutter/);
  }

  for (const source of operationPageSources) {
    assert.match(source, /StoreOperationsShell/);
  }

  assert.match(mypageStaffSource, /<OfficialSiteNavbar \/>/);
  assert.match(mypageStaffSource, /<Footer \/>/);
});

test("전역 여백은 최대 폭 요소 안에 중복 적용하지 않는다", () => {
  assert.doesNotMatch(mypageNewMenuSource, /site-gutter[^"\n]*max-w/);
  assert.match(mypageNewMenuSource, /site-gutter w-full/);
  assert.match(mypageNewMenuSource, /mx-auto w-full max-w-7xl/);
  assert.doesNotMatch(displayProductStorySource, /site-gutter[^"\n]*max-w/);
  assert.match(displayProductStorySource, /site-container absolute/);
  assert.doesNotMatch(templateShowcaseSource, /site-gutter[^"\n]*max-w/);
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
