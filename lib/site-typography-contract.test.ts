import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(projectRoot, "app");
const componentsRoot = join(projectRoot, "components");
const typographySource = readFileSync(join(projectRoot, "styles/typography.css"), "utf8");
const themeSource = readFileSync(join(projectRoot, "styles/theme.css"), "utf8");

const excludedSurfacePrefixes = [
  "%5F%5Fqa/",
  "original-pages/",
  "pickup/",
  "templates/",
  "components/home/preview-ui/",
];

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
const approvedHeadingRole = /type-(?:display|page-title|section-title|subsection-title|content-title|item-title|label)/;

test("활성 사이트 UI의 h1부터 h6까지 승인된 의미 기반 타이포 역할만 사용한다", () => {
  for (const path of siteUiFiles) {
    const source = readFileSync(path, "utf8");
    const headings = source.match(/<h[1-6]\b[^>]*>/g) ?? [];

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
