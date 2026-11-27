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

  assert.doesNotMatch(gallery, /border-transparent text-zinc-400/);
  assert.match(gallery, /primaryFilter=\{<CatalogServiceButtons/);
  assert.match(readSource("../components/templates/CatalogServiceButtons.tsx"), /<ToggleGroup type="single" appearance="segmented" size="sm" aria-label="메뉴판 유형"/);
  assert.doesNotMatch(pricing, /text-zinc-400/);
  assert.match(faq, /site-filter/);
  const controls = readSource("../styles/ui-system.css");
  assert.match(controls, /--ui-text-muted: #4b515b/);
  assert.match(controls, /\.site-filter \{[^}]*color: var\(--ui-text-muted\)/);
  const footer = readSource("../app/components/layout/Footer.module.css");
  assert.match(footer, /\.copyright, \.legal \{ color: var\(--footer-muted\); \}/);
  const luminance = (token: string) => {
    const hex = footer.match(new RegExp(`${token}: #([0-9a-f]{6})`, "i"))?.[1];
    assert.ok(hex, `Missing color token ${token}`);
    return [0.2126, 0.7152, 0.0722].reduce((sum, weight, channel) => {
      const value = Number.parseInt(hex.slice(channel * 2, channel * 2 + 2), 16) / 255;
      const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      return sum + weight * linear;
    }, 0);
  };
  assert.ok((luminance("--footer-muted") + 0.05) / (luminance("--footer-surface") + 0.05) >= 4.5);
});

test("auth consent and compact product previews avoid low-opacity essential copy", () => {
  const oauth = readSource("../components/auth/OAuthButtons.tsx");
  const signUp = readSource("../app/sign-up/page.tsx");
  const consent = readSource("../components/consent/ConsentAgreementBox.tsx");
  const productStory = readSource("../app/components/home/HomeProductStory.tsx");

  assert.match(oauth, /text-support font-medium text-zinc-600/);
  assert.match(signUp, /text-support font-medium text-zinc-600/);
  assert.match(consent, /site-button-outline/);
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
  assert.equal(autoplayCount, 5);
  assert.equal(reducedMotionGuardCount, autoplayCount);
});

test("Aube swipe attributes stay hydration-stable when reduced motion differs", () => {
  const aube = readSource("../components/menu-templates/DiningAubeTableA.tsx");

  assert.match(aube, /drag=\{!usesSidebarNavigation && units\.length > 1 \? "x" : false\}/);
  assert.doesNotMatch(aube, /drag=\{[^\n]*prefersReducedMotion/);
});
