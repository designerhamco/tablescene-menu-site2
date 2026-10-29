import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postcss from "postcss";
import {
  SITE_CONTROL_TYPE_STEPS,
  SITE_EMPHASIS_TYPE_STEPS,
  SITE_MANAGEMENT_TYPE_ROLES,
  SITE_READING_TYPE_STEPS,
  SITE_TYPE_ROLES,
  SITE_TYPE_STEPS,
  siteTypeSizeCss,
} from "./site-typography";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(projectRoot, "app");
const componentsRoot = join(projectRoot, "components");
const typographySource = readFileSync(join(projectRoot, "styles/typography.css"), "utf8");
const themeSource = readFileSync(join(projectRoot, "styles/theme.css"), "utf8");
const siteDesignSource = readFileSync(join(projectRoot, "styles/site-design.css"), "utf8");

const excludedSurfacePrefixes = [
  "%5F%5Fqa/",
  "pickup/",
  "templates/[templateKey]/preview/",
  "templates/cafe_design_a/widget-lab/",
  "components/home/preview-ui/",
];
const activeOriginalSurfaceFiles = new Set([
  "original-pages/Store.tsx",
  "original-pages/branding/GoodsPackagePage.tsx",
  "original-pages/branding/VisualStudioPage.tsx",
  "original-pages/services/ComingSoonServicePage.tsx",
  "original-pages/services/CustomServicePage.tsx",
  "original-pages/services/DiningServicePage.tsx",
  "original-pages/services/DisplayComingSoonPage.tsx",
]);

const excludedMenuRenderPrefixes = ["m/", "menu/"];
const excludedComponentPrefixes = [
  "menu-templates/",
  "public-menu/",
];
const excludedComponentFiles = new Set([
  "menu/MenuPreviewDeviceFrame.tsx",
  "menu/MenuPreviewRenderer.tsx",
]);
const visualPreviewFiles = new Set([
  "app/components/display/DisplayProductStory.tsx",
  "app/components/home/HomeProductStory.tsx",
  "app/components/home/Portfolio.tsx",
  "app/components/ui/NavigationDots.tsx",
  "components/apply/ApplyOrderForm.tsx",
  "components/templates/TemplateCard.tsx",
]);

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectTsxFiles(path);
    }

    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function isSiteUiFile(path: string) {
  const routePath = relative(appRoot, path);

  if (routePath.startsWith("original-pages/")) {
    return activeOriginalSurfaceFiles.has(routePath);
  }

  if (excludedSurfacePrefixes.some((prefix) => routePath.startsWith(prefix))) {
    return false;
  }

  if (excludedMenuRenderPrefixes.some((prefix) => routePath.startsWith(prefix))) {
    return routePath.endsWith("/not-found.tsx");
  }

  return true;
}

function isSiteUiComponent(path: string) {
  const componentPath = relative(componentsRoot, path);

  return !excludedComponentPrefixes.some((prefix) => componentPath.startsWith(prefix))
    && !excludedComponentFiles.has(componentPath);
}

const siteUiFiles = [
  ...collectTsxFiles(appRoot).filter(isSiteUiFile),
  ...collectTsxFiles(componentsRoot).filter(isSiteUiComponent),
];
const approvedHeadingRole = /type-(?:display|page-title|section-title|subsection-title|content-title|item-title|card-title|label)/;

test("현재 OriginalApp 라우트의 활성 페이지를 전역 타이포 계약에 포함한다", () => {
  const routerSource = readFileSync(join(appRoot, "OriginalApp.tsx"), "utf8");
  for (const path of activeOriginalSurfaceFiles) {
    assert.ok(siteUiFiles.includes(join(appRoot, path)), `${path}가 사이트 타이포 검사에서 빠졌습니다.`);
  }
  for (const route of ["/services/custom", "/services/design-customizing", "/services/qr-order", "/services/smart-call", "/branding/visual-studio", "/branding/food-visual-art", "/branding/goods-package", "/store"]) {
    assert.ok(routerSource.includes(`path=\"${route}\"`), `${route}의 활성 라우트 계약이 바뀌었습니다.`);
  }
});

test("마이페이지와 편집·운영 화면은 동일한 관리 화면 타이포 범위를 사용한다", () => {
  for (const role of SITE_MANAGEMENT_TYPE_ROLES) {
    assert.ok(SITE_TYPE_STEPS.includes(role.size));
    assert.match(siteDesignSource, new RegExp(`\\.site-management-scope[\\s\\S]*?--type-${role.key}-size: var\\(--site-type-${role.size}\\);`));
  }
  assert.match(siteDesignSource, /\.site-management-scope[\s\S]*?--text-copy: var\(--site-type-16\);/);
  assert.match(siteDesignSource, /\.site-management-scope[\s\S]*?--text-support: var\(--site-type-14\);/);
  assert.match(siteDesignSource, /\.site-management-scope :where\(input, textarea, select\)[\s\S]*?font-size: var\(--type-body-size\);/);
  assert.doesNotMatch(siteDesignSource, /\.site-management-scope\s*\{[^}]*--type-page-title-size:/);
  assert.doesNotMatch(siteDesignSource, /\.site-management-scope\s*\{[^}]*--type-page-description-size:/);
  assert.doesNotMatch(siteDesignSource, /\.site-management-scope\s*\{[^}]*--type-body-lg-size:/);

  for (const file of collectTsxFiles(join(appRoot, "mypage"))) {
    const source = readFileSync(file, "utf8");
    for (const main of source.match(/<main\b[^>]*>/g) ?? []) {
      assert.match(main, /site-management-scope/, `${relative(projectRoot, file)}의 관리 화면 루트에 공통 타이포 범위가 없습니다.`);
    }
    for (const overlay of source.match(/className="[^"]*site-dialog-overlay[^"]*"/g) ?? []) {
      assert.match(overlay, /site-management-scope/, `${relative(projectRoot, file)}의 관리 대화창에 공통 타이포 범위가 없습니다.`);
    }
  }

  for (const file of collectTsxFiles(join(componentsRoot, "mypage"))) {
    const source = readFileSync(file, "utf8");
    for (const main of source.match(/<main\b[^>]*>/g) ?? []) {
      assert.match(main, /site-management-scope/, `${relative(projectRoot, file)}의 관리 화면 루트에 공통 타이포 범위가 없습니다.`);
    }
    for (const overlay of source.match(/className="[^"]*site-dialog-overlay[^"]*"/g) ?? []) {
      assert.match(overlay, /site-management-scope/, `${relative(projectRoot, file)}의 관리 대화창에 공통 타이포 범위가 없습니다.`);
    }
  }
});

test("인증 화면은 페이지 소개보다 계정 보조 링크를 작게 표시한다", () => {
  for (const route of ["sign-in", "sign-up", "forgot-password", "find-account", "reset-password", "auth/recovery"]) {
    const source = readFileSync(join(appRoot, route, "page.tsx"), "utf8");
    assert.match(source, /<div className="site-auth-header">[\s\S]*?<h1 className="type-page-title"[\s\S]*?<p className="type-page-description /);
  }

  const signInSource = readFileSync(join(appRoot, "sign-in/page.tsx"), "utf8");
  assert.match(signInSource, /className="type-body-sm[^"]*"[\s\S]*?비밀번호를 잊으셨나요\?/);
  assert.match(signInSource, /className="type-body-sm[^"]*"[\s\S]*?계정이 없나요\?/);
});

test("디자인 시스템은 글자 역할 이름과 화면 예시를 같은 계약으로 설명한다", () => {
  const gallerySource = readFileSync(join(componentsRoot, "design-system/SiteComponentGallery.tsx"), "utf8");
  const foundationsSource = readFileSync(join(componentsRoot, "design-system/DesignFoundations.tsx"), "utf8");
  const emphasizedBody = SITE_TYPE_ROLES.find((role) => role.key === "body-lg");
  const pageDescription = SITE_TYPE_ROLES.find((role) => role.key === "page-description");

  assert.equal(emphasizedBody?.label, "강조 본문");
  assert.equal(pageDescription?.label, "페이지 설명");
  assert.match(gallerySource, /<p className="type-page-description">디자인 기준과 실제 사이트/);
  assert.match(foundationsSource, /type-page-description[^>]*>페이지 제목 바로 아래의 설명은 로그인·서비스·고객센터·신청 화면에서 모두 같은 역할과 크기/);
  assert.match(foundationsSource, /type-body-lg[^>]*>기본 본문보다 한 단계 강조해야 하는 짧은 문장/);
  assert.match(typographySource, /\.type-body,\s*\n\.site-body\s*\{/);
  assert.doesNotMatch(typographySource, /\.type-body-lg,\s*\n\.site-body\s*\{/);
});

test("일반 페이지의 h1 바로 아래 설명은 화면 종류와 무관하게 같은 역할을 쓴다", () => {
  const pageDescriptionFiles = [
    "sign-in/page.tsx",
    "templates/page.tsx",
    "pricing/page.tsx",
    "apply/page.tsx",
    "apply/_components/PaidApplyPage.tsx",
    "apply/_components/ConsultingApplyPage.tsx",
    "apply/custom/page.tsx",
    "apply/display/page.tsx",
    "products/[slug]/page.tsx",
    "support/chat/page.tsx",
    "success/page.tsx",
    "design-review/page.tsx",
    "original-pages/services/CustomServicePage.tsx",
    "original-pages/services/DiningServicePage.tsx",
    "original-pages/services/DisplayComingSoonPage.tsx",
  ];

  for (const route of pageDescriptionFiles) {
    const source = readFileSync(join(appRoot, route), "utf8");
    assert.match(
      source,
      /<h1 className="type-page-title[^\"]*"[\s\S]{0,320}?<p className="type-page-description/,
      `${route}의 페이지 제목 설명이 공통 역할을 사용하지 않습니다.`,
    );
  }

  for (const component of [
    "marketing/MarketingPages.tsx",
    "support/SupportCenter.tsx",
  ]) {
    const source = readFileSync(join(componentsRoot, component), "utf8");
    assert.match(source, /<h1[^>]*className="type-page-title"[\s\S]{0,220}?<p className="type-page-description/);
  }

  const detailSource = readFileSync(join(appRoot, "templates/[templateKey]/page.tsx"), "utf8");
  assert.match(detailSource, /<h1 className="type-page-title"[\s\S]{0,180}?type-page-description/);
});

test("마이페이지와 매장 운영의 최상위 설명은 관리 영역 안에서도 기능 설명 크기를 유지한다", () => {
  const mypageSource = readFileSync(join(appRoot, "mypage/page.tsx"), "utf8");
  const staffSource = readFileSync(join(appRoot, "mypage/staff/page.tsx"), "utf8");
  const operationsShellSource = readFileSync(join(componentsRoot, "mypage/StoreOperationsShell.tsx"), "utf8");

  assert.match(mypageSource, /<h1 className="type-page-title"[\s\S]*?<p className="type-page-description/);
  assert.match(staffSource, /<h1 className="type-page-title[^\"]*"[\s\S]*?<p className="type-page-description/);
  assert.match(operationsShellSource, /<h1 className="type-page-title"[\s\S]*?<p className="type-page-description/);
});

test("활성 사이트 UI의 h1부터 h6까지 승인된 의미 기반 타이포 역할만 사용한다", () => {
  for (const path of siteUiFiles) {
    const source = readFileSync(path, "utf8");
    const headings = source.match(/<(?:motion\.)?h[1-6]\b[^>]*>/g) ?? [];

    for (const heading of headings) {
      assert.match(
        heading,
        approvedHeadingRole,
        `${relative(projectRoot, path)}의 ${heading}에 승인된 타이포 역할이 없습니다.`,
      );
      assert.doesNotMatch(
        heading,
        /\b(?:text-(?:xs|sm|base|lg|xl|[2-9]xl)|font-(?:thin|light|normal|medium|semibold|bold|extrabold|black)|leading-|tracking-)/,
        `${relative(projectRoot, path)}의 ${heading}이 의미 역할과 임의 타이포 유틸리티를 함께 사용합니다.`,
      );
    }
  }
});

test("사이트 UI는 900 굵기와 임의 숫자 글자 크기를 사용하지 않는다", () => {
  for (const path of siteUiFiles) {
    const routePath = relative(projectRoot, path);
    const source = readFileSync(path, "utf8");

    assert.doesNotMatch(source, /\bfont-(?:black|extrabold)\b/, `${routePath}에 승인되지 않은 과도한 굵기가 있습니다.`);

    if (!visualPreviewFiles.has(routePath)) {
      assert.doesNotMatch(source, /\btext-\[[0-9][^\]]*\]/, `${routePath}에 토큰을 우회한 임의 글자 크기가 있습니다.`);
    }
  }
});

test("새 라우트 페이지는 숫자형 유틸리티 대신 의미 기반 글자 역할을 사용한다", () => {
  const rawTypeUtility = /\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/;
  for (const path of siteUiFiles) {
    if (!path.startsWith(appRoot) || !path.endsWith("/page.tsx")) continue;
    assert.doesNotMatch(
      readFileSync(path, "utf8"),
      rawTypeUtility,
      `${relative(projectRoot, path)}가 의미 역할 대신 숫자형 글자 유틸리티를 사용합니다.`,
    );
  }
});

test("본문용 Tailwind 크기 유틸리티가 승인된 기초 토큰에 연결된다", () => {
  for (const [utility, token] of [
    ["xs", "100"],
    ["sm", "200"],
    ["base", "300"],
    ["lg", "400"],
    ["xl", "500"],
    ["2xl", "600"],
    ["3xl", "700"],
    ["4xl", "800"],
    ["5xl", "900"],
    ["6xl", "1000"],
    ["7xl", "1100"],
  ]) {
    assert.match(typographySource, new RegExp(`--font-size-${token}:`));
    assert.match(themeSource, new RegExp(`--text-${utility}: var\\(--font-size-${token}\\);`));
  }
});

test("사이트 본문 역할은 메뉴판 기초 크기와 독립적으로 가독성 하한을 유지한다", () => {
  for (const [token, size] of [["body", 16], ["body-lg", 18], ["body-sm", 14], ["caption", 13]]) {
    assert.ok(typographySource.includes(`--type-${token}-size: var(--site-type-${size});`));
  }
  for (const [token, size] of [["100", "0.75rem"], ["200", "0.875rem"], ["300", "1rem"]]) {
    assert.ok(typographySource.includes(`--font-size-${token}: ${size};`));
  }
  for (const [utility, token] of [["copy", "body"], ["support", "body-sm"], ["meta", "caption"]]) {
    assert.ok(themeSource.includes(`--text-${utility}: var(--type-${token}-size);`));
  }
  for (const path of siteUiFiles) {
    const routePath = relative(projectRoot, path);
    if (visualPreviewFiles.has(routePath)) continue;
    assert.doesNotMatch(readFileSync(path, "utf8"), /\btext-(?:xs|sm)\b/, `${routePath}는 사이트 본문 역할 대신 작은 기초 유틸리티를 사용합니다.`);
  }
});

test("읽기·컨트롤·강조 크기는 중복 없이 정해진 단계만 사용한다", () => {
  assert.deepEqual(SITE_READING_TYPE_STEPS, [13,14,16,18,20]);
  assert.deepEqual(SITE_CONTROL_TYPE_STEPS, [14,15,16,18]);
  assert.deepEqual(SITE_EMPHASIS_TYPE_STEPS, [24,28,32,36,44]);
  assert.deepEqual(SITE_TYPE_STEPS, [13,14,15,16,18,20,24,28,32,36,44]);

  const roles = new Map<string, (typeof SITE_TYPE_ROLES)[number]>(SITE_TYPE_ROLES.map(role => [role.key, role]));
  for (const key of ["page-description", "body"]) {
    const role = roles.get(key);
    assert.deepEqual([role?.mobile, role?.tablet, role?.desktop], [16,16,16]);
  }
  for (const key of ["body-sm", "card-body", "dialog-body"]) {
    const role = roles.get(key);
    assert.deepEqual([role?.mobile, role?.tablet, role?.desktop], [14,14,14]);
  }
  for (const key of ["label", "nav", "control"]) {
    const role = roles.get(key);
    assert.deepEqual([role?.mobile, role?.tablet, role?.desktop], [15,15,16]);
  }
  assert.deepEqual(
    SITE_MANAGEMENT_TYPE_ROLES.map(role => [role.key, role.size]),
    [
      ["section-title", 24],
      ["subsection-title", 20],
      ["content-title", 18],
      ["item-title", 16],
      ["body", 16],
      ["body-sm", 14],
      ["label", 14],
      ["caption", 13],
      ["metric", 24],
    ],
  );
  for (const removed of [17,22,26]) {
    assert.doesNotMatch(typographySource, new RegExp(`--site-type-${removed}:`));
    assert.doesNotMatch(siteDesignSource, new RegExp(`--site-type-${removed}\\)`));
  }
});


test("all semantic roles resolve to the reference steps at each breakpoint", () => {
  const css = postcss.parse(typographySource);
  for (const px of SITE_TYPE_STEPS) assert.ok(typographySource.includes(`--site-type-${px}: ${px / 16}rem;`));
  for (const [width, device] of [[390, "mobile"], [820, "tablet"], [1440, "desktop"]] as const) {
    const values = new Map<string, string>();
    css.walkRules(":root", rule => {
      const parent = rule.parent;
      if (parent?.type === "atrule") {
        const minimum = Number(parent.params.match(/min-width: (\d+)px/)?.[1]);
        if (width < minimum) return;
      }
      rule.walkDecls(decl => { values.set(decl.prop, decl.value); });
    });
    for (const role of SITE_TYPE_ROLES) {
      assert.ok(SITE_TYPE_STEPS.includes(role[device]));
      assert.equal(values.get(`--type-${role.key}-size`), `var(--site-type-${role[device]})`, `${role.key} at ${width}`);
    }
  }
  assert.equal(siteTypeSizeCss(2), "var(--site-type-13)");
  assert.equal(siteTypeSizeCss(999), "var(--site-type-44)");
  assert.equal(siteTypeSizeCss(15.2), "var(--site-type-15)");
});

test("neutral text remains readable on every shared light surface", () => {
  const controls = readFileSync(join(projectRoot, "styles/ui-system.css"), "utf8");
  const color = (name: string) => {
    const hex = controls.match(new RegExp(`--ui-${name}: (#[0-9a-f]{6})`))?.[1];
    assert.ok(hex, `missing neutral color ${name}`);
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  for (const ink of ["text", "text-muted", "text-subtle"]) for (const surface of ["surface", "surface-muted", "surface-soft"]) {
    assert.ok((color(surface) + .05) / (color(ink) + .05) >= 4.5, `${ink} on ${surface} must remain readable`);
  }
});


test("UI CSS cannot introduce private or fluid font sizes outside the reference scale", () => {
  const graphicClasses = new Set([...readFileSync(join(projectRoot, "components/marketing/MarketingVisual.tsx"), "utf8").matchAll(/styles\.([A-Za-z0-9_]+)/g)].map(match => match[1]));
  const failures: string[] = [];
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      const local = relative(projectRoot, file);
      if (entry.isDirectory()) { if (!/menu-templates|public-menu|original-pages/.test(local)) walk(file); continue; }
      if (!file.endsWith(".css") || ["app/globals.css", "styles/fonts.css", "styles/theme.css", "styles/tailwind.css"].includes(local)) continue;
      postcss.parse(readFileSync(file, "utf8")).walkDecls("font-size", decl => {
        const selector = decl.parent?.type === "rule" ? decl.parent.selector : "";
        const graphic = (local === "components/marketing/marketing.module.css" && selector.split(",").every(part => [...part.matchAll(/\.([A-Za-z0-9_-]+)/g)].some(match => graphicClasses.has(match[1]))))
          || (local === "app/components/home/TabletTemplateCarousel.module.css" && decl.value.includes("cqw"))
          || (local === "app/components/layout/Footer.module.css" && selector === ".wordmark");
        if (!graphic && !/^(var\(--(?:type-|site-type-|site-tab-|site-segment-)|inherit$|initial$|unset$)/.test(decl.value)) failures.push(`${local} ${selector}: ${decl.value}`);
      });
    }
  }
  for (const directory of ["app", "components", "styles"]) walk(join(projectRoot, directory));
  assert.deepEqual(failures, []);
});


test("reading UI cannot use off-scale large utilities or private numeric type sizes", () => {
  for (const path of siteUiFiles) {
    const routePath = relative(projectRoot, path);
    if (visualPreviewFiles.has(routePath)) continue;
    assert.doesNotMatch(readFileSync(path, "utf8"), /\btext-(?:3xl|5xl|6xl|7xl|8xl|9xl)\b/, `${routePath} introduces an off-scale type utility`);
  }
});
