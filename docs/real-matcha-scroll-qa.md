# REAL MATCHA contained-scroll experiment — 2026-10-19

Scope: hidden `cafe_real_matcha_paged_test` only. The compatibility key and existing QA/public URLs remain usable; visible test labels now say 스크롤. Original REAL MATCHA, other starters, multi-page/Display engines and customer data are unchanged. This explicitly approved PC/tablet experiment is an exception to the seven production starters' canvas-fit rule.

## Behavior

- One 100dvh frame, fixed representative rail, one shared menu scroll viewport, and a separate bottom action row. Menu columns move together; the outer page does not scroll.
- Original REAL MATCHA visual components, saved fonts/colors/roles, carousel, language, product images, sale clock and item add actions remain shared. Mobile delegates directly to the original CafeDesignA and retains its reading rhythm and existing controls.
- Columns use actual scroll content width, reserve readable 12rem minimums, and choose up to three columns. Hidden DOM measures at that width; content/font/image/viewport changes remeasure. No type shrink or gap compression to force a viewport fit.
- Grouped mode keeps categories intact, even when a category is taller than the viewport. Flow mode may continue a category in the next column with its heading. Registered item/category/widget order is preserved; the canvas grows until all units fit on one scrolling surface.
- Notices follow all columns/widgets in scroll content. Last widgets remain before notices. Bottom actions reserve separate measured space, so final rows and notices can be fully reached.
- The fade uses the actual menu background, is opaque at the bottom and transparent above, and never captures pointer events. It appears only with content below and disappears at the end or when all content fits. Reduced motion is respected.
- Call is an outlined rounded rectangle, Order a black filled rectangle, centered side by side across the menu region only. A single enabled feature shows one button; neither reserves no action row. They stay fixed while scrolling. Call opens the existing call dialog; Order opens the existing cart, including count, options, quantities and postpay flow. Brand controls retain globe/table only on PC/tablet; mobile controls remain unchanged.

## Validation

All checks below passed against the final local Production build. Public-menu writes are blocked; ordering uses only the local preview demo.

- 643 unit/contract tests; independent `tsc --noEmit`, changed-file ESLint, `git diff --check`, Production build.
- `qa-basic-dining-order.mjs`: 52 conditions, including actual 1440×900/1920×1080 PC, 1180×820/820×1180 tablets, both layouts, default/images/dense/long/widgets, registered order and no lost items, shared scroll offsets, fixed brand/footer, conditional fade and reachable final notices. Four mobile widths, options/quantity/cart editing/demo postpay/status chain, disabled prepay, Dining A/B and feature toolbar also passed.
- `qa-paged-call-placement.mjs`: 27 conditions: five PC/tablet sizes (including 768×1024 and 1024×768) × four feature combinations, plus seven original-vs-copy mobile style comparisons at 320/390/430/820px and KO/EN/ZH/JA. Same-mounted tablet rotation also retained items and footer placement. Simulated call and cart dialogs open; keyboard End reaches the bottom. Border radius 8px, controls at least 44px, no circular backgrounds/shadows.
- `qa-paged-design-parity.mjs`: three PC/tablet original-vs-copy comparisons of actual role fonts, colors and weights, plus representative carousel preservation and absence of pagination.
- `qa-basic-dining-regression.mjs`: 112 original-seven-template device/feature/locale conditions; zero failures/runtime errors.
- Separate Display smoke: PC/tablet/mobile menu-view fit completed, canvas-fit retained, no scroll-experiment UI or viewport overflow. Evidence: `/private/tmp/matcha-scroll-display.json`.

Production-build screenshots/reports: `/private/tmp/matcha-scroll-final/`, `/private/tmp/matcha-scroll-controls-final/`, `/private/tmp/matcha-scroll-parity-final/`. Build log: `/private/tmp/matcha-scroll-build-release.log`. The initial incremental Webpack WasmHash cache failure was resolved by preserving the old cache outside the checkout and rebuilding cleanly; the final build and checks passed.
