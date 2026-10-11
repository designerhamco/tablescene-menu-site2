# Single-page menu price alignment — 2026-10-12

## Contract and scope

The seven active single-page CafeA templates use the product name's first baseline as their menu-list price anchor on every device. Full-copy centering must never return when secondary names, descriptions or chips appear/disappear. Image content shells use the same baseline. Sunday/Van Gogh retain the hidden desktop thumbnail treatment but keep a separate right-hand price column.

This is a scoped CSS correction, not a font/spacing/partition refactor. Category-level HOT/ICE/LARGE headers, width rails, option discount stacking and Mocha's adaptive tablet option-label layout are preserved. Starter/saved data, Display, multi-page and featured-image overlays are unchanged.

## Regression checks

- `lib/menu-price-alignment.test.ts` guards CSS scope/order, first-line geometry (including multiline names), Sunday image-shell columns and QA wiring.
- `scripts/lib/menu-price-alignment.mjs` reads the first inline text rectangle rather than the entire multiline h3/copy box. The price block must overlap that first line; option discounts may retain their internal stack.
- `scripts/qa-template-preview-locales.mjs` now fails if a menu-list price drifts away from that first line. These browser assertions supplement source-contract tests.
- Local-only `priceAlignmentQa=copy` creates isolated title-only, description-only, secondary-only and image/full-copy rows with a wrapped name/chip. `priceAlignmentQa=options` uses actual category price columns and matching item column values, not ad-hoc inline HOT/ICE labels. Both flags are disabled in Production and do not write data. Use Korean for these synthetic fixtures.

## Local verification

In-app browser checks covered all seven starters at PC 1440×900, landscape tablet 1198×838, portrait tablet 838×1198 and mobile 390×844. All visible menu items retained their first-line price anchor with zero horizontal overflow. PC/landscape grouped boards settled to `ready`; portrait/mobile used their independent scrolling layouts.

All seven landscape templates were also checked with the isolated copy and category-option fixtures. KOHI copy/options were additionally checked on PC and mobile, and Sunday's image-copy case on PC/mobile. Multiline names, supporting-copy visibility, chips, photos, time sales and category price rails retained the anchor. KOHI English/Chinese/Japanese `orderedFit` checks settled to `ready`, with all 17 items and no price-alignment or horizontal-overflow failures.

The existing combined `featureQa=1` stress case (three extra widgets plus inline three-option labels in every category) remained in a warning/loading state on KOHI tablet both with and without this baseline correction. It is not a passed stress case and is separate from this price-alignment change; no crop/overflow safety check was weakened to reveal it.

Final local checks: 543 tests passed, TypeScript, targeted ESLint, production build and `git diff --check` passed. Release status and deployed-browser results must be verified separately after pushing.
