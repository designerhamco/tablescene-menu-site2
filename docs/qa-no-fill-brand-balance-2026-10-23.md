# No-fill swatches and PC/tablet brand wrapping QA — 2026-10-23

## Behavior

- Missing auxiliary backgrounds show a red diagonal no-fill slash and “색상 없음”. Explicit white remains a solid white swatch, including when the page has another color.
- Opening/applying an untouched absent picker does not create a white override. Restoring the absent default stages it; Cancel retains the current color, Apply clears the temporary override. Native colored defaults remain native.
- PC/tablet uses the same measured one/two-line selector for every Basic skin. Complete word lines with at least three non-space code points may have a shorter/longer width ratio as low as one third, instead of the character-partition minimum of one half. A two-line candidate ordinarily requires a 15% font-size gain; the existing minimum-reading-size rescue remains.
- Width targets (vertical 75%, horizontal 65%), optical adjustments, slot-height limits and text preservation remain in force. Font/content/viewport changes remeasure through the existing shared component. Mobile, Dining and Display fit engines are unchanged.

## Browser results

Local browser verification used actual iframe dimensions, awaited rendered title/font readiness and measured line widths/height from the DOM.

| Alata / CAFE ARTIMENU | Actual viewport | Previous one line | New two lines | Longest line |
| --- | --- | --- | --- | --- |
| PC, neutral first column | 1440 × 900 | 33.68px | 51.16px | 245.24px of 327px measured slot |
| Tablet, neutral first column | 1180 × 820 | 27.50px | 41.77px | 200.25px of 267px measured slot |

Both now display CAFE / ARTIMENU, preserving the full name and 75% longest-line target. Oswald also remeasures to two lines after changing the font in the UI (64.61px at the same PC viewport).

- All 13 Basic catalog/default/album designs × PC/tablet: 26 combinations ready, measured title heights within the fit budget (1px rounding tolerance).
- All seven native Basic mobile templates plus neutral first column: eight actual 390 × 844 frames, independent mobile fitter intact.
- A portrait request on a list preview retained its registered 1180 × 820 tablet source; a wider outer mobile browser retained its registered 390 × 844 source. These were recorded by actual dimensions, not counted as new source sizes.
- Color UI verified: unchanged no-fill Apply, staged explicit white, white Apply, reset-to-none Cancel, reset-to-none Apply. No preview color changes before Apply.

## Automated validation

- 823 tests passed, including new word-balance/size-gain/height/orphan, absent-vs-white, changed-page and native-default regressions.
- TypeScript passed; production build passed.
- ESLint: zero errors, two pre-existing unused-variable warnings in apply-launch-copy.test.ts and qa-customer-call-status.mjs.
- No customer data, font defaults, global button styling or saved design schema changed.
