# Common PC/tablet brand-slot selection

2026-10-13. All seven active one-page templates share the same title selector. No template-name-specific sizes were added. Mobile, logos, Display/multi-page and product typography/item-rhythm rules retain their existing policies.

- Input: actual inner title-slot width and saved/starter font measurements. Horizontal headers target 60% of the central title cell; vertical brand columns target 75% of their inner width. No fixed px ceiling remains. Both use 18% of inner reading-frame height as their height budget; horizontal headers also limit height to 28% of title-slot width. The text-preserving safety floor is 10% of slot width with root text scaling.
- Compare one/two-line candidates. Two balanced lines can win when they allow at least 15% larger text and shortest/longest width ratio is at least 0.5. Retain single lines for small/no gains. Whole-text preservation and the minimum take priority for impossible/extreme customer names.
- Horizontal headers use the existing central grid cell instead of spanning the description/notices row. The fitter replaces old `ch` limits, and planned lines cannot silently wrap in CSS. Height measurement does not observe its own title height or menu density.

## Previous slot-selection results (superseded coverage and px limits)

Seven templates × tablet 1198×838, PC 1440×900, portrait tablet 838×1198 and mobile 390×844: 28 checks passed. Checks include device bounds, title width/height budgets and physical line count, page overflow, name/price alignment, hidden reference rows, and mobile reading-contract regression.

Representative tablet results are calculated, not configured template overrides:

| Title | Selected lines | Font size |
| --- | --- | --- |
| SUNDAY ROASTERS | SUNDAY / ROASTERS | 58.30px |
| VAN GOGH | VAN GOGH | 67.04px |
| LOOP BAGEL | LOOP / BAGEL | 58.90px |

The production build and the 570-test suite pass. English/Chinese/Japanese title-box checks are separate from whole-menu settling. A whole-menu English Mocha Forest check did not reach `ready`: the same pre-existing loading state was reproduced on the previous Production build and the new local build, with the same 45.78px two-line brand. That body-fit issue was not expanded into this title-only change and full multilingual menu readiness is not claimed.

These results cover the listed viewports/starters, not every possible customer title or typography customization. Extreme names use the text-preserving fallback.

## Current percentage calibration — 2026-10-13

The old px bounds and 80%/75% one-line/multiline targets above are superseded by layout geometry: 60% for horizontal headers and 75% for vertical brand columns, regardless of line count. The actual central cell is the horizontal width reference, not the whole page. Its title height is bounded by the smaller of 18% of reading-frame height and 28% of central-cell width. Vertical columns retain the 18% reading-frame height bound. The common relative floor is 10% of inner slot width; whole-text fallback and root text enlargement remain supported. There are no template/device-specific fixed font sizes or ceilings.

Representative tablet 1198×838 results (calculated outputs, not configured px values):

| Title | Lines | Previous size | Current size | Longest line / inner slot |
| --- | --- | --- | --- | --- |
| SUNDAY ROASTERS | SUNDAY / ROASTERS | 58.30px | 46.64px | 60% |
| VAN GOGH | VAN GOGH | 67.04px | 50.28px | 60% |
| LOOP BAGEL | LOOP / BAGEL | 58.90px | 58.90px | about 68%, height-bound |

Canvas-only font measurement now includes actual line advance at 100px, not just text width. Chinese fallback metrics can exceed the CSS 1.08 leading: the initial Van Gogh Chinese check exceeded its newly compact height budget, so the fitter was corrected to account for measured line-box height plus 0.12em padding. No mobile optical-gap or font-policy change was added.

The 570-test suite, TypeScript, targeted lint and production build pass. Korean standard starters pass all 28 built-server device cases (seven × landscape tablet, PC, portrait tablet and mobile); English/Chinese/Japanese pass 21 focused title-box checks. Mobile typography/gaps, price/name alignment, page overflow and hidden reference rows are checked. Full multilingual menu readiness is not claimed; the previously documented Mocha Forest English body-fit issue remains outside this title calibration. All selected-font measurements use saved/starter typography; no font substitutions or content changes were made.
