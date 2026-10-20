# Menu state, purchase alignment and advertisement carousel — 2026-10-20

## Changes

- Sold-out name/price copy uses neutral `#797979`; secondary name/description/price notes use `#8b8b8b`. State rules win over native and saved role colors. Existing chip design, item image policy and other products' colors stay intact. Dining rows expose the same state attribute.
- Catalog and neutral-design widget options default OFF, including first entry with unrelated query parameters. Explicit ON retains the complete image+title+body example. Starter/customer widgets are not deleted; saved-menu/public routes do not acquire catalog display defaults.
- Order fill is the representative store-name color, independent of the darkest palette swatch. Foreground prefers the lightest menu color. Very light/mid-tone brands retain that background but use readable dark/black ink when needed (4.5 minimum contrast); this is necessary for white text on white or ivory. Logo and Dining cover navigation keep the persistent representative color. Call's existing surface/ink and solid circle rules remain separate.
- Every Basic item-add control uses the price area, removing the old native-mobile title-row branch. Price-hidden products retain a right-hand purchase action. Dining and albums keep their existing price/purchase layout. Mobile fonts, thumbnail sizing, copy gaps and item/section rhythm are unchanged.
- Shared measured 2/3-track selection now includes category headings after price-header reservation. Repeated ordinary two-line product names can also justify two when at least 3 items and 30% of products wrap and the wider candidate materially reduces actual line count. At least two improved wrapped category headings also qualify. One isolated ordinary wrap and unchanged long text do not. No template-key exception, text shrinking, reordering, mobile reflow or automatic fourth track.
- Advertisements cycle every 5 seconds with a compact active-dot progress ring and transparent desktop chevrons. Click, keyboard or swipe/drag navigation resets the interval and wraps. Hover, keyboard manipulation and background visibility pause progression; reduced-motion users retain manual navigation. One image still omits dots/arrows/timer. Close/footer/daily-suppression policies are unchanged.

## Wrapping evidence

`WRAP_QA=1 QA_KEYS=cafe_van_gogh_a node scripts/audit-basic-column-balance.mjs` compares actual 2/3 widths at the same reading size, with logo/cover/secondary/item/category copy/price options enabled and item images OFF, matching the reported situation.

- 1180×820 tablet: 3-track candidate has 4 wrapped product names and 2 wrapped category headings; 2 tracks removes all six. Both grouped and flow choose two.
- 1440×900 PC: product names fit in either candidate; 3 tracks still wraps 2 category headings, while 2 tracks removes both. Both layouts choose two in this enabled-cover scenario.
- 820×1180 portrait: physical widths already limit the board to two; there is no fourth-track rescue or mobile sizing change.

With the native cover OFF and wider actual menu region, isolated harmless heading wrapping may keep three. Decisions depend on actual rendered content, not the Van Gogh name or price-option count alone. Evidence: `/private/tmp/menu-wrap-audit/report.json`.

## Verification

- **695 unit tests**, separate TypeScript, changed-file ESLint and optimized production build pass.
- `qa-menu-state-actions.mjs`: **57 combinations**, existing 9 skins plus 10 neutral list/album designs × actual 1440×900 PC, 1180×820 tablet, 390×844 mobile. Checks neutral sold-out text despite skin/role overrides, every add icon inside the real price/purchase area, representative Order fill, default-hidden widgets and no horizontal overflow.
- `qa-native-basic-scroll.mjs`: **78 combinations**, narrow/normal/wide mobile widths, portrait/landscape tablets, 4 locales, shared mobile 20/24/48 rhythm, registered order, measured product-name coverage, no fourth column, fixed rails/actions, reachable final content/notices, fade and actual simulated cart/call/advertisement interactions. Dining standalone rules remain intact.
- `qa-default-design-options.mjs`: **20 checks**, default widget OFF and explicit full-widget ON, category/copy/image/chip/price/sale/sold-out independence, real option selection and device/URL persistence.
- `qa-menu-advertisement-carousel.mjs`: **5 cases** across Basic/Dining PC/mobile and reduced motion. Uses real elapsed time to verify progress, automatic advancement, timer reset, arrow wrap, drag wrap, hover pause, keyboard navigation and close.
- All final optimized-runtime reports contain zero browser errors and no attempted API writes. Dev-only streaming/HMR hydration messages seen during concurrent compilation did not recur in the optimized runtime; no unrelated rendering code was changed to suppress them.

Evidence: `/private/tmp/menu-state-actions-final`, `menu-state-native-final`, `menu-state-options-final`, `menu-advertisement-carousel-final`.

## Follow-up scope retained

After this review, prepare the remaining sequence for menu-editor settings, basic/designer template selection and replacement/entitlements, and order/call/table operations. Include separate background and secondary-background colors (proposed names), measured panel padding/gutters from the colored edge and recalculated menu width/column selection. Existing first/center representative-panel policy and Dining cover/body/navigation color needs remain in the editor plan. No schema, customer-data, payment, authorization or storage changes are part of this release.
