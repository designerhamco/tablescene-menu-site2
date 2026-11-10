import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DialogHeader } from "../app/components/ui/dialog";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const css = read("styles/ui-system.css");
const tabCss = read("styles/site-design.css");

test("dialog headers can reserve the common close-button area without changing existing header defaults", () => {
  const normal = renderToStaticMarkup(createElement(DialogHeader, null, "제목"));
  const reserved = renderToStaticMarkup(createElement(DialogHeader, { reserveCloseButton: true }, "긴 오류 제목"));
  assert.doesNotMatch(normal, /data-close-button/);
  assert.match(reserved, /data-close-button="true"/);
  assert.doesNotMatch(reserved, /reserveCloseButton/);
  assert.match(css, /\[data-slot="dialog-header"\]\[data-close-button\] \{ padding-inline-end: var\(--ui-control-height-md\); \}/);
});

test("support actions stay centered at content width instead of inheriting a card grid", () => {
  const row = [...tabCss.matchAll(/\.site-support-actions\s*\{([^}]+)\}/g)].map(match => match[1]).join("\n");
  assert.match(row, /display:\s*flex/);
  assert.match(row, /justify-content:\s*center/);
  assert.match(row, /flex-wrap:\s*wrap/);
  assert.doesNotMatch(row, /grid-template-columns|display:\s*grid/);
  assert.match(read("app/faq/page.tsx"), /className="site-support-actions"/);
});

test("ordinary action geometry is shared and icon / quick-menu shapes are explicit", () => {
  const button = read("app/components/ui/button.tsx");
  assert.match(button, /pill: "site-button-pill"/);
  assert.doesNotMatch(button, /\b(?:sm|xl):/);
  assert.match(button, /rounded: "site-button-rounded"/);
  assert.match(css, /\.site-button \{[^}]*min-height: var\(--ui-control-height-md\);[^}]*border-radius: var\(--ui-radius-control-rounded\);/);
  assert.match(css, /--ui-control-height-compact: 2rem/);
  assert.match(css, /--ui-control-height-md: 2\.5rem/);
  assert.match(css, /--ui-control-height-header: 2\.75rem/);
  assert.match(css, /--ui-control-height-lg: 3rem/);
  assert.doesNotMatch(css, /--ui-control-height-(?:sm|xl):/);
  assert.match(css, /--ui-button-font-weight: 600/);
  assert.match(css, /\.site-button \{[^}]*font-size: var\(--site-type-15\);[^}]*font-weight: var\(--ui-button-font-weight\);/);
  assert.match(css, /\.site-button-icon \{[^}]*width: max-content;[^}]*min-width: 0;[^}]*min-height: 0;[^}]*padding: 0;[^}]*border: 0;[^}]*border-radius: 0;/);
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
          /site-button-(?:sm|xl|square)\b/.test(source) ||
          /\b(?:size="xl"|shape="square")/.test(source) ||
          /\b(?:size:\s*["']xl["']|shape:\s*["']square["'])/.test(source)
        ) deprecated.push(file);
        for (const match of source.matchAll(/"([^"\n]*\bsite-button\b[^"\n]*)"|'([^'\n]*\bsite-button\b[^'\n]*)'|`([^`\n]*\bsite-button\b[^`\n]*)`/g)) {
          const literal = match[1] ?? match[2] ?? match[3];
          const privateTokens = literal.split(/\s+/).filter(token => /^(?:(?:sm|md|lg|xl):)?(?:p[xy]?-[\d.]+|gap-[\d.]+|rounded-\S+|text-(?:xs|sm|base|lg|\[[^\]]+\]))$|^(?:disabled|focus-visible):/.test(token));
          if (privateTokens.length) failures.push(`${file}: ${privateTokens.join(" ")}`);
        }
      } else if (file.endsWith(".css")) {
        const source = read(file);
        if (/--ui-(?:control-height-(?:sm|xl)|control-padding-inline-xl|radius-control-square)\b|\.site-button-(?:sm|xl|square)\b/.test(source)) {
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
  assert.doesNotMatch(tabCss, /\.site-area-tabs::after/);
  assert.match(tabCss, /\.site-area-tab \+ \.site-area-tab \{ margin-inline-start: -1px;/);
  assert.match(tabCss, /\.site-page-tabs > \.site-tab::after \{[^}]*bottom: \.25rem;[^}]*height: 3px;/);
  assert.match(tabCss, /\.site-area-tab:is\(\[data-state="active"\],[^}]*border-color: var\(--ui-text\);[^}]*background: var\(--ui-text\);[^}]*color: var\(--ui-surface\)/);
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
  assert.match(catalog, /className="site-catalog-panel"/);
  assert.match(catalog, /distribution="equal" aria-label="템플릿 종류 선택"/);
  assert.match(catalog, /site-catalog-surface[\s\S]*site-catalog-filters[\s\S]*<TemplatePagination/);
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

test("문서형은 기존 영역형을 유지하며 추가 행동을 선택 탭과 구분한다", async () => {
  const { createElement: h } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Tabs, TabsList, TabsTrigger, TabsAction } = await import("../app/components/ui/tabs");
  const old = renderToStaticMarkup(h(Tabs, { purpose: "section", defaultValue: "first" }, h(TabsList, { "aria-label": "기존 영역" }, h(TabsTrigger, { value: "first" }, "첫 영역"))));
  assert.match(old, /class="site-area-tabs/); assert.doesNotMatch(old, /site-document-tabs/);
  const html = renderToStaticMarkup(h(Tabs, { purpose: "section", appearance: "document", defaultValue: "first" },
    h(TabsList, { "aria-label": "룸", action: h(TabsAction, null, "룸 추가") }, h(TabsTrigger, { value: "first", accessory: h("button", { type: "button", "aria-label": "이름 수정" }, "연필") }, "룸 1"))));
  assert.match(html, /aria-selected="true"/); assert.match(html, /site-document-tabs/);
  const actions = html.split("<button").slice(1).map(part => part.split("</button>")[0]);
  assert.equal(actions.length, 3);
  const add = actions.find(part => part.includes("룸 추가"))!;
  assert.match(add, /type="button"/); assert.doesNotMatch(add, /role="tab"|data-slot="tabs-trigger"/);
  const edit = actions.find(part => part.includes("이름 수정"))!;
  assert.doesNotMatch(edit, /role="tab"|data-slot="tabs-trigger"/);
});


test("only edit pencils share the small glyph size, independent of tabs and with glyph-sized hit areas", () => {
  assert.match(css, /--ui-edit-icon-size: 1rem;/);
  assert.match(css, /svg\.site-edit-icon \{[^}]*width: var\(--ui-edit-icon-size\);[^}]*height: var\(--ui-edit-icon-size\);/);
  assert.doesNotMatch(tabCss, /--site-tab-icon-size|\[data-slot="tabs-trigger"\] svg/);
  assert.match(read("app/components/ui/edit-icon.tsx"), /<Pencil className="site-edit-icon" aria-hidden="true"/);
  for (const file of ["app/components/ui/inline-name-editor.tsx", "components/design-system/ManagementTableExamples.tsx"]) {
    assert.match(read(file), /<EditIcon \/>/);
    assert.doesNotMatch(read(file), /<Pencil\b/);
  }
  assert.match(read("app/components/ui/tabs.tsx"), /className="site-document-tab-accessory">\{accessory\}/);
  assert.match(read("app/components/ui/inline-name-editor.tsx"), /iconOnly \? "site-button site-button-ghost site-button-icon"/);
  const iconBox = css.match(/\.site-button-icon \{([^}]+)\}/)![1];
  assert.match(iconBox, /width: max-content;/);
  assert.match(iconBox, /height: auto;/);
  assert.match(iconBox, /min-width: 0;/);
});


test("opaque disabled actions retain a functional edge on matching backgrounds without changing disabled behavior", () => {
  assert.match(css, /--ui-button-boundary: var\(--ui-border\);/);
  assert.match(css, /\.site-button-secondary \{[^}]*border-color: var\(--ui-button-boundary\);/);
  assert.match(css, /\.site-button:is\(:disabled, \[aria-disabled="true"\]\):not\(\.site-button-ghost, \.site-button-danger-ghost, \.site-button-link\) \{\s*border-color: var\(--ui-button-boundary\);\s*\}/);
  const gallery = read("components/design-system/ControlStateExamples.tsx");
  assert.match(gallery, /id="button-surface-boundaries"/);
  assert.match(gallery, /<fieldset disabled className="site-form-row" data-alignment="center"/);
  assert.match(gallery, /<Button variant="outline">이동<\/Button>/);
});


test("editable floor objects keep their selection surface and X actions as separate interactive siblings", async () => {
  const { FloorPlanObject, FloorPlanWorkspace } = await import("../app/components/ui/floor-plan-canvas");
  const item = createElement(FloorPlanObject, { rect: { x: 4, y: 4, width: 20, height: 16 }, label: "테이블 1", actions: createElement("button", { type: "button", "aria-label": "테이블 1 배치 해제" }, "X") });
  const html = renderToStaticMarkup(item);
  assert.match(html, /class="site-floor-object-interaction"/);
  assert.match(html, /<\/div><div class="site-floor-object-actions"><button/);
  assert.equal((html.match(/role="button"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-resize-handle/);
  assert.doesNotMatch(html, /lucide-move-diagonal-2/);
  const readonly = renderToStaticMarkup(createElement(FloorPlanObject, { rect: { x: 4, y: 4, width: 20, height: 16 }, label: "테이블 1" }));
  assert.doesNotMatch(readonly, /site-floor-object-actions|site-floor-object-interaction/);
  const workspace = renderToStaticMarkup(createElement(FloorPlanWorkspace, { tools: "도구", selection: "선택 항목 정보", footer: "이동·저장" }, item));
  assert.match(workspace, /data-layout="canvas"/);
  assert.ok(workspace.indexOf("도구") < workspace.indexOf("선택 항목 정보"));
  assert.ok(workspace.indexOf("선택 항목 정보") < workspace.indexOf("테이블 1"));
  assert.ok(workspace.indexOf("테이블 1") < workspace.indexOf("이동·저장"));
});


test("리스트와 배치도는 동일한 기기별 Switch와 연결 팝업 진입을 공유한다", async () => {
  const { OrderPointFeatureControls, OrderPointSelectionDetails, OrderPointConnectionControl } = await import("../components/mypage/OrderPointControls");
  const point = { id: "point", label: "창가", status: "active" as const, kind: "table" as const, policyAvailable: true, policy: { terminalOrderEnabled: true, customerOrderEnabled: false, terminalCallEnabled: false, customerCallEnabled: true } };
  const onUpdate = async () => ({status: "success" as const, message: "예시"}), onConnect = () => {};
  const connectionState = {available: true, connections: [{tableId: point.id, device: null}]};
  for (const feature of ["orders", "calls"] as const) {
    const html = renderToStaticMarkup(createElement(OrderPointFeatureControls, { menuSiteId: "store", point, feature, connectionState, onUpdate }));
    assert.equal((html.match(/role="switch"/g) ?? []).length, 2);
    assert.equal((html.match(/aria-checked="true"/g) ?? []).length, 1);
    assert.match(html, /태블릿/); assert.match(html, /모바일/);
    assert.doesNotMatch(html, />(?:ON|OFF)<|설정<|href=/);
    assert.equal((html.match(/data-size="sm"/g) ?? []).length, 2);
  }
  const kiosk = renderToStaticMarkup(createElement(OrderPointFeatureControls, { menuSiteId: "store", point: {...point, kind: "kiosk"}, feature: "orders", connectionState, onUpdate }));
  assert.equal((kiosk.match(/role="switch"/g) ?? []).length, 1); assert.doesNotMatch(kiosk, /모바일/);
  for (const override of [{ policyAvailable: false }, { status: "disabled" as const }]) {
    const html = renderToStaticMarkup(createElement(OrderPointFeatureControls, { menuSiteId: "store", point: {...point, ...override}, feature: "orders", onUpdate }));
    assert.doesNotMatch(html, /aria-checked="true"/);
    if ("policyAvailable" in override) assert.match(html, /확인 필요/);
    assert.doesNotMatch(html, /운영 재개|기존 사용 중지/);
  }
  const selected = renderToStaticMarkup(createElement(OrderPointSelectionDetails, { menuSiteId: "store", point, connectionState: {available: true, connections: []}, disabled: false, onUpdate, onConnect }));
  assert.equal((selected.match(/role="switch"/g) ?? []).length, 4);
  assert.doesNotMatch(selected, /보관|운영 재개/);
  for (const [state, text] of [[{available: true, connections: []}, "연결하기"], [{available: false, connections: []}, "연결 확인"], [{available: true, connections: [{tableId: "point", device: null}, {tableId: "point", device: null}]}, "연결 관리"]] as const) {
    const html = renderToStaticMarkup(createElement(OrderPointConnectionControl, { point, state: { ...state, connections: [...state.connections] }, onConnect }));
    if (state.available && !state.connections.length) { assert.match(html, /해당 없음/); assert.match(html, /aria-label="창가 기기 연결 안내"/); assert.doesNotMatch(html, /창가 연결하기/); }
    else assert.match(html, new RegExp(`창가 ${text}`));
    assert.doesNotMatch(html, /href=/);
  }
  const manager = read("app/mypage/menus/[menuId]/tables/MenuTableManager.tsx");
  assert.equal((manager.match(/<OrderPointConnectionDialog /g) ?? []).length, 1);
  assert.match(manager, /<TableHead>주문<\/TableHead>/); assert.match(manager, /<TableHead>호출<\/TableHead>/);
  const editor = read("components/mypage/floor-plan/FloorPlanEditor.tsx");
  assert.doesNotMatch(editor, /사각형 그리기|setDrawing|사각형을 선택하면/);
  assert.match(editor, /테이블·키오스크 영역을 선택하면/);
  assert.match(editor, /managementActions=\{selected\?\.pointId[^\n]*renderSelectedActions/);
  assert.match(editor, /마지막으로 저장한 배치로 되돌립니다/);
  assert.doesNotMatch(read("app/mypage/menus/[menuId]/tables/actions.ts"), /intent === "resume"|export async function updateOrderPointStatus/);
});


test("등록은 룸이 있을 때만 활성화하고 취소를 제공하지 않는다", async () => {
  const { default: Registration } = await import("../components/mypage/OrderPointRegistrationForm");
  for (const roomReady of [false, true]) {
    const html = renderToStaticMarkup(createElement(Registration, { menuSiteId: "example", kind: "table", onKindChange: () => {}, name: "1번 테이블", onNameChange: () => {}, roomReady, kioskAvailable: true, action: () => {} }));
    assert.doesNotMatch(html, />취소</);
    assert.equal((html.match(/disabled=""/g) ?? []).length, roomReady ? 0 : 3);
    if (!roomReady) assert.match(html, /룸을 먼저 추가/);
  }

});


test("룸 선택의 독립 사각 탭은 고정 추가 행동과 선택 가능한 룸을 분리한다",async()=>{
 const {Tabs,TabsList,TabsTrigger}=await import("../app/components/ui/tabs");
 const html=renderToStaticMarkup(createElement(Tabs,{purpose:"section",appearance:"rooms",defaultValue:"main"},createElement(TabsList,{"aria-label":"룸 선택",action:createElement("button",{type:"button","aria-label":"룸 추가"},"+")},createElement(TabsTrigger,{value:"main"},"메인"),createElement(TabsTrigger,{value:"terrace"},"테라스"))));
 assert.match(html,/site-room-tabs-header/);assert.ok(html.indexOf('aria-label="룸 추가"')<html.indexOf('role="tablist"'));
 assert.equal((html.match(/role="tab"/g)??[]).length,2);assert.match(html,/aria-selected="true"/);assert.doesNotMatch(html,/site-document-tab/);
});

test("category capsules and room rectangles use separate shared roles without changing control geometry", async () => {
  const { ChoiceTile } = await import("../app/components/ui/choice-tile");
  const { Button } = await import("../app/components/ui/button");
  const filter = renderToStaticMarkup(createElement(ChoiceTile, { purpose: "filter", size: "compact", label: "전체", selected: true }));
  const choice = renderToStaticMarkup(createElement(ChoiceTile, { label: "메뉴판 선택", selected: false }));
  const add = renderToStaticMarkup(createElement(Button, { shape: "rounded", size: "icon", variant: "outline", "aria-label": "룸 추가", disabled: true }, "+"));
  assert.match(filter, /data-purpose="filter"/);
  assert.match(filter, /aria-pressed="true"/);
  assert.match(choice, /data-purpose="choice"/);
  assert.match(add, /site-button-rounded/);
  assert.match(add, /site-button-icon/);
  assert.match(add, /disabled=""/);
  assert.match(css, /\.site-choice-tile\[data-purpose="filter"\] \{ border-radius: var\(--ui-radius-control\); \}/);
  assert.match(css, /\.site-filter \{[^}]*border-radius: var\(--ui-radius-control\)/);
  assert.match(css, /\.site-button\.site-button-icon\.site-button-rounded \{ border-radius: var\(--ui-radius-control-rounded\); \}/);
  assert.match(tabCss, /\.site-room-tabs > \.site-room-tab \{[^}]*border-radius:var\(--ui-radius-control-rounded\)/);
  assert.match(tabCss, /\.site-room-tabs > \.site-room-tab\[data-state="active"\] \{[^}]*background:var\(--ui-surface\);[^}]*color:var\(--ui-text\);[^}]*box-shadow:inset/);
  for (const path of ["components/mypage/floor-plan/FloorPlanEditor.tsx", "components/mypage/OperationsHistoryViews.tsx"]) {
    assert.match(read(path), /appearance="rooms"/);
    assert.doesNotMatch(read(path), /appearance="pills"/);
  }
  assert.match(read("components/mypage/floor-plan/FloorPlanEditor.tsx"), /shape="rounded" size="icon" onClick=\{addRoom\}/);
  assert.match(read("components/apply/TemplateGallery.tsx"), /purpose="filter" size="compact"/);
  assert.match(read("styles/site-spacing.css"), /\.site-room-tabs\[data-overflow-right="true"\]/);
});


test("icon tools have intrinsic hit areas in every state and counters use a capsule", () => {
  assert.match(css, /width: max-content !important;/);
  assert.match(css, /min-height: 0 !important;/);
  assert.match(css, /padding: 0 !important;/);
  assert.match(css, /background: transparent !important;/);
  assert.match(css, /border-radius: 0 !important;/);
  assert.match(css, /box-shadow: none !important;/);
  assert.match(css, /\.site-image-carousel-count \{[^}]*border-radius: var\(--ui-radius-control\);/);
  assert.doesNotMatch(css, /--ui-media-arrow-hover|--ui-media-arrow-pressed/);
  assert.match(read("app/components/ui/floor-plan-viewport.tsx"), /variant="ghost" size="icon"/);
  assert.match(read("app/components/ui/refresh-button.tsx"), /variant="ghost" size="icon"/);
});
