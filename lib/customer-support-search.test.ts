import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const faqSource = readSource("../app/components/common/FAQ.tsx");
const inquirySectionSource = readSource("../components/mypage/InquirySection.tsx");
const mypageSource = readSource("../app/mypage/page.tsx");
const inquiryPageSource = readSource("../app/mypage/inquiries/page.tsx");

test("FAQ는 카테고리와 질문을 검색하고 빈 결과를 안내한다", () => {
  assert.match(faqSource, /type="search"/);
  assert.match(faqSource, /category\.category} \$\{item\.question/);
  assert.match(faqSource, /검색 결과가 없습니다/);
  assert.match(faqSource, /AI 상담을 이용해 주세요/);
  assert.doesNotMatch(faqSource, /whileInView/);
});

test("FAQ 문항은 스크롤 위치와 관계없이 즉시 표시한다", () => {
  assert.match(faqSource, /const FAQItem/);
  assert.doesNotMatch(faqSource, /viewport=\{\{ once: true \}\}/);
  assert.match(faqSource, /const FAQItem[\s\S]*?return \(\s*<div/);
});

test("문의 내역은 제목과 답변 상태를 두 진입 경로에서 동일하게 조회한다", () => {
  assert.match(inquirySectionSource, /name="inquiryQuery"/);
  assert.match(inquirySectionSource, /name="inquiryStatus"/);
  assert.match(inquirySectionSource, /조건에 맞는 문의가 없습니다/);

  for (const source of [mypageSource, inquiryPageSource]) {
    assert.match(source, /normalizeInquiryQuery/);
    assert.match(source, /normalizeInquiryStatus/);
    assert.match(source, /\.ilike\("title"/);
    assert.match(source, /\.eq\("status", activeInquiryStatus\)/);
  }
});
