# Default design and switch rollout — 2026-10-19

## Approved baseline and first review boundary

Start from Production merge `a6d174c` (PR #252), including spacing restoration #251 and stable fill reading #252. `docs/basic-menu-scroll-policy.md` is authoritative for REAL MATCHA. Do not restore the earlier gap enlargement, vertical centering or pagination. Mobile remains the independent 20/24/48 reading contract.

The user approved the first-column Basic and full-page Dining neutral designs. The next approved review adds the three remaining Basic structures; Dining sidebar follows after the current Dining price/image refinements. First review: first-column Basic and full-page Dining. `/design-review` links to isolated, noindex, simulated previews using the existing renderers and neutral sample data. These are not purchasable presets and do not change saved customer menus. Other six existing Basic skins remain on their original renderers until structure-specific rollout and regression evidence exists.

## Approved product policy

- One menu board per subscription. Basic and Dining remain separate services.
- Standard access allows the service's neutral designs across all its layouts; design access adds every designer preset in that service. It does not unlock operational features or unlimited menu boards.
- Basic has four layouts; Dining has two. `lib/menu-design-policy.ts` separates service, layout, appearance and access. Its pure access predicate is not yet an ownership/payment/publication gate.
- `lib/menu-plan-pricing.ts` separates editable amounts from the policy: Basic regular/early-bird 5900/4900 KRW; Dining 8900/6900; designer add-on 1900 monthly, VAT inclusive. New offers can change pricebook versions; historical receipts and accepted subscription amounts are not recalculated from current prices.
- The current billing and template-switch restrictions remain unchanged during visual review. Upgrade/downgrade timing, proration, cancellation, existing-subscriber migration and entitlement validation must be implemented and verified before enabling paid design switching.

## Work queue

1. Baseline and isolated policy/pricebook foundation; empty-cart popup without the cart header.
2. Review neutral Basic first-column and Dining full-page, including images, options, cover, call/cart simulation and all device modes.
3. Apply approved neutral appearance to the other four structures. Roll existing Basic skins out structure-by-structure: first column, top row, center column, upper-left panel. Reuse their fonts, colors, decorations, image slots and mobile behavior, not a repainted Matcha rail. Center and upper-left scroll regions require dedicated geometry checks. Dining retains multi-page navigation; Display is deferred.
4. Design switching: preview, server-side service/access/ownership validation, atomic saved selection, retained unsupported data and reversible design snapshots. Preserve content, QR/slug, table and order IDs; never copy starter items over customer data.
5. Editor integration and existing operations pages: layout/visibility/widgets/notices, orders/calls/tables/QR. Preserve QA-only postpay runtime until separately verified for ordinary menus; prepay remains disabled preparation UI on mobile only.
6. Create/gallery/detail/preview/checkout/FAQ alignment; subscription transition implementation and migration plan.
7. Actual viewport/orientation/locale, dense/sparse/long copy/custom fonts/widgets/notices and switch round-trip tests; QA-only postpay acceptance/processing. Staged release with original-skin snapshots, rollback boundary and live preview verification.

## First-review implementation

Neutral appearance is preview-only and driven by standard typography settings. Basic reuses the exact approved contained-scroll renderer; Dining reuses the full-page engine and its supported course/individual-item modes. Sample images explicitly show replaceable image areas. Empty carts omit the entire header (back arrow, title, table and item count); populated carts retain the full-page header, table label and back action.

The neutral Basic appearance enables item images and keeps each price rail to the right of the item name, with its add action beside/below the price. This supersedes the first draft's price-below-copy layout. The review opens in grouped mode. COFFEE demonstrates two category prices, ADE three, and the other categories keep ordinary prices. Optional secondary names, descriptions, price options/notes, time sales and one sold-out sample can be toggled independently without changing saved customer data. Original designer typography and mobile reading tokens remain independent.

## Verification

- 661 unit tests; TypeScript without incremental writes; changed-file ESLint and diff checks; optimized Production build. The new 12-device/state and 6-navigation checks also pass against the optimized server.
- `qa-default-designs.mjs`: both designs at actual 1440×900, 1180×820, 820×1180, 320×800, 390×844 and 430×932. Empty cart has no header; desktop/tablet empty state stays compact, populated cart covers the viewport and retains Table 1/back navigation. No horizontal viewport overflow, page errors or API writes.
- `qa-default-design-navigation.mjs`: 6 checks covering device/iframe/detached-link identity retention, Dining individual images and Glass/Bottle prices, original Matcha's empty popup and mismatched design 404.
- Existing `qa-real-matcha-fill.mjs`: 28 conditions preserve approved geometry, stable fill sizes, grouped mode, widgets/notices, fade and safety padding. Existing `qa-menu-interaction-theme.mjs`: 12 conditions across Matcha/Mocha/both Dining templates preserve CTA/modal typography, borders, theme and cart flow. Its navigation now waits for idle network before reading the asynchronously measured palette.
- Preview evidence is stored under `/private/tmp/default-design-review`, `/private/tmp/default-design-navigation`, `/private/tmp/real-matcha-fill` and `/private/tmp/menu-interaction-theme`. No customer orders, payments, database records or subscriptions are changed by these checks.


## Neutral Basic structure expansion — 2026-10-20

The explicit preview design ID selects a review-only shell through `DefaultDesignScope`. Existing customer/template keys do not infer a new shell. The original first-column scroll renderer and all four neutral mobile previews retain their approved shared rendering. `/design-review` now lists four Basic structures and the approved full-page Dining design.

- Top row: description/language, fitted brand title, and notices occupy three fixed header cells. The representative image sits beneath the header; the menu scrolls beside it. Turning off the image releases that lower region to the menu.
- Center column: a fixed center representative rail separates two readable menu tracks. One scroll surface keeps both sides synchronized, with the fixed call/order actions outside the center rail.
- Upper left: a fixed representative panel occupies only the top of the first track. Its measured height plus the shared category/column clearance participates in packing. The first menu continues below it and the other columns start at the top. Scrolled content passes behind the opaque panel; all products remain reachable. This is not a full-height brand rail.
- Grouped mode preserves category units; fill continues items without duplicated category headings. Existing reading type, 2/3-track name-width selection, semantic category/widget/notice gaps, fade, action clearance and mobile behavior remain shared. The center structure uses one menu track per side. No automatic fourth track is introduced.
- Neutral Basic BAKERY has no item images, regardless of the preview image toggle. Neutral product names are Korean and all secondary names English. Customer content and designer starter records are unchanged.
- Dining option prices use one option per right-aligned row on all devices. Mobile keeps this price block below the name and retains a dotted leader. Other prices and standalone pairing spacing are unchanged. Dining thumbnails open the shared image lightbox without a magnifier glyph, with Escape/close and trigger focus restoration.

The six other existing Basic designer skins, remaining Dining neutral sidebar, entitlement switching, editor and operational rollout remain separate work.
