import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const css = read("styles/ui-system.css");
const tabCss = read("styles/site-design.css");

test("ordinary action geometry is shared and icon / quick-menu shapes are explicit", () => {
  const button = read("app/components/ui/button.tsx");
  assert.match(button, /pill: "site-button-pill"/);
  assert.doesNotMatch(button, /\b(?:sm|xl):|shape: \{[\s\S]*?(?:rounded|square)/);
  assert.match(css, /\.site-button \{[^}]*min-height: var\(--ui-control-height-md\);[^}]*border-radius: var\(--ui-radius-control-rounded\);/);
  assert.match(css, /--ui-control-height-compact: 2rem/);
  assert.match(css, /--ui-control-height-md: 2\.5rem/);
  assert.match(css, /--ui-control-height-header: 2\.75rem/);
  assert.match(css, /--ui-control-height-lg: 3rem/);
  assert.doesNotMatch(css, /--ui-control-height-(?:sm|xl):/);
  assert.match(css, /--ui-button-font-weight: 600/);
  assert.match(css, /\.site-button \{[^}]*font-size: var\(--site-type-15\);[^}]*font-weight: var\(--ui-button-font-weight\);/);
  assert.match(css, /\.site-button\.site-button-icon \{ border-radius: 50%;/);
  const launcher = read("app/support/chat/AiSupportChatLauncher.tsx");
  assert.match(launcher, /site-button site-button-ai/);
  assert.match(launcher, /SupportChatIcon/);
  assert.doesNotMatch(launcher, /href="\/guides"|site-button-pill/);
});

test("shared state previews exercise the real guarded hover / pressed / focus selectors", () => {
  for (const variant of ["primary", "outline", "secondary", "ghost", "danger", "outline-danger", "danger-ghost", "ai", "link", "kakao"]) {
    for (const state of ["hover", "pressed"]) {
      const selector = new RegExp(`\\.site-button-${variant}:is\\(:${state === "hover" ? "hover" : "active"}, \\[data-ui-state="${state}"\\]\\):not\\(:disabled\\):not\\(\\[aria-disabled="true"\\]\\)`);
      assert.match(css, selector, `${variant} ${state} must not override disabled appearance`);
    }
  }
  assert.match(css, /\.site-button:is\(:focus-visible, \[data-ui-state="focus"\]\)/);
  const gallery = read("components/design-system/ControlStateExamples.tsx");
  assert.match(gallery, /<Button variant=\{variant\}/);
  assert.match(gallery, /disabled=\{state === "disabled"\}/);
  assert.doesNotMatch(gallery, /backgroundColor:|borderRadius:/);
  assert.match(css, /\.site-button:disabled,[\s\S]*?border-color: transparent;[\s\S]*?background: var\(--ui-disabled-surface\);[\s\S]*?color: var\(--ui-disabled-text\);[\s\S]*?opacity: 1;/);
  assert.match(css, /\.site-button-ghost:disabled,[\s\S]*?background: transparent;[\s\S]*?color: var\(--ui-disabled-text\);[\s\S]*?opacity: 1;/);
});

test("site pages cannot override shared action padding, shape, typography or disabled colors", () => {
  const failures: string[] = [];
  const deprecated: string[] = [];
  const excluded = /^(?:components\/(?:menu-templates|public-menu)\/|app\/qa\/)/;
  function walk(dir: string) {
    for (const entry of readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`;
      if (excluded.test(file)) continue;
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".tsx")) {
        const source = read(file);
        if (
          /site-button-(?:sm|xl|rounded|square)\b/.test(source) ||
          /\b(?:size="xl"|shape="(?:rounded|square)")/.test(source) ||
          /\b(?:size:\s*["']xl["']|shape:\s*["'](?:rounded|square)["'])/.test(source)
        ) deprecated.push(file);
        for (const match of source.matchAll(/"([^"\n]*\bsite-button\b[^"\n]*)"|'([^'\n]*\bsite-button\b[^'\n]*)'|`([^`\n]*\bsite-button\b[^`\n]*)`/g)) {
          const literal = match[1] ?? match[2] ?? match[3];
          const privateTokens = literal.split(/\s+/).filter(token => /^(?:(?:sm|md|lg|xl):)?(?:p[xy]?-[\d.]+|gap-[\d.]+|rounded-\S+|text-(?:xs|sm|base|lg|\[[^\]]+\]))$|^(?:disabled|focus-visible):/.test(token));
          if (privateTokens.length) failures.push(`${file}: ${privateTokens.join(" ")}`);
        }
      } else if (file.endsWith(".css")) {
        const source = read(file);
        if (/--ui-(?:control-height-(?:sm|xl)|control-padding-inline-xl|radius-control-square)\b|\.site-button-(?:sm|xl|rounded|square)\b/.test(source)) {
          deprecated.push(file);
        }
      }
    }
  }
  walk("app"); walk("components"); walk("styles");
  assert.deepEqual(failures, []);
  assert.deepEqual(deprecated, []);
});

test("tab purpose maps main views, independent sections, categories and states to shared roles", () => {
  assert.doesNotMatch(read("components/support/SupportCenter.tsx"), /<Tabs|고객센터 메뉴/);
  assert.match(read("components/support/SupportCenter.tsx"), /<CategoryFilter/);
  const preview = read("components/menu/MenuPreviewOptionsPanel.tsx");
  assert.match(preview, /<Tabs purpose="section"/);
  for (const value of ["features", "design"]) {
    assert.match(preview, new RegExp(`id="preview-${value}-tab" aria-controls="preview-${value}-panel"`));
    assert.match(preview, new RegExp(`id="preview-${value}-panel" aria-labelledby="preview-${value}-tab"`));
  }
  assert.match(read("components/guides/UsageGuidePage.tsx"), /purpose="page"/);
  assert.match(tabCss, /--site-tab-indicator-width: \.25rem/);
  for (const cls of ["site-tab", "site-topic-tab", "site-area-tab"]) {
    assert.match(tabCss, new RegExp(`\\.${cls}:is\\(:focus-visible, \\[data-ui-state="focus"\\]\\)`));
  }
  assert.match(tabCss, /\.site-area-tabs-root\[data-slot="tabs"\] \{[^}]*border: 0;[^}]*background: transparent/);
  assert.match(tabCss, /\.site-area-tabs::after \{[^}]*height: 1px;[^}]*background: var\(--ui-text\)/);
  assert.match(tabCss, /\.site-area-tab:is\(\[data-state="active"\],[^}]*border-color: var\(--ui-text\);[^}]*background: var\(--ui-surface\)/);
  assert.match(tabCss, /\.site-area-panel \{[^}]*border: 0;[^}]*background: var\(--ui-surface\)/);
  assert.doesNotMatch(tabCss, /site-(?:folder|flow|contained)-(?:tabs|tab|panel)|site-shaped-tab-label|site-shadow-shaped-tab|tab-folder-mask/);
  const tabsSource = read("app/components/ui/tabs.tsx");
  assert.match(tabsSource, /TabsVariant = "outline" \| "underline" \| "area" \| "page"/);
  assert.match(tabsSource, /TabsPurpose = "page" \| "section" \| "category" \| "state"/);
  assert.match(tabsSource, /page: "page"/);
  assert.match(tabsSource, /category: "underline"/);
  assert.match(tabsSource, /section: "area"/);
  assert.doesNotMatch(tabsSource, /"folder"|"flow"|"contained"|site-shaped-tab-label/);
  assert.match(read("components/design-system/ShapedTabExamples.tsx"), /<Tabs purpose="section"/);
  const hierarchyExample = read("components/design-system/SelectionControlExamples.tsx");
  assert.match(hierarchyExample, /템플릿 페이지 포함 관계 예시/);
  assert.match(hierarchyExample, /고객센터 페이지 포함 관계 예시/);
  assert.match(hierarchyExample, /<CategoryFilter/);
  assert.doesNotMatch(hierarchyExample, /[1-4] · (최상위|주요 분류|보조 분류|영역 내부)/);
  assert.equal(existsSync(path.join(process.cwd(), "public/images/ui/tab-folder-mask.svg")), false);
});

test("industry filters use shared monochrome category icons instead of platform emoji", () => {
  const tile = read("app/components/ui/choice-tile.tsx");
  const gallery = read("components/apply/TemplateGallery.tsx");
  const examples = read("components/design-system/SiteComponentGallery.tsx");
  const icons = read("components/templates/CatalogIndustryIcon.tsx");
  assert.doesNotMatch(tile, /emoji/);
  assert.doesNotMatch(gallery, /INDUSTRY_EMOJI|[🗂️☕🍽️🍣🍸🥪]/u);
  assert.doesNotMatch(examples, /이모지 선택 버튼|컬러 이모지|emoji=/);
  for (const icon of ["LayoutGrid", "Coffee", "UtensilsCrossed", "Fish", "Wine", "Sandwich"]) assert.match(icons, new RegExp(`\\b${icon}\\b`));
});

test("content and view controls share three sizes without promoting nested guide or translation controls", () => {
  const tabs = read("app/components/ui/tabs.tsx");
  assert.match(tabs, /TabsSize = "sm" \| "md" \| "lg"/);
  assert.match(tabs, /size = "md"/);
  for (const [size, height, font] of [["sm", "2.5rem", ".875rem"], ["md", "2.75rem", ".9375rem"], ["lg", "3rem", "1rem"]]) {
    const rule = tabCss.match(new RegExp(`\\.site-tab-size-${size} \\{([^}]+)\\}`))?.[1];
    assert.ok(rule, `missing ${size}`);
    assert.ok(rule.includes(`--site-tab-height: ${height}`));
    assert.ok(rule.includes(`--site-tab-font: ${font}`));
  }
  const nav = read("app/components/ui/navigation-tabs.tsx");
  assert.match(nav, /size\?: TabsSize/);
  assert.doesNotMatch(nav, /site-topic-tabs-lg/);
  assert.match(read("app/components/home/TemplateShowcase.tsx"), /site-filter-group mb-8/);
  assert.match(read("app/components/home/HomeProductStory.tsx"), /site-tabs-outline site-tab-size-sm/);
  const guide = read("components/guides/UsageGuidePage.tsx");
  assert.match(guide, /size="lg" aria-label="플랜별 사용가이드"/);
  assert.match(guide, /site-filter-group \$\{styles.topics\}/);
  assert.match(guide, /aria-current="location"/);
  assert.doesNotMatch(guide, /className="site-topic-tab"/);
  assert.match(read("components/mypage/menu-editor/LocalizationSection.tsx"), /size="sm" aria-label="번역 항목 선택"/);
  assert.match(read("components/mypage/menu-editor/LocalizationSection.tsx"), /purpose="state"[\s\S]*?purpose="section"/);
});

test("underline tab rails stop at their tab boundary without changing full-width navigation", () => {
  const rail = tabCss.match(/\.site-topic-tabs \{([^}]+)\}/)?.[1];
  const tab = tabCss.match(/\.site-topic-tab \{([^}]+)\}/)?.[1];
  assert.ok(rail, "missing underline tab rail");
  assert.ok(tab, "missing underline tab");
  assert.match(rail, /padding-inline: 0;/);
  assert.match(tab, /padding-inline: \.25rem;/);
  assert.match(tabCss, /\.site-catalog-services \{[^}]*width: fit-content;/);
  assert.match(read("components/guides/usage-guide.module.css"), /\.planTabs \{[^}]*width: fit-content;[^}]*max-width: 100%;/);
  assert.match(tabCss, /\.site-notification-tabs\.site-topic-tabs \{[^}]*width: 100%;/);
  assert.match(tabCss, /\.site-offer-tabs\.site-area-tabs \{[^}]*width: 100%;/);
});

test("native and custom selects reserve a common chevron gutter without affecting listboxes or menu renderers", () => {
  const select = read("app/components/ui/select.tsx");
  assert.match(select, /className="site-select-chevron" size=\{20\} strokeWidth=\{2\.25\}/);
  assert.match(css, /--site-select-chevron-size: 1\.25rem; --site-select-chevron-inset: 1rem; --site-select-trailing-space: 3rem/);
  assert.match(css, /stroke-width='2\.25'/);
  assert.match(css, /select:not\(\[multiple\]\):is\(:not\(\[size\]\), \[size="1"\]\):not\(:where\(\.menu-typography/);
  assert.match(css, /appearance: auto; background-image: none/);
  assert.match(css, /\[data-state="open"\] \.site-select-chevron \{ transform: rotate\(180deg\)/);
  assert.match(css, /\.site-field:disabled,[\s\S]*?background-color: var\(--ui-surface-muted\)/);
});


test("tab hierarchy keeps service navigation, embedded catalog lists and notification tabs in their scopes", () => {
  const catalog = read("components/apply/TemplateGallery.tsx");
  assert.match(catalog, /<Tabs purpose="page"[^>]*value=\{product\}/);
  assert.match(catalog, /ref=\{galleryStartRef\} purpose="section"/);
  assert.doesNotMatch(catalog, /variant=\{product === "display" \? undefined : "contained"\}/);
  assert.match(catalog, /className=\{product !== "display" \? "site-area-panel" : undefined\}/);
  assert.doesNotMatch(catalog, /distribution="equal"/);
  const notification = read("app/components/ui/notification-panel.tsx");
  assert.match(notification, /<Tabs purpose="category"/);
  assert.doesNotMatch(notification, /variant="(?:folder|flow|contained)"/);
  assert.match(read("app/components/layout/Navbar.tsx"), /<NotificationPanel compact/);
  assert.match(read("components/mypage/NotificationHistorySection.tsx"), /<NotificationPanel items=/);
  assert.match(read("app/components/ui/navigation-tabs.tsx"), /data-purpose=\{purpose\}/);
  assert.match(read("app/mypage/page.tsx"), /label="내 메뉴판 탭" purpose="state"/);
  for (const route of ["sign-in", "sign-up", "forgot-password", "reset-password", "find-account", "auth/recovery"]) {
    assert.match(read(`app/${route}/page.tsx`), /<h1 className="type-page-title"/);
  }
});
