import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("paid application keeps decision groups on visible surfaces", () => {
  const page = readSource("../app/apply/_components/PaidApplyPage.tsx");
  const form = readSource("../components/apply/ApplyOrderForm.tsx");
  const styles = readSource("../components/apply/apply-checkout.css");

  assert.match(page, /site-checkout-page/);
  assert.match(form, /site-checkout-agreements/);
  assert.match(styles, /\.site-checkout-page \{ background: var\(--ui-surface-muted\); \}/);
  assert.match(styles, /\.site-checkout \.site-checkout-section \{[\s\S]*?border: 1px solid var\(--ui-border\);[\s\S]*?background: var\(--ui-surface\);/);
  assert.match(styles, /\.site-checkout-agreements \{[\s\S]*?border: 1px solid var\(--ui-border\);[\s\S]*?background: var\(--ui-surface-muted\);/);
  assert.doesNotMatch(styles, /\.site-checkout \.site-checkout-section \{[^}]*background: transparent/);
});

test("shared consent groups retain a bounded supporting plane", () => {
  const consent = readSource("../components/consent/ConsentAgreementBox.tsx");
  const styles = readSource("../styles/ui-system.css");

  assert.match(consent, /site-consent-surface/);
  assert.match(consent, /site-consent-all/);
  assert.match(consent, /site-consent-row/);
  assert.match(styles, /\.site-consent-surface \{[\s\S]*?border: 1px solid var\(--ui-border\);[\s\S]*?background: var\(--ui-surface-muted\);/);
});

test("semantic site sections remain visible without adding shadows", () => {
  const styles = readSource("../styles/ui-system.css");

  assert.match(styles, /\.site-section,\s*\.site-card \{[\s\S]*?border: 1px solid var\(--ui-border\);[\s\S]*?border-radius: var\(--ui-radius-surface\);[\s\S]*?background: var\(--ui-surface\);[\s\S]*?box-shadow: none;/);
  assert.match(styles, /\.site-card-empty \{[\s\S]*?border-style: dashed;[\s\S]*?background: var\(--ui-surface\) !important;/);
});
