# Mobile reading unification and KOHI brand pilot — 2026-10-12

User approved shared mobile rules for seven active dining single-page templates and a KOHI-only title-width pilot. Display/multi-page and PC/tablet are excluded. No starter or saved menu data, production database/storage, fonts/colors, prices, images or product links are changed.

The current contract is in `docs/template-spacing-contract.md`, with a mandatory future-work reminder in `AGENTS.md`. Defaults are 20px item boundaries, 24px heading/upper internal boundaries and 48px section/upper-box/footer boundaries; the same rules apply to full/title-only/description-only/secondary-only rows. Mobile base typography is 16/14/12px for name-price/support/secondary, 24px categories with the explicit Loop Bagel exception. Upper controls reserve 48px with 44px touch targets. Existing notice placement is retained.

Mocha Forest's upper color is contained by a mobile-only header/optional-cover wrapper, and its external 48px gap is painted with the menu background. ROSY ORANGE keeps its existing colored wrapper with normalized internal and external padding. KOHI mobile divider geometry is measured from stroke ends; desktop midpoint behavior is unchanged.

KOHI title fitting uses actual script-aware DOM widths after fonts settle, targeting 80% with bounded one/two-line sizes. Logos bypass it; extremely long names preserve all text through natural wrapping. Brand width is the sole intentional mobile type exception to viewport invariance. Other templates are not opted in.

Local-only `rhythmQa` fixtures cover copy visibility, optional cover, public-device inference, short/long/CJK/unbroken KOHI names and logo replacement. They are disabled in Production and never write data. Read-only shared measurements assert item/section/header/line-edge gaps, viewport-independent body type and price alignment. The final delivery reports the completed browser matrix, automated checks and release result; do not infer visual success from tests alone.

## Completed local browser evidence

- All seven actual mobile starters were visually inspected at 390×844; item/header/section/stroke-edge measurements and first-name/price alignment passed. All seven full/title-only/secondary-only/description-only fixtures passed at 320×844, 390×844 and 430×844. The KOHI brand alone varies with width; body typography and reading gaps do not.
- All seven also passed English/no-cover, public device inference, narrow 320×700 price-column options and explicit mobile in a 1440×900 window. Chinese/Japanese KOHI and Loop Bagel passed spacing and price checks.
- Mocha Forest was checked both without a cover and with a mobile-enabled cover: the upper wrapper ends before the 48px menu-background gap. KOHI heading strokes leave exactly 24px after their end, category strokes leave 12px before the next heading.
- KOHI at 390px: short `KOHI` uses about 115.98px and 79.996% width; `SUNDAY / ROASTERS` uses about 57.59px with its longest line at 79.998%; long Korean names preserve every character on balanced lines; a 78-character unbroken Latin name naturally wraps at the 32px safety floor without horizontal overflow. Logos bypass fitting. Outfit also reaches about 80% with its own measured font size (~106.58px), rather than reusing Tilt Warp's result. These test titles/fonts are not starter-data changes.
- Settled tablet 1198×838 and PC 1440×900 were compared against the pre-change Production revision on all seven templates. Brand/category/item/description/price font sizes, line heights, sampled geometry and item margins matched exactly. All retained three menu columns and their original brand shells. Actual DOM viewport dimensions were checked; differently sized/pending samples were not accepted as comparisons.
- Seven portrait-tablet 838×1198 fixtures retained the PC/tablet policy, no mobile pilot, no horizontal overflow and valid price alignment. Display, both active dining multi-page templates and legacy REAL MATCHA multi-page had zero mobile-rule/pilot flags.
- No browser error/warning logs were observed in the final mobile checks. Session evidence is `/private/tmp/mobile-standard-qa.json` with `<templateKey>-mobile-standard-final.png` and `kohi-brand-*-mobile-standard.png` screenshots in the same temporary directory; these files are not durable repository assets.

Automated suite/type/lint/build and Production confirmation are reported at delivery. This matrix is not an exhaustive guarantee for all customer datasets or browsers.
