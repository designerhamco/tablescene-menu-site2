# One-page PC/tablet: three scoped rules

2026-10-13. Scope: the seven active one-page dining templates, PC/tablet only. Display/multi-page and the independent mobile contract are unchanged. No new page insets, category-gap ratios, device thresholds, column limits, starter content or assets are introduced.

1. Name + secondary-language name + description form the typography reference, including starters with missing fields. Initial candidates, final flow measurements and clipping safety use that same reference. Temporary reference paragraphs/divider flags are restored synchronously before paint; hidden content leaves no visible placeholder. Genuine actual-copy clipping still triggers the existing safety backoff.
2. Actual item boundaries: full supporting copy 1.0, one supporting field 1.10, name only 1.20. Promotion/origin/traits retain their previous normal boundary. Last items, category/widget/footer boundaries and mobile 20px gaps are unchanged.
3. Text-brand limits (minimum / single / multiline): tablet 40/80/60px; PC 44/88/64px. Actual saved fonts and inner slot width are measured independently, with soft 80% single / 75% multiline targets. Whole text and limits take priority; logos bypass fitting. Mobile fitting is unchanged.

## Browser checks

`scripts/qa-one-page-three-rules.mjs` checks all seven starters at tablet 1198×838, PC 1440×900, portrait tablet 838×1198 and mobile 390×844. It also compares full/two/name-only local fixtures in grouped and fill modes: 70 conditions total. No horizontal page overflow, leaked reference rows, price/name alignment failures, mobile-contract failures or browser exceptions were found.

Reference-font comparisons distinguish the primary candidate from the existing final clipping backoff. KOHI's fill/name-only fixture chooses the same 1.20 reference candidate as its full fixture but its final safety scale is 0.91: actual name size 19.27px versus 21.17px. This is a preserved safety exception, not a hidden-copy enlargement; exact final pixel equality under different safety scales is not promised. The dedicated six-condition KOHI reference/copy-safety comparison passes.

These checks cover Korean starter/fixture routes at the listed sizes, not arbitrary customer content or all locales. Long translations and custom content remain subject to the existing clipping protections.
