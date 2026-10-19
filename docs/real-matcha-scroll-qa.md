# REAL MATCHA contained-scroll experiment — 2026-10-19

Scope: hidden `cafe_real_matcha_paged_test` only. The compatibility key and existing QA/public URLs remain usable; visible test labels now say 스크롤. Original REAL MATCHA, other starters, multi-page/Display engines and customer data are unchanged. This explicitly approved PC/tablet experiment is an exception to the seven production starters' canvas-fit rule.

## Behavior

- One 100dvh frame, fixed representative rail, one shared menu scroll viewport, and a separate bottom action row. Menu columns move together; the outer page does not scroll.
- Original REAL MATCHA visual components, saved fonts/colors/roles, carousel, language, product images, sale clock and item add actions remain shared. Mobile delegates directly to the original CafeDesignA and retains its reading rhythm and existing controls.
- Columns use actual scroll content width, reserve readable 12rem minimums, and choose up to three columns. Hidden DOM measures at that width; content/font/image/viewport changes remeasure. No type shrink or gap compression to force a viewport fit.
- Grouped mode keeps categories intact, even when a category is taller than the viewport. Flow mode continues the next product directly in the next column without repeating its category heading. Registered item/category/widget order is preserved; the canvas grows until all units fit on one scrolling surface.
- Notices follow all columns/widgets in scroll content. Last widgets remain before notices. Bottom actions reserve separate measured space, so final rows and notices can be fully reached.
- The fade uses the actual menu background, is opaque at the bottom and transparent above, and never captures pointer events. It appears only with content below and disappears at the end or when all content fits. Reduced motion is respected.
- Call is an outlined rounded rectangle, Order a black filled rectangle, centered side by side across the menu region only. A single enabled feature shows one button; neither reserves no action row. They stay fixed while scrolling. Call opens the existing call dialog; Order opens the existing cart, including count, options, quantities and postpay flow. The later approved control update hides the PC/tablet table label in the rail and shows it in the cart/call dialogs; mobile action combinations now follow `docs/menu-order-ui-qa.md` while its reading layout remains unchanged.

## Validation

All checks below passed against the final local Production build. Public-menu writes are blocked; ordering uses only the local preview demo.

- 643 unit/contract tests; independent `tsc --noEmit`, changed-file ESLint, `git diff --check`, Production build.
- `qa-basic-dining-order.mjs`: 52 conditions, including actual 1440×900/1920×1080 PC, 1180×820/820×1180 tablets, both layouts, default/images/dense/long/widgets, registered order and no lost items, shared scroll offsets, fixed brand/footer, conditional fade and reachable final notices. Four mobile widths, options/quantity/cart editing/demo postpay/status chain, disabled prepay, Dining A/B and feature toolbar also passed.
- `qa-paged-call-placement.mjs`: 27 conditions: five PC/tablet sizes (including 768×1024 and 1024×768) × four feature combinations, plus seven original-vs-copy mobile style comparisons at 320/390/430/820px and KO/EN/ZH/JA. Same-mounted tablet rotation also retained items and footer placement. Simulated call and cart dialogs open; keyboard End reaches the bottom. Border radius 8px, controls at least 44px, no circular backgrounds/shadows.
- `qa-paged-design-parity.mjs`: three PC/tablet original-vs-copy comparisons of actual role fonts, colors and weights, plus representative carousel preservation and absence of pagination.
- `qa-basic-dining-regression.mjs`: 112 original-seven-template device/feature/locale conditions; zero failures/runtime errors.
- Separate Display smoke: PC/tablet/mobile menu-view fit completed, canvas-fit retained, no scroll-experiment UI or viewport overflow. Evidence: `/private/tmp/matcha-scroll-display.json`.

Production-build screenshots/reports: `/private/tmp/matcha-scroll-final/`, `/private/tmp/matcha-scroll-controls-final/`, `/private/tmp/matcha-scroll-parity-final/`. Build log: `/private/tmp/matcha-scroll-build-release.log`. The initial incremental Webpack WasmHash cache failure was resolved by preserving the old cache outside the checkout and rebuilding cleanly; the final build and checks passed.

## Preview prepay visibility and price-note spacing — 2026-10-19

- The existing order preview lab shows `선결제 표시 · 준비 중` only in mobile mode with ordering enabled. PC/tablet send prepayPreview=off and hide the control. Returning to mobile retains the user's prior check state. This does not activate a payment provider; mobile prepay remains disabled in checkout.
- Original and test rows already shared CafeAMenuItemRow, but original fit-board-only CSS supplied the label/price gap. The contained-scroll copy therefore had 0px at PC/tablet widths. Add the original clamp(.22rem, .38rem × fit-menu-gap-scale, .48rem) rule to the scroll surface and the original's missing portrait-tablet range. Existing original PC/landscape rules remain intact. REAL MATCHA explicit mobile retains .375rem (6px at the QA root size), including a wide foldable presentation. No prices, options, fonts, palette, category rhythm, action UI or other template engine changes.
- Stable comparison at 1440×900 PC and 1180×820 tablet confirms original font families, label/price sizes and gaps match the deployed baseline. The initial measurement preceded final fit settling; QA waits for fonts, fit state and a settling interval. Evidence: `/private/tmp/preview-gap-desktop-compare.json`.
- New QA checks 31 ready-render/preview cases across PC, tablet orientations, both layouts and 320/390/430/820px mobile, plus original/test label/price/font/color/weight comparisons and checkbox state transitions. Existing role parity 3 and mocked order-flow 8 cases pass. TypeScript, ESLint, Production build and diff checks pass. Browser scripts block real public-menu writes.
- **Existing baseline limitation, not a passed fit:** original canvas-fit REAL MATCHA at 768×1024 with Call+Order stays fitStatus=warning/presentation=loading in both layouts. This reproduces on the pre-change Production page and is reported separately by QA, not counted as ready. The scroll test at the same size is ready and measured. Keep this as a formal-template transition item; do not force readiness or change the legacy fit engine in this visual correction. Evidence: `/private/tmp/preview-gap-original-768.json` and `baselineWarnings` in the QA report.

Evidence: `/private/tmp/matcha-preview-price-spacing/report.json`, `/private/tmp/preview-gap-parity.log`, `/private/tmp/preview-gap-order.log`, `/private/tmp/preview-gap-types.log`, `/private/tmp/preview-gap-lint.log`, `/private/tmp/preview-gap-build.log`.

## Fill continuation headings — 2026-10-19

- Fixed repeated ADE/CLASSIC COFFEE headings at column boundaries. Contained reading opts out of the pagination helper's continuation-heading insertion, including its height budget. Original category headings occur once, and continued columns start directly with products. Grouped mode, mobile and other pagination callers retain their existing behavior.
- Regression first reproduced two unit failures (duplicate full block sequence and repeated headings), then passed all 649 tests. Production build, independent TypeScript, changed-file ESLint and diff checks pass.
- Strengthened the existing 52 scroll/order checks and 28 formal checks to compare **all** source blocks, including category headings, against rendered column order; all 80 pass with zero runtime errors or real API writes.
- Direct 1180×820 tablet checks on formal and hidden test routes: first/second/third columns start heading/item/item, respectively, with 5/6/7 products (18 total), all five category headings exactly once and ADE once. Evidence: `/private/tmp/matcha-heading-visual.json`, `/private/tmp/matcha-heading-order/report.json`, `/private/tmp/matcha-heading-formal/report.json`.


## Viewport-first fill and responsive sizing — 2026-10-19

Scope: formal REAL MATCHA single-page and the hidden compatibility test only. The implementation rules are in `docs/basic-menu-scroll-policy.md`; older experiment-only/no-type-fit statements above describe earlier checkpoints and are superseded for this route.

The audit reproduced width-only maximum columns, greedy partitioning with a viewport floor, per-unit rounding and notice height deducted from every column. At 1440×900 the final column left about 258px of its old budget unused; at 1920×1080 about 328px. The wrapper also replaced the common size calculation with a plain vw clamp and skipped the shared category/item boundary rules and all-script Korean notice face.

The final implementation measures real fractional grid widths for every readable 1–3-column candidate. It first finds the largest shared readable type that fits one viewport (1rem floor, PC 1.35rem/tablet 1.30rem ceilings), checking three-field reference and real wrapped content. It reuses ordered gap mappers, 0.74 rhythm, 1/1.10/1.20 item spacing and the Matcha 2.9 category boundary. Fill balances contiguous units, preserves title-once/source order, prefers meaningful occupancy without sacrificing more than 8% of available readable type, expands only outside gaps up to 1.6× and centers a short common grid. Grouped preserves category atoms and unexpanded gaps. Dense content scrolls at the floor; no shrinking below it, fake fade or blank filler rows.

Notices use height only in the final menu column and follow the last widgets. The fixed Call/Order dock uses the separate measured bottom row; only the first actual trailing bottom widget absorbs free space. Corrected Call-outline selector priority so its template palette border remains visible. Original role fonts/colors, language, carousel and mobile rendering remain shared. Other six Basic, Dining and Display engines are not migrated.

Validation against the final Production build:

- 656 unit tests, independent TypeScript, changed-file ESLint, whitespace and Production build pass.
- New `qa-real-matcha-fill.mjs`: 25 conditions pass, zero runtime errors/writes. Actual PC 1280×800, 1440×900, 1920×1080, 2560×1440; tablets 1180×820, 820×1180, 768×1024; sparse/empty/dense/long/images/widgets/long notices; feature-off and 20px root text scaling. Checks actual plan/DOM order, bounded gaps, aligned/centered tracks, reading sizes, stable rerenders, fixed dock/brand and real conditional fade. Default fill fits one viewport in every measured device. 1280px PC grows from 19.675px to 21.6px at 1440px, then respects the common ceiling. At 2560px two sufficiently filled columns keep that 21.6px size; at 1920px three tracks retain readable type and share optical vertical centering.
- Existing formal/mobile/locales/feature toolbar: 28 pass; feature combinations, same-mounted rotation and mobile parity: 27 pass. These include independent 320/390/430px mobile reading and wide forced-mobile behavior.
- Existing scroll/order/Dining suite: 52 pass. The toolbar test now awaits and closes the actual asynchronously mounted preview guide before clicking controls; product guide behavior is unchanged.

Evidence: `/private/tmp/fill-policy-release-visual/report.json`, `/private/tmp/fill-policy-release-formal/report.json`, `/private/tmp/fill-policy-release-controls/report.json`, `/private/tmp/fill-policy-release-order/report.json`, `/private/tmp/fill-policy-build-release.log`, `/private/tmp/fill-policy-types-release.log`, `/private/tmp/fill-policy-lint-release.log`. All API writes are blocked; order checks use the existing mocked local preview flow.


## Page-relative gutters and small dock clearance — 2026-10-19

The contained-reading wrapper already used responsive units and real DOM width/height measurements, but its outer inset, brand-to-menu gutter and ordinary menu gutters used different formulas. The dock alone used a fixed .75rem top gap. The page's four-side inset remains `clamp(1rem, 2.5vmin, 2rem)`; a single scoped token now drives every ordinary gutter and the width used by the existing fitter. No fit algorithm, font role, mobile, other Basic template, Dining or Display engine was changed.

Dock clearance follows 75% of that page inset, bounded .875–1.25rem (14–20px at the default 16px root). It reserves actual empty space above the buttons independently of the conditional fade, and does not reserve a row when both features are off.

Measured final build values (viewport → page inset = brand gutter = menu gutters; dock clearance):

- Tablet 1180×820 and 820×1180 → 20.5px; 15.375px.
- Tablet 768×1024 → 19.2px (19.1875px grid rounding); 14.390625px.
- PC 1280×800 → 20px; 15px. PC 1440×900 → 22.5px; 16.875px.
- PC 1920×1080 → 27px; 20px. PC 2560×1440 → 32px; 20px.

The existing fill QA now compares all four actual paddings, actual brand/menu gutter edges and the button-to-viewport clearance, including sparse/empty/dense/long/image/widget/notice content, feature-off cases and 20px root scaling. The fixed brand/dock, source order, real overflow fade and original typography checks remain in place. All 80 browser conditions pass (25 geometry, 28 formal/mobile/locales, 27 feature/rotation), with zero runtime errors and real API writes. TypeScript, changed-script ESLint, Production build and whitespace checks pass. Evidence: `/private/tmp/matcha-relative-geometry/report.json`, `/private/tmp/matcha-relative-formal/report.json`, `/private/tmp/matcha-relative-controls/report.json`, `/private/tmp/matcha-relative-build.log`.
