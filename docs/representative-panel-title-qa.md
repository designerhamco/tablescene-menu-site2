# Representative panels and fixed PC/tablet title ratios

Verified 2026-10-24 against the shared Basic renderer. This follows the latest title/panel policy in `template-spacing-contract.md`.

## Behavior

- PC/tablet title size stays at actual category size × 1.6 for vertical/upper-left brands and × 1.3 for horizontal headers. Available width selects line breaks only. Existing Darumadrop metric corrections remain; no new font-name exceptions were added.
- Whole words stay intact where possible. An oversized word splits by grapheme without joining its fragments to neighboring words. Legal 40-character names receive measured line plans; long input falls back to natural wrapping at the same size.
- Left-rail representative content and selected menu tracks share usable width. Panel padding, ordinary gutters and scrollbar are reserved first. Candidate widths are measured before selection; actual brand overflow retries a wider rail without reducing type.
- Upper-left color paints one natural-height representative block. The Basic nested flow brand and ONUE image-overlay/plain introductions use the same internal-padding geometry in probes and visible content. Clear/equal-page color restores unpanelled geometry.
- Preview and editor retain their existing common font/color settings and stored Design model. Customer data and mobile sizing rules are unchanged.

## Browser measurements

All dimensions below are actual DOM viewport dimensions, not preview toolbar labels.

| Case | Viewport | Category | Brand | Result |
| --- | --- | --- | --- | --- |
| Default first/center/upper-left and native vertical layouts | 1280 × 720 PC | 34.56px | 55.296px | Fixed × 1.6 |
| Default/native top-row headers | 1280 × 720 PC | 34.56px | 44.928px | Fixed × 1.3 |
| Vertical layouts | 1180 × 820 tablet | 33.28px | 53.248px | Fixed × 1.6 |
| Top-row headers | 1180 × 820 tablet | 33.28px | 43.264px | Fixed × 1.3 |
| All 13 default/native layouts | 768 × 1024 tablet | 33.28px | Same ratios | Settled, no horizontal overflow |
| Seven native mobile templates | 320 × 844 and 430 × 844 | 26px | Independent mobile fitter | No horizontal overflow |
| All 13 default/native mobile layouts | 390 × 844 | 26px | Independent mobile fitter | No horizontal overflow |

The 13 cases cover six Basic list/album defaults and seven native templates (REAL MATCHA, MOCHA FOREST, SUNDAY ROASTERS, VAN GOGH, ONUE TABLE, LOOP BAGEL and ROSY ORANGE).

Colored first-column usable widths matched menu tracks to subpixel rounding: PC representative 373.328px versus menu 373.336px; tablet all 335.938px. Removing color or setting white on the white Basic page restored zero panel padding and matching 347.42px content tracks. Upper-left painted block-to-next-menu gap remained 34.438px. ONUE with/without its photo painted correctly; setting both page and auxiliary color to white restored zero surface padding.

Long-name fixtures covered CAFE ARTIMENU, Incomprehensible, Korean copy and forty W characters on PC/portrait tablet. Sizes remained fixed; the longest header grew its row rather than shrinking type. Alata and Carme used the same ratios. Existing Darumadrop role metric corrections remained intact.

## Automated checks

- Unit suite: 824 passed, 0 failed.
- TypeScript: passed.
- ESLint: no errors; two unrelated existing unused-variable warnings in `apply-launch-copy.test.ts` and `qa-customer-call-status.mjs`.
- Production build and release smoke results are recorded in the pull request.

Temporary DOM measurement records were saved outside the worktree under `/private/tmp/representative-panel-*.json` for the local validation session. They contain sample template data only.
