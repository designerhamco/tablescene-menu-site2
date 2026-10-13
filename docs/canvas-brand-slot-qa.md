# Common PC/tablet brand-slot selection

2026-10-13. All seven active one-page templates share the same title selector. No template-name-specific sizes were added. Mobile, logos, Display/multi-page and product typography/item-rhythm rules retain their existing policies.

- Input: actual inner title-slot width, saved/starter font measurements, device-wide 40/80/60px (tablet) or 44/88/64px (PC) bounds, and a common title-height budget of 18% of the inner reading frame.
- Compare one/two-line candidates. Two balanced lines can win when they allow at least 15% larger text and shortest/longest width ratio is at least 0.5. Retain single lines for small/no gains. Whole-text preservation and the minimum take priority for impossible/extreme customer names.
- Horizontal headers use the existing central grid cell instead of spanning the description/notices row. The fitter replaces old `ch` limits, and planned lines cannot silently wrap in CSS. Height measurement does not observe its own title height or menu density.

## Local results

Seven templates × tablet 1198×838, PC 1440×900, portrait tablet 838×1198 and mobile 390×844: 28 checks passed. Checks include device bounds, title width/height budgets and physical line count, page overflow, name/price alignment, hidden reference rows, and mobile reading-contract regression.

Representative tablet results are calculated, not configured template overrides:

| Title | Selected lines | Font size |
| --- | --- | --- |
| SUNDAY ROASTERS | SUNDAY / ROASTERS | 58.30px |
| VAN GOGH | VAN GOGH | 67.04px |
| LOOP BAGEL | LOOP / BAGEL | 58.90px |

The production build and the 570-test suite pass. English/Chinese/Japanese title-box checks are separate from whole-menu settling. A whole-menu English Mocha Forest check did not reach `ready`: the same pre-existing loading state was reproduced on the previous Production build and the new local build, with the same 45.78px two-line brand. That body-fit issue was not expanded into this title-only change and full multilingual menu readiness is not claimed.

These results cover the listed viewports/starters, not every possible customer title or typography customization. Extreme names use the text-preserving fallback.
