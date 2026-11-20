import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cn } from "../app/components/ui/utils";
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("semantic copy sizes merge independently from foreground colors and responsive overrides", () => {
  assert.equal(cn("text-copy font-medium", "text-zinc-600"), "text-copy font-medium text-zinc-600");
  assert.equal(cn("text-copy text-zinc-600", "text-support"), "text-zinc-600 text-support");
  assert.equal(cn("text-support md:text-copy", "md:text-lg"), "text-support md:text-lg");
});

test("native inputs and selects use the default field role and checkout excludes non-text inputs", () => {
  assert.match(read("app/components/ui/input.tsx"), /fieldSize = "md"/);
  assert.match(read("app/components/ui/input.tsx"), /data-field-size=\{fieldSize\}/);
  assert.match(read("app/components/ui/select.tsx"), /size === "default" \? "md" : size/);
  const checkout = read("components/apply/ApplyOrderForm.tsx");
  assert.doesNotMatch(checkout, /<input data-field-size="lg"\s+type="(?:checkbox|radio|hidden|file|color|range)"/);
  assert.match(checkout, /site-choice site-plan-card site-checkout-plan/);
  assert.match(checkout, /className="site-plan-price"/);
  assert.doesNotMatch(checkout, />링크<\/a>/);
});
