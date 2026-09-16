import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("public product and support surfaces keep secondary copy at accessible contrast", () => {
  const gallery = readSource("../components/apply/TemplateGallery.tsx");
  const pricing = readSource("../app/pricing/page.tsx");
  const faq = readSource("../app/components/common/FAQ.tsx");
  const footer = readSource("../app/components/layout/Footer.tsx");

  assert.doesNotMatch(gallery, /border-transparent text-zinc-400/);
  assert.match(gallery, /border-transparent text-zinc-600/);
  assert.doesNotMatch(pricing, /text-zinc-400/);
  assert.match(faq, /bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950/);
  assert.match(footer, /type-caption uppercase tracking-wide text-zinc-600/);
});

test("auth consent and compact product previews avoid low-opacity essential copy", () => {
  const oauth = readSource("../components/auth/OAuthButtons.tsx");
  const signUp = readSource("../app/sign-up/page.tsx");
  const consent = readSource("../components/consent/ConsentAgreementBox.tsx");
  const productStory = readSource("../app/components/home/HomeProductStory.tsx");

  assert.match(oauth, /text-xs font-bold text-zinc-600/);
  assert.match(signUp, /text-xs font-bold text-zinc-600/);
  assert.match(consent, /text-xs font-bold text-zinc-600/);
  assert.doesNotMatch(productStory, /text-black\/35|text-black\/40/);
});

test("display starter badges use AA-safe foreground and background pairs", () => {
  const badgeStyles = readSource("../lib/template-badge-styles.ts");

  assert.match(
    badgeStyles,
    /display_menu_a:[\s\S]*?best: \{ background_color: "#006A9E", text_color: "#FFFFFF" \}/,
  );
  assert.match(
    badgeStyles,
    /display_menu_a:[\s\S]*?default: \{ background_color: "#08767D", text_color: "#FFFFFF" \}/,
  );
});

test("homepage autoplay previews pause when reduced motion is requested", () => {
  const productStory = readSource("../app/components/home/HomeProductStory.tsx");
  const autoplayCount = productStory.match(/window\.setInterval/g)?.length ?? 0;
  const reducedMotionGuardCount = productStory.match(/if \(prefersReducedMotion\) return;/g)?.length ?? 0;

  assert.match(productStory, /import \{ AnimatePresence, motion, useReducedMotion \} from "motion\/react"/);
  assert.equal(autoplayCount, 6);
  assert.equal(reducedMotionGuardCount, autoplayCount);
});

test("Aube swipe attributes stay hydration-stable when reduced motion differs", () => {
  const aube = readSource("../components/menu-templates/DiningAubeTableA.tsx");

  assert.match(aube, /drag=\{!usesSidebarNavigation && units\.length > 1 \? "x" : false\}/);
  assert.doesNotMatch(aube, /drag=\{[^\n]*prefersReducedMotion/);
});
