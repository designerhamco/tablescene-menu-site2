import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTemplateSwitchMutation,
  getSwitchableTemplatesForService,
  getSwitchableTemplatesForTemplate,
  getTemplateCommercialTier,
  getTemplateSwitchDecision,
} from "./template-switching";

test("사용 가능한 다이닝 템플릿을 페이지 등급에 맞는 교체 후보로 노출한다", () => {
  assert.deepEqual(
    getSwitchableTemplatesForService("basic").map((template) => template.key),
    [
      "cafe_design_a",
      "cafe_mocha_forest_a",
      "cafe_sunday_line_a",
      "cafe_round_focus_a",
      "dining_aube_table_a",
    ],
  );
});

test("멀티페이지와 디스플레이 기능 등급을 구분한다", () => {
  assert.equal(getTemplateCommercialTier("cafe_design_a"), "dining_single_page");
  assert.equal(getTemplateCommercialTier("dining_aube_table_a"), "dining_multi_page");
  assert.equal(getTemplateCommercialTier("display_menu_a"), "display_image");
});

test("현재 템플릿과 같은 페이지 등급의 교체 후보만 노출한다", () => {
  assert.deepEqual(
    getSwitchableTemplatesForTemplate("cafe_design_a").map((template) => template.key),
    [
      "cafe_design_a",
      "cafe_mocha_forest_a",
      "cafe_sunday_line_a",
      "cafe_round_focus_a",
    ],
  );
  assert.deepEqual(
    getSwitchableTemplatesForTemplate("dining_aube_table_a").map((template) => template.key),
    ["dining_aube_table_a"],
  );
});

test("같은 서비스의 출시 템플릿으로만 교체한다", () => {
  const allowed = getTemplateSwitchDecision("cafe_design_a", "cafe_sunday_line_a");
  assert.equal(allowed.allowed, true);

  const retired = getTemplateSwitchDecision("cafe_design_a", "cafe_noir_a");
  assert.equal(retired.allowed, false);
  if (!retired.allowed) assert.equal(retired.reason, "coming_soon");

  const crossService = getTemplateSwitchDecision("cafe_design_a", "display_menu_a");
  assert.deepEqual(crossService, {
    allowed: false,
    reason: "cross_service",
    message: "다이닝과 디스플레이 서비스 사이에서는 템플릿만 바꿀 수 없습니다.",
  });

  const crossTier = getTemplateSwitchDecision("cafe_design_a", "dining_aube_table_a");
  assert.deepEqual(crossTier, {
    allowed: false,
    reason: "cross_tier",
    message: "단일 페이지와 멀티페이지 상품 사이에서는 템플릿만 바꿀 수 없습니다.",
  });

  const comingSoon = getTemplateSwitchDecision("cafe_design_a", "cafe_design_b");
  assert.equal(comingSoon.allowed, false);
  if (!comingSoon.allowed) assert.equal(comingSoon.reason, "coming_soon");
});

test("템플릿별 디자인은 스냅샷으로 보존하고 공통 페이지 설정은 유지한다", () => {
  const firstSwitch = buildTemplateSwitchMutation({
    settings: {
      enabled_locales: ["ko", "en"],
      badge_styles: { best: { background_color: "#112233", text_color: "#FFFFFF" } },
    },
    pageSettings: {
      intro_enabled: true,
      design: { backgroundColor: "#112233", koreanFont: "pretendard" },
    },
    currentTemplateKey: "cafe_design_a",
    targetTemplateKey: "cafe_sunday_line_a",
    switchedAt: "2026-08-28T10:00:00.000Z",
    promotionsDisabled: 1,
    widgetsHidden: 2,
  });

  assert.equal(firstSwitch.pageSettings.intro_enabled, true);
  assert.equal("design" in firstSwitch.pageSettings, false);
  assert.deepEqual(
    (firstSwitch.settings.template_design_snapshots as Record<string, unknown>).cafe_design_a,
    {
      page_settings: { design: { backgroundColor: "#112233", koreanFont: "pretendard" } },
      badge_styles: { best: { background_color: "#112233", text_color: "#FFFFFF" } },
    },
  );
  assert.equal("badge_styles" in firstSwitch.settings, false);

  const returnSwitch = buildTemplateSwitchMutation({
    settings: firstSwitch.settings,
    pageSettings: {
      ...firstSwitch.pageSettings,
      design: { backgroundColor: "#FFFFFF", englishFont: "cutive-mono" },
    },
    currentTemplateKey: "cafe_sunday_line_a",
    targetTemplateKey: "cafe_design_a",
    switchedAt: "2026-08-28T11:00:00.000Z",
    promotionsDisabled: 0,
    widgetsHidden: 0,
  });

  assert.deepEqual(returnSwitch.pageSettings.design, {
    backgroundColor: "#112233",
    koreanFont: "pretendard",
  });
  assert.deepEqual((returnSwitch.settings as Record<string, unknown>).badge_styles, {
    best: { background_color: "#112233", text_color: "#FFFFFF" },
  });
  assert.equal(returnSwitch.pageSettings.intro_enabled, true);
});
