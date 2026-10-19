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
