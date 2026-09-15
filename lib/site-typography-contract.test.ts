import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(projectRoot, "app");
const excludedRoutePrefixes = [
  "%5F%5Fqa/",
  "m/",
  "menu/",
  "pickup/",
  "templates/",
];

function collectPageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectPageFiles(path);
    }

    return entry.name === "page.tsx" ? [path] : [];
  });
}

test("사이트 페이지의 h1과 h2는 승인된 의미 기반 타이포 역할만 사용한다", () => {
  const pageFiles = collectPageFiles(appRoot).filter((path) => {
    const routePath = relative(appRoot, path);
    return !excludedRoutePrefixes.some((prefix) => routePath.startsWith(prefix));
  });
  const approvedHeadingRole = /type-(?:display|page-title|section-title|subsection-title|content-title)/;

  for (const path of pageFiles) {
    const source = readFileSync(path, "utf8");
    const headings = source.match(/<h[12]\b[^>]*>/g) ?? [];

    for (const heading of headings) {
      assert.match(
        heading,
        approvedHeadingRole,
        `${relative(projectRoot, path)}의 ${heading}에 승인된 타이포 역할이 없습니다.`,
      );
    }
  }
});
