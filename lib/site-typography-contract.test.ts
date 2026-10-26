import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postcss from "postcss";
import { SITE_TYPE_ROLES, SITE_TYPE_STEPS, siteTypeSizeCss } from "./site-typography";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(projectRoot, "app");
const componentsRoot = join(projectRoot, "components");
const typographySource = readFileSync(join(projectRoot, "styles/typography.css"), "utf8");
const themeSource = readFileSync(join(projectRoot, "styles/theme.css"), "utf8");

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
