# Catalog preview logo and media audit — 2026-11-01

## Finding and change

The logo option reused the legacy `/placeholders/starter/logo.svg` TS badge in seven Basic designer previews: REAL MATCHA, MOCHA FOREST, SUNDAY ROASTERS, VAN GOGH, ROSY ORANGE, LOOP BAGEL and ONUE TABLE. Standard and Dining previews already used the neutral `default-logo.svg` example.

The catalog-only option adapter now substitutes the neutral example when an explicit logo-ON request encounters that legacy starter badge. Genuine logo URLs remain authoritative. Logo OFF restores the text brand. Unmodified catalog defaults, provisioning presets and saved/public customer data remain unchanged; no database migration or content rewrite is involved.

## Verification

- All 20 active catalog designs (10 standard and 10 designer, including Display) were audited with supported media options enabled. Display has no logo option. Local asset paths exist; no legacy TS badge remains in enabled logo output. Source data remains unchanged, and genuine brand logos are preserved.
- Actual browser checks covered 20 designs at PC 1280×720, tablet 1180×820 and mobile 390×844, plus the seven affected Basic designs at 320×740 and 430×932: 74 distinct design/device/viewport cases. Loading, fonts and Dining entrance animation were allowed to settle before final readings. No broken visible images, legacy TS logos, missing supported logos or horizontal viewport overflow remained in these cases.
- VAN GOGH's real viewing-options checkbox was switched ON/OFF/ON: the neutral logo appeared, the original text brand returned when OFF, and the logo reappeared when ON.
- 979 unit tests, TypeScript, changed-file ESLint and a separate-directory Production build passed after integrating the latest Production baseline. The regression tests cover every active catalog design's media paths, logo ON/OFF, source immutability and genuine-logo preservation.
- Browser evidence: `/private/tmp/preview-assets-ui/results.json` and `van-gogh-logo-on.jpg`. The audit covers the registered media examples and their enabled viewing-option states, not every possible combination of unrelated options or custom merchant content.
