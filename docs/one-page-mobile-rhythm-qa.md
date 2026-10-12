# Single-page mobile rhythm correction — 2026-10-12

## Cause and scope

The prior common rollout incorrectly enabled copy-aware canvas-fit spacing on mobile. Its root-level CSS alias referenced a density token that existed only on descendant item stacks. CSS resolves custom-property aliases at their declaration, so affected 1.15×/1.35× margins became invalid and computed to 0px. Full-copy 1× rows kept their old 16px margin and concealed the problem in some starters.

Seven active dining single-page templates were checked individually. Display, dining multi-page and legacy REAL MATCHA multi-page presentations remain excluded. No starter menu data, images, colors, fonts, customer saved data or production database/storage were changed.

| Template | Starter before | Mobile item gap now | Linked upper/category gap |
| --- | --- | --- | --- |
| REAL MATCHA | 16px; latent sparse-copy defect | 18px | 52.2px |
| KOHI | 0px | 18px | 61.2px |
| Mocha Forest | 0px | 18px | 54px |
| Sunday Roasters | 16px; latent sparse-copy defect | 18px | 46.8px |
| Van Gogh | 16px; latent sparse-copy defect | 18px | 58.5px |
| ROSY ORANGE | 0px sparse rows | 18px | 64.8px |
| Loop Bagel | 0px sparse rows | 18px | 52.2px |

Values use a 16px root. Browser text scaling and customer global/role typography settings remain supported; phone width/height and content count do not shrink the mobile bases. Template-specific semantic ratios remain distinct.

## Implementation contract

- PC/tablet: copy-aware spacing still uses 1× for full copy, 1.15× for one supporting field and 1.35× for neither. Additional promotion/origin/trait support keeps 1×. The alias now resolves on the item stack, with a desktop-board-specific base only inside that board.
- Mobile: separate `mobile-reading`/mobile-style flag, no copy multiplier or viewport-fitting presentation. Stable rem typography and 1.125rem item gaps; zero last-item trailing margin.
- Upper brand/logo/description + optional featured/notices → first category uses the same mobile section token as category/widget/footer boundaries. Featured enabled/disabled cases were both checked. No extra last-item or outer-grid gap is added.
- Explicit mobile in a wide new window remains mobile. Width-only PC category/meta sizing is gated without changing desktop selector specificity.
- Existing category grouping/merging, readable-wrap decisions, preferred/rescue columns, fixed-shell placement, final-column footer docking and name/price first-baseline alignment are preserved.

## Local rendered checks

Browser QA uses the Codex in-app browser, not HTTP markup alone. All seven starter templates were visually inspected on mobile and on settled landscape tablet (`ready`, safety-cover opacity 0).

- Mobile: 320×700, 390×844, 430×932, full/title-only/description-only/secondary-only fixtures. All between-item gaps 18px; fonts invariant across dimensions; upper/category/widget/footer boundaries matched; no horizontal overflow.
- Mobile without featured: all seven checked at 390×844; upper-boundary linkage passed.
- Public device inference: all seven checked at 390×844 in English after hydration resolved mobile, with no explicit preview device. Production-disallowed local fixture affects only device inference, not content.
- Explicit mobile in a wide 1440×900 window: all seven match the 390px mobile font/gap results; desktop board hidden.
- PC 1440×900 and tablet 1198×838: full/none/one-support fixtures retained exactly 1×/1.35×/1.15× spacing and passed first-name/price alignment checks.
- Actual starter PC/tablet: all items/categories retained, fit settled, no cropped content or horizontal overflow. Tablet starters used three menu columns with their existing brand shell. ROSY ORANGE retained its middle brand column; final-column notices stayed docked.
- Portrait tablet 838×1198: all seven scroll layouts retained valid PC/tablet copy-aware spacing and price alignment. Unused hidden fit boards are not treated as visible-layout failures.
- Ordered/fill tablet: all seven settled without cropping; existing column selection remains content driven.
- Exclusions: Display, both dining multi-page variants and legacy REAL MATCHA multi-page had no common-policy/mobile/copy-aware flags.

Reproducible DOM checks live in `scripts/lib/one-page-mobile-rhythm.mjs`; regressions cover zero/invalid gaps, leaked fit policy, missing mobile contract, mismatched boundaries and viewport-dependent mobile fonts. `rhythmQa` copy/cover/public fixtures in the preview route are local-only and never write starter or saved data.

Temporary local evidence: `/private/tmp/one-page-rhythm-before.json`, `one-page-rhythm-mobile-widths.json`, `one-page-rhythm-pc-tablet.json`, `one-page-rhythm-tablet-starters.json`, `one-page-rhythm-public-mobile.json`, `one-page-rhythm-supplement.json`, `one-page-rhythm-exclusions.json`; screenshots use `<templateKey>-mobile-rhythm-after.jpg` and `<templateKey>-tablet-rhythm-after.jpg` in the same temporary directory. These are session evidence, not durable repository assets.

## Verification boundary

The final automated suite, type/lint/build checks and production revision/browser confirmation are recorded in the delivery report. This audit covers the active starters, explicit copy/cover fixtures, relevant devices and exclusions above. It is not a claim that every possible customer dataset or browser has been exhaustively tested. No font/gap numeric calibration, new column policy or unrelated starter changes were introduced on PC/tablet.
