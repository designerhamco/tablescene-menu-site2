import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../components/menu-templates/DiningAubeTableA.tsx", import.meta.url),
  "utf8",
);

test("Aube public menus expose their ready locales without requiring a table session", () => {
  assert.match(source, /data-aube-table-language-control/);
  assert.match(source, /currentLocale=\{data\.locale\}/);
  assert.match(source, /enabledLocales=\{data\.enabledLocales\}/);
  assert.match(source, /triggerVariant="aube"/);
});

test("Aube avoids duplicating the mobile language control inside the table-session header", () => {
  assert.match(
    source,
    /:global\(\[data-public-menu-entry-layer\]\) \.aube-table-language-control \{ display: none; \}/,
  );
});
