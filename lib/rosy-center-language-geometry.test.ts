import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nativeStyles = readFileSync(
  new URL("../components/menu-templates/one-page/NativeBasicScroll.module.css", import.meta.url),
  "utf8",
);
const neutralStyles = readFileSync(
  new URL("../components/menu-templates/experimental/RealMatchaPaged.module.css", import.meta.url),
  "utf8",
);

test("Rosy Orange center rail reuses the neutral center-column language geometry", () => {
  assert.match(neutralStyles, /--scroll-center-width: calc\(\(100% - 2 \* var\(--scroll-page-inset\)\) \* \.24\)/);
  assert.match(neutralStyles, /\.brandControls \{ flex: none; color:/);
  assert.match(neutralStyles, /\.brandControls[^}]*button\[aria-haspopup="menu"\][^}]*width: 2\.75rem; height: 2\.75rem; padding: 0;/);
  assert.match(neutralStyles, /\.brandControls[^}]*button > svg[^}]*width: 1\.5rem; height: 1\.5rem;/);

  assert.match(nativeStyles, /--native-gap: clamp\(2rem, 4\.2vmin, 4\.25rem\);/);
  assert.match(nativeStyles, /--native-gap: clamp\(1\.25rem, 3vmin, 2rem\);/);
  assert.match(nativeStyles, /top: var\(--native-gap\);\s*bottom: var\(--native-gap\);/);
  assert.match(nativeStyles, /width: calc\(\(100% - 2 \* var\(--native-gap\)\) \* \.24\);/);
  assert.match(nativeStyles, /gap: 1\.5rem;/);
  assert.match(nativeStyles, /\.cornerLanguage \{ position: relative;[^}]*flex: none;[^}]*width: 100%;[^}]*height: 2\.75rem;/);
  assert.match(nativeStyles, /\.cornerLanguage > :global\(\[data-template-language-control\]\) \{ text-align: left; \}/);
  assert.match(nativeStyles, /\.cornerLanguage[^}]*button\[aria-haspopup="menu"\][^}]*width: 2\.75rem; height: 2\.75rem; padding: 0;/);
  assert.match(nativeStyles, /\.cornerLanguage[^}]*button > svg[^}]*width: 1\.5rem; height: 1\.5rem;/);
  assert.match(nativeStyles, /column-gap: calc\(\(100% - 2 \* var\(--native-gap\)\) \* \.24 \+ 2 \* var\(--native-gap\)\);/);
});
