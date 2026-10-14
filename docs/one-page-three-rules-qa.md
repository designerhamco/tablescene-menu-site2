# One-page PC/tablet: three scoped rules

2026-10-13. Scope: the seven active one-page dining templates, PC/tablet only. Display/multi-page and the independent mobile contract are unchanged. No new page insets, category-gap ratios, device thresholds, column limits, starter content or assets are introduced.

1. Name + secondary-language name + description form the default typography reference, including starters with missing fields. Temporary reference paragraphs/divider flags are restored synchronously before paint; hidden content leaves no visible placeholder. Materially excessive whitespace with a safe size gain, or genuine actual-copy clipping, may select the explicit `actual` measurement basis. The current basis is exposed on the board and included in QA.
2. Actual item boundaries: full supporting copy 1.0, one supporting field 1.10, name only 1.20. Promotion/origin/traits retain their previous normal boundary. Last items, category/widget/footer boundaries and mobile 20px gaps are unchanged.
3. Text-brand fitting: the initial tablet 40/80/60px and PC 44/88/64px limits below are historical results. The current geometry-based 60% horizontal-header / 75% brand-column policy is defined in `template-spacing-contract.md` and verified in `canvas-brand-slot-qa.md`. Whole-text preservation and logos bypassing fitting remain unchanged, as does mobile fitting.

## Browser checks

`scripts/qa-one-page-three-rules.mjs` checks all seven starters at tablet 1198×838, PC 1440×900, portrait tablet 838×1198 and mobile 390×844. It also compares full/two/name-only local fixtures in grouped and fill modes: 70 conditions total. No horizontal page overflow, leaked reference rows, price/name alignment failures, mobile-contract failures or browser exceptions were found.

Reference checks distinguish `three-field` from the intentional `actual` relaxation and verify the rendered 1/1.10/1.20 boundary multiplier for every full/two/name-only fixture. Candidate sizes are compared only when column count, measurement basis and actual boundary rhythm are all equal; different approved boundary rhythms consume different vertical space and therefore are not required to produce identical final pixels. Final clipping safety may still reduce either basis.

These checks cover Korean starter/fixture routes at the listed sizes, not arbitrary customer content or all locales. Long translations and custom content remain subject to the existing clipping protections.
