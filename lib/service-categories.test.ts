import assert from "node:assert/strict";
import test from "node:test";
import { getServiceCategory, getServiceCategoryLabel } from "./service-categories";
import { catalogDesigns } from "./catalog-designs";
import { getPublicTemplateDetail, getTemplateDetailInfo } from "./template-details";

test("구독 상품은 저장된 키를 유지하면서 월·연 주기 모두 세 서비스로 구분한다", () => {
  for (const cycle of ["monthly", "yearly"]) {
    assert.equal(getServiceCategory({ productKey: `business_basic_single_${cycle}` }), "basic");
    assert.equal(getServiceCategory({ productKey: `business_basic_multi_${cycle}` }), "dining");
    assert.equal(getServiceCategory({ productKey: `business_display_${cycle}` }), "display");
  }
  assert.equal(getServiceCategory({ productKey: "business_basic_multi_monthly", templateKey: "cafe_design_a" }), "dining");
});

test("이전 통합 구독과 상품키 없는 메뉴판은 실제 템플릿으로 서비스를 판별한다", () => {
  for (const productKey of [undefined, "business_basic_monthly", "business_basic_yearly"]) {
    assert.equal(getServiceCategory({ productKey, templateKey: "cafe_design_a" }), "basic");
    assert.equal(getServiceCategory({ productKey, templateKey: "dining_aube_table_a" }), "dining");
    assert.equal(getServiceCategory({ productKey, templateKey: "dining_aube_table_b" }), "dining");
    assert.equal(getServiceCategory({ productKey, templateKey: "display_menu_a" }), "display");
  }
  assert.equal(getServiceCategory({ productKey: "personal_trial_basic_1month" }), "basic");
  assert.equal(getServiceCategory({ planType: "business_display" }), "display");
  assert.equal(getServiceCategory({ planType: "business_basic" }), null);
  assert.equal(getServiceCategory({ productKey: "ai_credit_pack_small" }), null);
  assert.equal(getServiceCategory({ productKey: "toString", templateKey: "unknown" }), null);
});

test("모든 상세의 서비스·이용권 표시가 카탈로그와 일치하고 결제 진입을 보존한다", () => {
  for (const design of catalogDesigns) {
    const template = getPublicTemplateDetail(design.id);
    assert.ok(template, design.id);
    const info = getTemplateDetailInfo(template);
    const label = getServiceCategoryLabel(design.service);
    assert.equal(info.serviceLabel, label, design.id);
    assert.equal(info.formatLabel, `${label} ${design.kind === "standard" ? "기본 디자인" : "디자인 포함"}`, design.id);
    assert.equal(info.startHref, design.startHref, design.id);
    assert.equal(info.previewHref, design.previewHref, design.id);
  }
});
