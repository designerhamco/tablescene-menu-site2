# Basic contained-scroll rollout

## Shared Basic design follow-up — 2026-10-23

Common Korean/English font controls, category-relative PC/tablet title minimums, full-width remaining-height representative photos and full-bleed auxiliary rails/headers now follow the current `template-spacing-contract.md`. This supersedes older title coverage/height and proportional photo shrinking rules. Both default list/album layouts and all designer skins use the shared renderer path; mobile geometry remains independent. Evidence: `basic-shared-design-qa.md`.

## Verified release slice

Formal REAL MATCHA alone is promoted from the approved hidden scroll test. Compatibility key `cafe_real_matcha_paged_test` remains valid. The original mobile renderer and multi-page branch stay intact. Grouped/fill settings now apply both to saved public menus and previews. Baseline tag: `baseline/basic-before-contained-scroll-20261019` (395be27e22360d5bb24e8ae13988dbe6e664f792).

`qa-real-matcha-formal.mjs` covers 27 device/locale/feature combinations plus a formal preview-toolbar check, actual DOM viewport, all 18 products in registered order, readable mobile rhythm, fixed representative column/dock and reachable final notices. The old 768×1024 fit warning is no longer accepted for formal REAL MATCHA; the price regression requires contained reading to settle ready.

## Six native designer skins — approved rollout 2026-10-20

Automatic approval review rejected routing other template keys through a generalized REAL MATCHA component because palette substitution alone did not demonstrate preservation of their own layout and design. No such patch was executed. The approved implementation instead reuses native components in `one-page/NativeBasicScroll.tsx`; the original rejection is not a blocker to this separately verified native-skin rollout. Structure boundaries:

| Existing shell | Templates | Required structure and verification |
| --- | --- | --- |
| Left representative column | Mocha Forest / Loop Bagel | Reuse their native brand/panels/checker boundaries and role components. Fix brand; scroll menu only. Palette/decoration snapshots must match baseline before routing changes. |
| Top representative row | Sunday Roasters / Van Gogh | Keep the native three-cell header and individual decoration, fixed at top. Featured slot stays in its own column; scroll only the menu region. Preserve centered title and notice anchors. |
| Central representative column | ROSY ORANGE | Fix the native center rail and its notices. Preserve leader/chip layout and column order; choose an explicit accessible scroll behavior for the disjoint menu regions with the approved service actions beneath the representative content. |
| Upper-left representative panel | ONUE TABLE | Keep the actual intro/featured panel at upper left and usable menu space beneath it. A full-height Matcha rail is not an acceptable substitute. Verify both the lower-left and right menu regions, fixed action row, and all content accessibility. |

For each shell, implement an isolated candidate first, compare baseline fonts/colors/weights/decoration and mobile 20/24/48, then run dense/long/widget/logo/custom-font/locales and orientation checks before changing production routing. Last widgets retain category order and precede the appropriate 1/2/3 notices. No shrink-to-fit, pagination, website pills or changes to Display/multi-page are part of this migration.

Baseline screenshots and role measurements for all seven: `/private/tmp/basic-scroll-baseline/` (read-only Production capture). QA order evidence: `runbooks/basic-dining-postpay-production-qa.md`.

## Validation before release

648 unit tests, separate TypeScript, changed-file ESLint and Production build passed. Production-build browser checks: formal 27 plus preview toolbar; existing seven-template regression 112; scroll/order flow 52; cart UI 33; price/prepay preview 33 with no accepted fit warnings; original/copy role parity 3. Actual QA #3/#4 were both confirmed served/unpaid through the authenticated owner UI.

## Native-skin verification — 2026-10-20

Baseline: original Production 27a647c / PR #272, captured for all six skins at PC, tablet and mobile in `/private/tmp/native-template-rollout/baseline.json`. Scope: native PC/tablet geometry only; existing mobile renderers, stored customer content, database/payment/permission policy, Display and multi-page engines are retained. Public template previews expose advertisement and the Basic grouped/fill comparison. Dining's standalone items retain their own prices and card columns, with a native `--aube-rule` separator when categories precede them.

QA: `scripts/qa-native-basic-scroll.mjs`; `scripts/qa-menu-popup-albums.mjs`; `scripts/qa-even-starters.mjs`. See the release entry in `docs/task-queue.md` for final checks. Catalog entitlement switching, design editor color/alignment work and operational page restoration remain the subsequent stage.
